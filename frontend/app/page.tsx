import { Header } from "@/components/header";
import { HeroIntro } from "@/components/hero-intro";
import { CampusContent } from "@/components/campus-content";
import { LandingReveal } from "@/components/landing-reveal";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <LandingReveal />
        <HeroIntro />
        <CampusContent />
      </main>
    </>
  );
}
