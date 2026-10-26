import type { ReactElement } from "react";
import { AudienceSection } from "../components/landing/AudienceSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { FinalCtaSection } from "../components/landing/FinalCtaSection";
import { HeroSection } from "../components/landing/HeroSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { PlannedSection } from "../components/landing/PlannedSection";

// The page only assembles sections. The layout provides the <main>.
export default function LandingPage(): ReactElement {
  return (
    <>
      <HeroSection />
      <AudienceSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PlannedSection />
      <FinalCtaSection />
    </>
  );
}
