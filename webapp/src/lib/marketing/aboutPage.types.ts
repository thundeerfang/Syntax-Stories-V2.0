export interface AboutHero {
  badge: string;
  title: string;
  titleHighlight: string;
  description: string;
}
export interface AboutMobileApp {
  name: string;
  subtitle: string;
  iconSrc: string;
  playStoreUrl: string;
  qrLabel: string;
}
export interface AboutJourneyItem {
  year: string;
  event: string;
}
export interface AboutTechItem {
  name: string;
  icon: string;
}
export interface AboutFeatureItem {
  title: string;
  description: string;
  icon: string;
}
export type AboutPillarVariant = "dark" | "card" | "primary";
export interface AboutPillar {
  title: string;
  description: string;
  icon: "layers" | "globe" | "zap";
  variant: AboutPillarVariant;
}
export interface AboutTeamMember {
  name: string;
  role: string;
  imageSrc: string;
  githubUrl?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  featured?: boolean;
  shadowCard?: boolean;
}
export interface AboutCta {
  title: string;
  description: string;
  buttonLabel: string;
}
export interface AboutTeamSection {
  badge: string;
  title: string;
  subtitle: string;
}
export interface AboutStatsSection {
  badge: string;
}
export interface AboutPageContent {
  hero: AboutHero;
  mobileApp: AboutMobileApp;
  pillars: AboutPillar[];
  journey: AboutJourneyItem[];
  techStack: AboutTechItem[];
  features: AboutFeatureItem[];
  teamSection: AboutTeamSection;
  statsSection: AboutStatsSection;
  team: AboutTeamMember[];
  cta: AboutCta;
  footerNote: string;
}
