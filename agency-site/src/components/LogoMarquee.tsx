import { CLIENTS } from "@/lib/content";
import { ClientMark } from "./icons";

/**
 * Seamless logo marquee: the list is rendered twice, so translating the track
 * by -50% loops without a jump. Hover pauses it; reduced-motion users get a
 * static, horizontally scrollable row.
 */
export default function LogoMarquee() {
  const track = [...CLIENTS, ...CLIENTS];

  return (
    <div className="relative overflow-x-hidden mask-fade-x motion-reduce:overflow-x-auto">
      <div className="flex w-max items-center py-2 animate-marquee hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
        {track.map((client, index) => (
          <div
            key={`${client.name}-${index}`}
            aria-hidden={index >= CLIENTS.length}
            className="mx-7 flex shrink-0 items-center gap-2.5 text-white/40 transition-colors duration-300 hover:text-white/85 sm:mx-10"
          >
            <ClientMark variant={client.mark} />
            <span className="whitespace-nowrap text-sm font-medium uppercase tracking-logo">
              {client.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
