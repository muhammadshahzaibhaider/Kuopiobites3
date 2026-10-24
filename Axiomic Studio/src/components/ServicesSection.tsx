import { SERVICES } from "@/lib/data/services";
import { SectionHeading } from "./SectionHeading";
import { ServiceCard } from "./ServiceCard";

export default function ServicesSection() {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="relative py-section lg:py-section-lg"
    >
      <div className="content-shell">
        <SectionHeading
          id="services-title"
          lead="Our"
          strong="Services"
          description="We offer comprehensive digital solutions that transform your business and drive innovation across every touchpoint."
        />

        <div className="mt-12 flex flex-col gap-4 sm:mt-16">
          {SERVICES.map((service, index) => (
            <ServiceCard key={service.slug} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
