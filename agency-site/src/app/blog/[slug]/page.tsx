import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, getPost, getRelatedPosts } from "@/lib/data/posts";
import { SITE } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { PostCard } from "@/components/PostCard";
import { Prose } from "@/components/Prose";
import { Logo } from "@/components/Logo";
import { ArrowUpRight } from "@/components/icons";

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.dateISO,
      images: [{ url: post.image }],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug);

  return (
    <>
      <article>
        {/* Header */}
        <header className="content-shell pt-32 pb-10 sm:pt-40">
          <Reveal>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xxs text-muted-dim">
              <Link href="/blog" className="transition-colors hover:text-fg">
                Blog
              </Link>
              <span aria-hidden>/</span>
              <span className="text-muted">{post.category}</span>
            </nav>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-section font-medium text-fg">{post.title}</h1>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <Logo showWordmark={false} className="text-fg" />
                {post.author}
              </span>
              <span aria-hidden>·</span>
              <time dateTime={post.dateISO}>{post.date}</time>
              <span aria-hidden>·</span>
              <span>{post.readTime}</span>
            </div>
          </Reveal>
        </header>

        <div className="content-shell">
          <Reveal>
            <div className="relative aspect-[16/9] overflow-hidden rounded-preview border border-hairline bg-ink-soft">
              <Image
                src={post.image}
                alt=""
                fill
                priority
                sizes="(min-width: 1280px) 1216px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>

        {/* Body */}
        <div className="content-shell py-section">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
            <Reveal>
              <Prose post={post} />
            </Reveal>

            <aside className="lg:sticky lg:top-28 lg:h-fit">
              <div className="rounded-card border border-hairline bg-white/[0.015] p-6">
                <p className="text-micro uppercase text-muted-dim">Written by</p>
                <p className="mt-3 text-sm font-medium text-fg">{post.author}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Design-led AI studio. We write about the parts of building software that survive
                  contact with production.
                </p>
                <a
                  href={`mailto:${SITE.email}`}
                  className="group mt-5 inline-flex items-center gap-1.5 text-xs text-white/80 transition-colors hover:text-fg"
                >
                  {SITE.email}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-hairline px-3 py-1.5 text-xxs text-muted">
                  {post.category}
                </span>
                <span className="rounded-full border border-hairline px-3 py-1.5 text-xxs text-muted">
                  {post.readTime}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Related */}
      <section aria-labelledby="related-title" className="content-shell pb-section">
        <div className="border-t border-hairline pt-10">
          <div className="flex items-end justify-between gap-6">
            <h2 id="related-title" className="text-2xl font-medium tracking-tight text-fg">
              Related articles
            </h2>
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-fg"
            >
              All articles
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <PostCard post={item} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageCta
        title={
          <>
            Want this thinking on <span className="text-white/40">your project?</span>
          </>
        }
        body="We apply the same discipline to client work every week."
      >
        <PillButton href="/contact">Start Your Project</PillButton>
        <PillButton href="/blog" tone="outline">
          Read more
        </PillButton>
      </PageCta>
    </>
  );
}
