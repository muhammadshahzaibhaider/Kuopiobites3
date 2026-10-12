"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TrackView from "@/components/TrackView";

function TrackQueryInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  if (!id)
    return (
      <div className="container-x pt-32 text-center">
        <h1 className="font-display text-3xl font-black text-cherry">Order not found</h1>
        <p className="mt-2 text-cherry/70">No order id was provided.</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-8 font-black text-cream">Back to menu</Link>
      </div>
    );
  return <TrackView id={id} />;
}

export default function TrackQueryPage() {
  return (
    <Suspense fallback={<main className="container-x pt-32 text-center text-cherry/70">Loading…</main>}>
      <TrackQueryInner />
    </Suspense>
  );
}
