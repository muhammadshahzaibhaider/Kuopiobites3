import Link from "next/link";
import { DEMO_LINKS, FOOTER_RESOURCE_LINKS, SITE } from "@/lib/content";
import { SERVICE_LINKS } from "@/lib/data/services";
import { Logo } from "./Logo";
import LocalClock from "./LocalClock";
import { ArrowUpRight, LinkedIn } from "./icons";

const linkClass =
  "inline-flex w-fit items-center text-sm text-muted transition-colors duration-200 hover:text-fg";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-micro uppercase text-muted-dim">{title}</h2>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-hairline bg-ink/85 backdrop-blur-sm">
      <div className="content-shell grid gap-12 pt-16 pb-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-10">
        <div className="flex flex-col gap-7 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="w-fit text-fg" aria-label={`${SITE.brand} — home`}>
            <Logo />
          </Link>

          <div>
            <p className="text-micro uppercase text-muted-dim">Get in touch</p>
            <a
              href={`mailto:${SITE.email}`}
              className="group mt-2 inline-flex items-center gap-2 text-lg font-medium tracking-tight text-fg transition-colors duration-200 hover:text-white/80"
            >
              {SITE.email}
              <ArrowUpRight className="h-4 w-4 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-muted">
            <a
              href={SITE.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex w-fit items-center gap-2 transition-colors duration-200 hover:text-fg"
            >
              <LinkedIn className="h-4 w-4" />
              LinkedIn
            </a>
            <p>Based in {SITE.city}</p>
            <p>Serving clients globally</p>
          </div>

          <LocalClock timeZone={SITE.timeZone} />
        </div>

        <FooterColumn title="Services" links={SERVICE_LINKS} />
        <FooterColumn title="Resources" links={FOOTER_RESOURCE_LINKS} />
        <FooterColumn title="Demos" links={DEMO_LINKS} />
      </div>

      <div className="content-shell">
        <div className="flex flex-col gap-3 border-t border-hairline py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {SITE.copyrightYear} {SITE.brand}. All rights reserved.
          </p>
          <Link
            href="/#top"
            className="group inline-flex w-fit items-center gap-1.5 transition-colors duration-200 hover:text-fg"
          >
            Back to top
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
