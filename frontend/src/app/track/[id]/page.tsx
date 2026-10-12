"use client";
import { useParams } from "next/navigation";
import TrackView from "@/components/TrackView";

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  return <TrackView id={id} />;
}
