import { useId, useState } from "react";

/** An on/off setting: a native checkbox with the switch role, label first. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="setting">
      <label htmlFor={id} className="setting__text">
        <span className="setting__label">{label}</span>
        {hint ? (
          <span className="setting__hint" id={`${id}-hint`}>
            {hint}
          </span>
        ) : null}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch-input"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

/** A small set of choices as native radios. */
export function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset className="choice">
      <legend className="setting__label">{legend}</legend>
      {hint ? <p className="setting__hint">{hint}</p> : null}
      <div className="choice__options">
        {options.map((o) => (
          <label key={o.value} className="choice__option">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A short list of names, like voices to love or to skip. */
export function NameList({
  label,
  hint,
  names,
  onChange,
}: {
  label: string;
  hint?: string;
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = () => {
    const name = draft.trim();
    if (!name || names.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    onChange([...names, name].slice(0, 50));
    setDraft("");
  };
  return (
    <div className="names">
      <label htmlFor={id} className="setting__label">
        {label}
      </label>
      {hint ? <p className="setting__hint">{hint}</p> : null}
      {names.length ? (
        <ul className="chips" aria-label={label}>
          {names.map((n) => (
            <li key={n} className="chip">
              <span>{n}</span>
              <button type="button" className="chip__remove" aria-label={`Remove ${n}`} onClick={() => onChange(names.filter((x) => x !== n))}>
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M7 7l10 10M17 7 7 17" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row">
        <input
          id={id}
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="A name"
          maxLength={120}
          autoComplete="off"
        />
        <button type="button" className="button button--soft" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
