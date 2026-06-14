import { ABOUT_PAGE_SEED } from "./aboutPage.seed";
import type { AboutPageContent } from "./aboutPage.types";
export type {
  AboutHero,
  AboutJourneyItem,
  AboutTechItem,
  AboutFeatureItem,
  AboutTeamMember,
  AboutCta,
  AboutPageContent,
} from "./aboutPage.types";
export { ABOUT_PAGE_SEED };
export function getAboutPageContent(): AboutPageContent {
  return ABOUT_PAGE_SEED;
}
