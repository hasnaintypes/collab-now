import { HeroHeader } from "@/features/marketing/components/header";
import HeroSection from "@/features/marketing/components/hero-section";
import FeaturesSection from "@/features/marketing/components/features-section";
import AiNotesSection from "@/features/marketing/components/ai-notes-section";
import ExtensionSection from "@/features/marketing/components/extension-section";
import DeepDiveSection from "@/features/marketing/components/deep-dive-section";
import PricingSection from "@/features/marketing/components/pricing-section";
import FAQSection from "@/features/marketing/components/faq-section";
import FooterSection from "@/features/marketing/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <HeroHeader />
      <main className="overflow-hidden pt-24">
        <HeroSection />
        <FeaturesSection />
        <AiNotesSection />
        <ExtensionSection />
        <DeepDiveSection />
        <PricingSection />
        <FAQSection />
      </main>
      <FooterSection />
    </div>
  );
}
