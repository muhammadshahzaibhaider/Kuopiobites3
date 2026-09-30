"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy route — the reservation flow now lives inside the Dining hub. */
export default function ReservationsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dining#reserve");
  }, [router]);
  return <div className="pt-32" />;
}
