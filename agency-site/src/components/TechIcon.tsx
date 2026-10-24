import type { ToolId } from "@/lib/content";

/**
 * Lightweight, monochrome tool glyphs. Drawn as simple geometry so chips stay
 * crisp at 16px and inherit currentColor. Decorative — the chip prints the name.
 */
export function TechIcon({ id, className }: { id: ToolId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {glyph(id)}
    </svg>
  );
}

function glyph(id: ToolId) {
  switch (id) {
    case "react":
      return (
        <>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="9.4" ry="3.7" />
          <ellipse cx="12" cy="12" rx="9.4" ry="3.7" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9.4" ry="3.7" transform="rotate(120 12 12)" />
        </>
      );
    case "next":
      return (
        <>
          <circle cx="12" cy="12" r="9.2" />
          <path d="M8.6 16.4V7.6l7.2 9.2" />
        </>
      );
    case "node":
      return (
        <>
          <path d="M12 2.9 20 7.5v9L12 21.1 4 16.5v-9z" />
          <path d="M9 9.6c1.1-.7 2.4-.5 2.4.7 0 1.5-3 1.3-3 3 0 1.2 1.5 1.6 2.8.8" />
        </>
      );
    case "flutter":
      return (
        <>
          <path d="M13.7 2.5 3.8 12.4l3.4 3.4L20.5 2.5z" />
          <path d="M13.7 12.6 8.3 18l5.4 5.4h6.8l-5.4-5.4 5.4-5.4z" />
        </>
      );
    case "docker":
      return (
        <>
          <path d="M3.2 11.2h15.3c.4 3.6-2.4 7.1-6.7 7.1H8.2c-2.8 0-5-2.2-5-5z" />
          <path d="M7.2 11.2V7.9h3.4v3.3M11.9 11.2V7.9h3.4v3.3M7.2 7.1V4.4M11.9 7.1V4.4" />
        </>
      );
    case "typescript":
      return (
        <>
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="2.6" />
          <path d="M7.4 10.2h4M9.4 10.2v7.2M13.4 17l1.1.6c.9.5 2.2.2 2.2-1 0-1.5-2.9-1.2-2.9-2.7 0-1 1.2-1.5 2.1-1.1l.8.5" />
        </>
      );
    case "figma":
      return (
        <>
          <path d="M12 3h3.2a3.2 3.2 0 0 1 0 6.4H12z" />
          <path d="M12 3H8.8a3.2 3.2 0 0 0 0 6.4H12z" />
          <path d="M12 9.4H8.8a3.2 3.2 0 0 0 0 6.4H12z" />
          <path d="M12 9.4h3.2a3.2 3.2 0 0 1 0 6.4H12z" />
          <path d="M12 15.8H8.8A3.2 3.2 0 1 0 12 19z" />
        </>
      );
    case "framer":
      return <path d="M5.4 2.8h13.2v6H12v3h6.6v6h-6.6v6l-6.6-6v-6h6.6v-3H5.4z" />;
    case "webflow":
      return (
        <>
          <path d="M2.6 6.6h4.2l2.1 7 2.6-7h3.3l2 7 2.2-7h3.2l-4 10.8h-3.6l-1.9-6.3-2.4 6.3H5.8z" />
        </>
      );
    case "openai":
      return (
        <>
          <path d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6z" />
          <path d="M8.3 9.7 12 7.6l3.7 2.1v4.6L12 16.4l-3.7-2.1z" />
        </>
      );
    case "pytorch":
      return (
        <>
          <circle cx="12" cy="13" r="6.6" />
          <path d="M12.6 3.1c2.7 1.4 4.4 4.2 4.4 7.3" />
          <circle cx="13.4" cy="4.2" r=".9" fill="currentColor" stroke="none" />
        </>
      );
    case "langchain":
      return (
        <>
          <rect x="2.8" y="9.6" width="8" height="4.8" rx="2.4" transform="rotate(-35 6.8 12)" />
          <rect x="13.2" y="9.6" width="8" height="4.8" rx="2.4" transform="rotate(-35 17.2 12)" />
          <path d="M9.6 10.4 14.4 13.6" />
        </>
      );
    case "supabase":
      return <path d="M13.4 2.6 4.6 13.8h5.6l-.8 7.6 9-11.4h-5.8z" />;
    case "livekit":
      return (
        <>
          <rect x="3" y="5.2" width="12.4" height="13.6" rx="2.4" />
          <path d="m15.4 11 5.6-3.4v8.8L15.4 13z" />
        </>
      );
    case "pinecone":
      return (
        <>
          <path d="M12 3.2 20 8v8l-8 4.8L4 16V8z" />
          <path d="M12 12v8.8M12 12l8-4M12 12 4 8" />
        </>
      );
    case "twilio":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="9.2" cy="9.2" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="14.8" r="1.5" fill="currentColor" stroke="none" />
        </>
      );
    case "aws":
      return (
        <>
          <path d="M5.4 9.6c1.6-.5 3.2-.6 4.9-.2 1 .2 2 .6 2.9 1.1" />
          <path d="M3.8 15.2c4.6 2.6 10.3 2.7 15 .3" />
          <path d="m16.6 14.4 2.6 1.2-1.2 2.4" />
        </>
      );
    case "fhir":
      return (
        <>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v4h4" />
          <path d="M12 10.4v6M9 13.4h6" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}
