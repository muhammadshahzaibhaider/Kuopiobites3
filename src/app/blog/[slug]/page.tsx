import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { blogPosts } from "@/data/blog";
import { ArrowLeft, Clock, ShieldAlert } from "lucide-react";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">{post.category}</span>
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readingTime}</span>
            <span className="text-xs font-mono text-zinc-500">{post.date}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">{post.title}</h1>
          <p className="text-zinc-400 mb-4">{post.excerpt}</p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2 mb-8">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> {post.disclaimer}
          </div>
          <div className="prose prose-invert max-w-none text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.content}</div>
          <div className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm text-zinc-400">Author: <span className="text-white">{post.author}</span></p>
            <p className="text-xs text-zinc-500 mt-2">This post is educational and does not make performance or compliance claims. Validate patterns on your own eval set.</p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
