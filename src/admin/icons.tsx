"use client";
import type { ReactNode } from "react";

/** Minimal stroke icon set (line style, matches reference structure). */
const PATHS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  orders: <><path d="M6 7h12M6 12h12M6 17h7" /><rect x="3" y="3" width="18" height="18" rx="3" /></>,
  dining: <><path d="M7 3v8M11 3v8M9 3v18M9 11c2 0 2-2 2-2" /><path d="M17 3c-2 2-2 6 0 8v10" /></>,
  menu: <><path d="M4 5h16M4 12h16M4 19h10" /></>,
  marketing: <><path d="M3 11l14-5v12L3 13v-2z" /><path d="M7 13v5a2 2 0 004 0v-3" /></>,
  customers: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.5c2.8.3 5 2.4 5 5.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" /></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 4-4 5 5" /></>,
  analytics: <><path d="M4 20V10M10 20V4M16 20v-8M21 20H3" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  bell: <><path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 004 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevD: <path d="M6 9l6 6 6-6" />,
  chevR: <path d="M9 6l6 6-6 6" />,
  dots: <><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></>,
  edit: <><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  filter: <path d="M4 5h16l-6 8v6l-4 2v-8L4 5z" />,
  group: <><rect x="3" y="4" width="8" height="7" rx="1.5" /><rect x="13" y="4" width="8" height="7" rx="1.5" /><rect x="8" y="14" width="8" height="7" rx="1.5" /></>,
  print: <><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  tag: <><path d="M3 12l9-9h9v9l-9 9-9-9z" /><circle cx="16.5" cy="7.5" r="1.5" /></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  collapse: <path d="M11 7l-5 5 5 5M18 7l-5 5 5 5" />,
  expand: <path d="M13 7l5 5-5 5M6 7l5 5-5 5" />,
  csv: <><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" /><path d="M14 3v6h6M8 13h8M8 17h8" /></>,
  users: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  flame: <path d="M12 3s5 4 5 9a5 5 0 01-10 0c0-2 1-4 2-5 0 2 1 3 2 3-1-3 0-6 1-7z" />,
  pizza: <><path d="M12 3l9 16H3L12 3z" /><circle cx="12" cy="12" r="1.4" /><circle cx="9.5" cy="16" r="1.4" /><circle cx="14.5" cy="16" r="1.4" /></>,
  star: <path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.3-.8L12 3z" />,
  refresh: <><path d="M20 12a8 8 0 11-2.3-5.7" /><path d="M20 3v5h-5" /></>,
  check: <path d="M4 12l5 5L20 6" />,
  warn: <><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18.5v.5" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 4-4 5 5" /></>,
  lang: <><path d="M4 5h9M8 3v2c0 4-2 7-4 8M5 10c1 2 3 4 5 5" /><path d="M13 21l4-10 4 10M14.5 17.5h5" /></>,
  round: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></>,
  save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h7V3M8 14h8v7H8z" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v3h16v-3" /></>,
  toggle: <><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="3" /></>,
  grid: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  history: <><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3L3 8" /><path d="M3 4v4h4M12 7v5l3 2" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  store: <><path d="M4 4h16l1 5a3 3 0 01-3 3 3 3 0 01-3-2 3 3 0 01-3 2 3 3 0 01-3-2 3 3 0 01-3 2 3 3 0 01-3-3l1-5z" /><path d="M5 12v8h14v-8M10 20v-5h4v5" /></>,
  megaphone: <><path d="M3 11l14-5v12L3 13v-2z" /><path d="M7 13v5a2 2 0 004 0v-3" /></>,
};

export function Ic({ n, size = 18, className }: { n: string; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[n] ?? PATHS.dots}
    </svg>
  );
}
