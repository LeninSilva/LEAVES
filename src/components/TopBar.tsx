import { go, navigate } from "../lib/router";

/** A quiet bar: a way back or across on the left, one optional control on the right. */
export function TopBar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar__side">{left}</div>
      <div className="topbar__side topbar__side--end">{right}</div>
    </header>
  );
}

export function NavLink({ to, icon, children, replace }: { to: string; icon?: React.ReactNode; children: React.ReactNode; replace?: boolean }) {
  return (
    <a
      href={to}
      className="navlink"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (replace) navigate(to, { replace: true, state: { fromApp: true } });
        else go(to);
      }}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}
