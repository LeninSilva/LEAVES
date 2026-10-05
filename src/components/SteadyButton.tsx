import { forwardRef, useRef } from "react";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & { onPress: () => void };

/**
 * A button for bars that sit above the on-screen keyboard. On phones, the
 * first touch used to move focus off the page, the keyboard closed, the bar
 * jumped, and the tap landed on the text instead. This keeps focus where it
 * is, holds on to the finger even if the layout shifts, and acts when the
 * finger lifts. Keyboard and screen reader activation still use click.
 */
export const SteadyButton = forwardRef<HTMLButtonElement, Props>(function SteadyButton({ onPress, disabled, ...rest }, ref) {
  const pressed = useRef<number | null>(null);
  const handled = useRef(false);
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      {...rest}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pressed.current = e.pointerId;
        handled.current = false;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (pressed.current !== e.pointerId) return;
        pressed.current = null;
        if (disabled) return;
        handled.current = true;
        // The click that follows is this press's echo. If none comes, don't let the
        // flag swallow a later keyboard press.
        window.setTimeout(() => {
          handled.current = false;
        }, 600);
        onPress();
      }}
      onPointerCancel={() => {
        pressed.current = null;
      }}
      onClick={() => {
        // A pointer press already ran; this click is its echo.
        if (handled.current) {
          handled.current = false;
          return;
        }
        if (!disabled) onPress();
      }}
    />
  );
});
