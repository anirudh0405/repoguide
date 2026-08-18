import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { ArchitectureExample } from "@/components/landing/architecture-example";
import { AiQaSection } from "@/components/landing/ai-qa";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { LandingCta } from "@/components/landing/cta";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <HowItWorks />
        <Features />
        <ArchitectureExample />
        <AiQaSection />
        <Pricing />
        <Faq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}