"use client";
import Link from "next/link";
import FavoritesSection from "@/components/FavoritesSection";

export default function FavoritesPage() {
  return <main className="container-x max-w-4xl pt-24 sm:pt-32">
    <p className="font-script text-2xl text-gold-deep -rotate-1">saved for later</p>
    <h1 className="text-4xl font-black text-cherry">Favorites</h1>
    <div className="gold-rule mt-4 w-24" />
    <p className="mt-4 text-sm text-cherry/70">Keep your favorite dishes close, then open one to customize and add it to your cart.</p>
    <FavoritesSection />
    <Link href="/menu" className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-cherry-bright px-6 font-black text-cream hover:bg-cherry">Browse menu</Link>
  </main>;
}
