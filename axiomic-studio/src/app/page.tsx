import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import CaseStudyList from "@/components/CaseStudyList";
import TrustedBy from "@/components/TrustedBy";
import CtaSection from "@/components/CtaSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <CaseStudyList />
      <TrustedBy />
      <CtaSection />
    </>
  );
}
