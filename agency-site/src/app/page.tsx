import Navbar from "@/components/Navbar";
import ScrollProgress from "@/components/ScrollProgress";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import CaseStudyList from "@/components/CaseStudyList";
import TrustedBy from "@/components/TrustedBy";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main">
        <Hero />
        <ServicesSection />
        <CaseStudyList />
        <TrustedBy />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
