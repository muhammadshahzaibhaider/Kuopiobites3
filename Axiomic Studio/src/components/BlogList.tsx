"use client";

import { useState } from "react";
import { BLOG_CATEGORIES, POSTS } from "@/lib/data/posts";
import { cn } from "@/lib/cn";
import { PostCard } from "./PostCard";

export default function BlogList() {
  const [category, setCategory] = useState("All");

  const filtered = POSTS.filter((post) => category === "All" || post.category === category);
  const featured = filtered.find((post) => post.featured) ?? filtered[0];
  const rest = filtered.filter((post) => post !== featured);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter articles by category">
        {BLOG_CATEGORIES.map((option) => {
          const pressed = category === option;
          const count =
            option === "All" ? POSTS.length : POSTS.filter((post) => post.category === option).length;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              onClick={() => setCategory(option)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors duration-200",
                pressed
                  ? "border-white bg-white text-ink"
                  : "border-hairline text-muted hover:border-hairline-strong hover:text-fg",
              )}
            >
              {option}
              <span className={cn("tabular-nums", pressed ? "text-ink/50" : "text-muted-dim")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-dim" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {category !== "All" ? ` in ${category}` : ""}
      </p>

      {featured ? (
        <div className="mt-8">
          <PostCard post={featured} featured />
        </div>
      ) : (
        <p className="mt-10 rounded-card border border-hairline p-8 text-sm text-muted">
          Nothing published in this category yet.
        </p>
      )}

      {rest.length > 0 ? (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
