import { cx } from "@/lib/format";
import { SOCIAL_LINKS, type SocialLinkId } from "@/lib/menu";

function SocialIcon({ id }: { id: SocialLinkId }) {
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
        <path d="M12 2.2c2.7 0 3 0 4.1.1 2.7.1 4.4 1.8 4.5 4.5.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.8 4.4-4.5 4.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4.4-1.8-4.5-4.5-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1C3.5 4.3 5.2 2.6 7.9 2.5c1.1-.1 1.4-.2 4.1-.2Zm0 4.6a5.2 5.2 0 1 0 5.2 5.2A5.2 5.2 0 0 0 12 6.8Zm0 8.6a3.4 3.4 0 1 1 3.4-3.4 3.4 3.4 0 0 1-3.4 3.4Zm5.4-8.8a1.2 1.2 0 1 1-1.2 1.2 1.2 0 0 1 1.2-1.2Z" />
      </svg>
    );
  }

  if (id === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7Z" />
      </svg>
    );
  }

  if (id === "wolt") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
        <path d="M3.5 6.5h3.2l2.1 7.1 2.6-7.1h1.9l2.6 7.1 2.1-7.1h2.5l-3.4 11h-2.2l-2.6-7.1-2.5 7.1H7.6l-4.1-11Z" />
      </svg>
    );
  }

  if (id === "whatsapp") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0 11.9 11.9 0 0 0 1.8 17.8L.2 23.8l6.2-1.6A11.9 11.9 0 0 0 24 12a11.8 11.8 0 0 0-3.5-8.5Zm-8.4 17.2a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.8 9.8 0 1 1 8.3 4.6Zm5.4-7.3c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.3-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.4.8-1.4.1-.2.1-.4 0-.6l-.8-1.9c-.2-.5-.4-.4-.7-.4h-.5c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.7c.2.2 2.3 3.6 5.7 5 .8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4Z" /></svg>;
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="Arial, sans-serif" fill="currentColor">UE</text>
    </svg>
  );
}

export default function SocialLinks({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const linkClass = tone === "light"
    ? "border-cherry/20 text-gold-deep hover:bg-cherry hover:text-cream"
    : "border-cream/30 hover:bg-cream hover:text-cherry";
  return (
    <div className={cx("flex flex-wrap gap-3", className)}>
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.ariaLabel}
          title={link.ariaLabel}
          className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full border transition", linkClass)}
        >
          <SocialIcon id={link.id} />
        </a>
      ))}
    </div>
  );
}
