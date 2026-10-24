import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/data/posts";
import { ArrowUpRight } from "./icons";

export function PostCard({
  post,
  featured = false,
}: {
  post: Post;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={
        featured
          ? "group grid gap-6 rounded-card border border-hairline bg-white/[0.015] p-3 transition-colors duration-300 hover:border-hairline-strong hover:bg-white/[0.04] lg:grid-cols-2 lg:items-stretch"
          : "group flex flex-col gap-4"
      }
    >
      <div
        className={
          featured
            ? "relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink-soft lg:aspect-auto lg:min-h-64"
            : "relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline bg-ink-soft"
        }
      >
        <Image
          src={post.image}
          alt=""
          fill
          sizes={featured ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
          className="object-cover opacity-90 transition-transform duration-500 ease-expo group-hover:scale-[1.04]"
        />
      </div>

      <div className={featured ? "flex flex-col justify-center gap-4 p-3 lg:p-6" : "flex flex-col gap-2"}>
        <div className="flex flex-wrap items-center gap-2 text-xxs text-muted-dim">
          {featured ? (
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/80">
              Featured
            </span>
          ) : null}
          <span className="uppercase tracking-[0.2em]">{post.category}</span>
          <span aria-hidden>·</span>
          <span>{post.date}</span>
        </div>

        <h3
          className={
            featured
              ? "text-2xl font-medium tracking-tight text-fg sm:text-3xl"
              : "text-lg font-medium tracking-tight text-fg"
          }
        >
          {post.title}
        </h3>
        <p className={featured ? "text-sm leading-relaxed text-muted" : "text-sm leading-relaxed text-muted line-clamp-2"}>
          {post.excerpt}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xxs text-muted-dim">
          <span>{post.readTime}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
        </div>
      </div>
    </Link>
  );
}
