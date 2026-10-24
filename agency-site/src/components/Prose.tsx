import type { Post, PostBlock } from "@/lib/data/posts";

function Block({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="mt-12 mb-4 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          {block.text}
        </h2>
      );
    case "subheading":
      return (
        <h3 className="mt-9 mb-3 text-xl font-medium tracking-tight text-fg">{block.text}</h3>
      );
    case "list":
      return (
        <ul className="my-6 flex flex-col gap-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-muted">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="my-9 border-l-2 border-glow/60 pl-6 text-lg leading-relaxed text-white/85 italic">
          {block.text}
        </blockquote>
      );
    default:
      return <p className="my-5 text-base leading-relaxed text-muted">{block.text}</p>;
  }
}

/** Renders an article body from typed blocks — no markdown dependency. */
export function Prose({ post }: { post: Post }) {
  return (
    <div className="max-w-2xl">
      {post.body.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
