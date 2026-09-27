-- Leaves: cloud backup, sharing and reminders.
-- Every table uses row-level security so each person sees only their own rows.
-- Enable "Anonymous sign-ins" in Supabase Auth so people can write before signing in.

-- ---------------------------------------------------------------------------
-- Entries: one row per entry, holding its JSON. updated_at is the writer's
-- clock (last write wins); synced_at is the server's clock (pull cursor).
create table if not exists public.entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default clock_timestamp()
);
create index if not exists entries_user_synced on public.entries (user_id, synced_at);

create or replace function public.touch_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before insert or update on public.entries
  for each row execute function public.touch_synced_at();

alter table public.entries enable row level security;
drop policy if exists "entries are private" on public.entries;
create policy "entries are private" on public.entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null
);
alter table public.settings enable row level security;
drop policy if exists "settings are private" on public.settings;
create policy "settings are private" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Sharing. A share is a snapshot made when the person chooses to share, so a
-- link never exposes more than they saw. Deleting the row revokes it.
create table if not exists public.shares (
  token text primary key check (length(token) >= 20),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_id uuid not null,
  kind text not null check (kind in ('link', 'published')),
  snapshot jsonb not null,
  published_at timestamptz not null default now()
);
create unique index if not exists shares_one_per_kind on public.shares (user_id, entry_id, kind);
alter table public.shares enable row level security;
drop policy if exists "shares are private" on public.shares;
create policy "shares are private" on public.shares
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  title text
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are private" on public.profiles;
create policy "profiles are private" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Anyone with the link can read one shared entry, and nothing else.
create or replace function public.get_shared_entry(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select snapshot from public.shares where token = p_token and kind = 'link';
$$;

-- A person's public page: only entries they marked Published.
create or replace function public.get_public_page(p_handle text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', p.title,
    'handle', p.handle,
    'entries', coalesce((
      select jsonb_agg(s.snapshot || jsonb_build_object('token', s.token) order by s.snapshot->>'finishedAt' desc)
      from public.shares s where s.user_id = p.user_id and s.kind = 'published'
    ), '[]'::jsonb)
  )
  from public.profiles p where p.handle = lower(p_handle);
$$;

revoke all on function public.get_shared_entry(text) from public;
revoke all on function public.get_public_page(text) from public;
grant execute on function public.get_shared_entry(text) to anon, authenticated;
grant execute on function public.get_public_page(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Daily reminder. The server (service role) reads this once a minute.
create table if not exists public.reminders (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  subscription jsonb not null,
  reminder_time text not null check (reminder_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  time_zone text not null,
  last_sent_date text
);
alter table public.reminders enable row level security;
drop policy if exists "reminders are private" on public.reminders;
create policy "reminders are private" on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage. "leaves" is private: each person's files sit in a folder named by
-- their user id. "shared" holds images for shared and published entries and
-- is publicly readable by exact path (the path includes the unguessable token).
insert into storage.buckets (id, name, public) values ('leaves', 'leaves', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('shared', 'shared', true)
  on conflict (id) do nothing;

drop policy if exists "own files" on storage.objects;
create policy "own files" on storage.objects
  for all to authenticated
  using (bucket_id in ('leaves', 'shared') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('leaves', 'shared') and (storage.foldername(name))[1] = auth.uid()::text);
