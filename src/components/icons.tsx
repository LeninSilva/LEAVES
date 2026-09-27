import type { SVGProps } from "react";

/** Simple rounded line icons, 2px stroke. Always shown with a text label. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const LeafIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
    <path d="M5 19c3-4 6-7 10-10" />
  </Icon>
);

export const TreeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21v-7" />
    <path d="M12 14c-4.5 0-7-2.5-7-5.5S7.5 3 12 3s7 2.5 7 5.5-2.5 5.5-7 5.5Z" />
    <path d="M12 14l-3-3M12 12l2.5-2.5" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21c-3.5-4-6-7.2-6-10.5a6 6 0 0 1 12 0c0 3.3-2.5 6.5-6 10.5Z" />
    <circle cx="12" cy="10.5" r="2" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Icon>
);

export const PhotoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M5 17.5l4.5-4 3 2.5 3-3 3.5 3.5" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4" />
    <path d="M8 7.5 12 4l4 3.5" />
    <path d="M7 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-2.5-2.5H17" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="18" cy="12" r="1.2" fill="currentColor" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 7l10 10M17 7 7 17" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m16 16 3.5 3.5" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 7h9M18 7h1M5 12h2M11 12h8M5 17h7M16 17h3" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="14" cy="17" r="2" />
  </Icon>
);

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 6.5 9 12l5.5 5.5" />
  </Icon>
);

export const PageIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
    <path d="M14 3.5V7a1 1 0 0 0 1 1h3" />
  </Icon>
);

export const QuoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 10.5C9 13 7.5 15 5 15.5M9 10.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 10.5ZM18.5 10.5c0 2.5-1.5 4.5-4 5M18.5 10.5A2.5 2.5 0 1 1 16 8a2.5 2.5 0 0 1 2.5 2.5Z" />
  </Icon>
);
