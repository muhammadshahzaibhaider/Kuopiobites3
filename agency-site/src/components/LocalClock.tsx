"use client";

import { useEffect, useState } from "react";

/** Live HH:MM:SS clock in the studio's local timezone. */
export default function LocalClock({ timeZone }: { timeZone: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timeZone]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-micro uppercase text-muted-dim">Local time</span>
      <span className="font-mono text-sm tabular-nums text-fg" aria-hidden>
        {time ?? "--:--:--"}
      </span>
      <span className="sr-only">Local studio time, updating every second.</span>
    </div>
  );
}
