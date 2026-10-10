import type { PublicSectionWithItems } from "./types";
import CardsSection from "./CardsSection";
import ComparedSection from "./ComparedSection";
import CtaSection from "./CtaSection";
import HeroSection from "./HeroSection";
import ListSection from "./ListSection";

export default function SectionContent({ section }: { section: PublicSectionWithItems }) {
  const content = (section.content ?? {}) as Record<string, unknown>;
  const isCompared =
    section.type === "compared" ||
    content.layout === "compared" ||
    content.variant === "compared";

  if (section.type === "hero") return <HeroSection section={section} />;
  if (section.type === "cta") return <CtaSection section={section} />;
  if (section.type === "list") return <ListSection section={section} />;
  if (isCompared) return <ComparedSection section={section} />;
  return <CardsSection section={section} />;
}
