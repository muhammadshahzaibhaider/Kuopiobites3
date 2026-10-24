import { SITE } from "@/lib/content";

/**
 * Placeholder brand lockup: an atom mark (swap for your own artwork) plus the
 * 「Axiomic Studio」wordmark. Mark scales with the `className` fontSize.
 */
export function Logo({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="15" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1" />
        <ellipse
          cx="16"
          cy="16"
          rx="14"
          ry="5.8"
          stroke="currentColor"
          strokeOpacity="0.65"
          strokeWidth="1.1"
          transform="rotate(-30 16 16)"
        />
        <circle cx="16" cy="16" r="3.1" fill="currentColor" />
        <circle cx="26.4" cy="9" r="1.15" fill="currentColor" fillOpacity="0.85" />
      </svg>
      {showWordmark ? (
        <span className="text-ui font-semibold uppercase tracking-brand text-fg">
          {SITE.brand}
        </span>
      ) : null}
    </span>
  );
}
