import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/hero";
import { AuthNotice } from "@/components/landing/auth-notice";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { ArchitectureExample } from "@/components/landing/architecture-example";
import { AiQaSection } from "@/components/landing/ai-qa";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { LandingCta } from "@/components/landing/cta";

interface HomeProps {
  searchParams: Promise<{ auth?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { auth } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      {auth && <AuthNotice code={auth} />}
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