import { HeroHeader } from "@/components/layout/header";
import HeroSection from "@/components/home/hero-section";
import SocialProofSection from "@/components/home/social-proof-section";
import FeaturesSection from "@/components/home/features-section";
import DeepDiveSection from "@/components/home/deep-dive-section";
import StatsSection from "@/components/home/stats-section";
import TestimonialsSection from "@/components/home/testimonials-section";
import PricingSection from "@/components/home/pricing-section";
import FAQSection from "@/components/home/faq-section";
import FooterSection from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <HeroHeader />
      <main className="overflow-hidden pt-24">
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <DeepDiveSection />
        <StatsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
      </main>
      <FooterSection />
    </div>
  );
}
