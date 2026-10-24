import type { Metadata } from "next";
import { SITE } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import LocalClock from "@/components/LocalClock";
import { ArrowUpRight, Globe, LinkedIn } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us about your next project. We reply to every serious enquiry within 48 hours.",
};

const NEXT_STEPS = [
  { title: "You send the brief", body: "As much or as little as you have. A link and a paragraph is enough." },
  { title: "We reply within 48 hours", body: "With questions, a rough approach, and an honest fit assessment." },
  { title: "A scoping call", body: "45 minutes with the people who would actually do the work." },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&apos;s <span className="text-white/40">connect.</span>
          </>
        }
        lede="Let's talk about your next big idea. Use the form to tell us more, or simply drop us an email."
        align="left"
      />

      <section aria-labelledby="form-title" className="content-shell pb-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <h2 id="form-title" className="sr-only">
              Project enquiry form
            </h2>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex flex-col gap-8 rounded-card border border-hairline bg-white/[0.015] p-6 sm:p-8">
              <div>
                <p className="text-micro uppercase text-muted-dim">Email</p>
                <a
                  href={`mailto:${SITE.email}`}
                  className="group mt-2 inline-flex items-center gap-2 text-lg font-medium tracking-tight text-fg hover:text-white/80"
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
                  className="inline-flex w-fit items-center gap-2 transition-colors hover:text-fg"
                >
                  <LinkedIn className="h-4 w-4" />
                  LinkedIn
                </a>
                <p className="inline-flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-dim" />
                  Based in {SITE.city}
                </p>
                <p>Serving clients globally</p>
              </div>

              <LocalClock timeZone={SITE.timeZone} />

              <div className="border-t border-hairline pt-6">
                <p className="text-micro uppercase text-muted-dim">What happens next</p>
                <ol className="mt-4 flex flex-col gap-4">
                  {NEXT_STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="font-mono text-xxs text-muted-dim">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block text-sm text-fg">{step.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                          {step.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
