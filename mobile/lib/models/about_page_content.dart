/// About page static content — mirrors webapp `ABOUT_PAGE_SEED`.
class AboutPageContent {
  const AboutPageContent({
    required this.hero,
    required this.mobileApp,
    required this.pillars,
    required this.journey,
    required this.techStack,
    required this.teamSection,
    required this.statsSection,
    required this.team,
    required this.cta,
    required this.footerNote,
    required this.legacyV1Url,
  });

  final AboutHero hero;
  final AboutMobileApp mobileApp;
  final List<AboutPillar> pillars;
  final List<AboutJourneyItem> journey;
  final List<AboutTechItem> techStack;
  final AboutTeamSection teamSection;
  final AboutStatsSection statsSection;
  final List<AboutTeamMember> team;
  final AboutCta cta;
  final String footerNote;
  final String legacyV1Url;
}

class AboutHero {
  const AboutHero({
    required this.badge,
    required this.title,
    required this.titleHighlight,
    required this.description,
  });

  final String badge;
  final String title;
  final String titleHighlight;
  final String description;
}

class AboutMobileApp {
  const AboutMobileApp({
    required this.name,
    required this.subtitle,
    required this.playStoreUrl,
    required this.qrLabel,
  });

  final String name;
  final String subtitle;
  final String playStoreUrl;
  final String qrLabel;
}

class AboutPillar {
  const AboutPillar({
    required this.title,
    required this.description,
    required this.icon,
    required this.variant,
  });

  final String title;
  final String description;
  final AboutPillarIcon icon;
  final AboutPillarVariant variant;
}

enum AboutPillarIcon { layers, globe, zap }

enum AboutPillarVariant { dark, card, primary }

class AboutJourneyItem {
  const AboutJourneyItem({required this.year, required this.event});

  final String year;
  final String event;
}

class AboutTechItem {
  const AboutTechItem({required this.name, required this.icon});

  final String name;
  final String icon;
}

class AboutTeamSection {
  const AboutTeamSection({
    required this.badge,
    required this.title,
    required this.subtitle,
  });

  final String badge;
  final String title;
  final String subtitle;
}

class AboutStatsSection {
  const AboutStatsSection({required this.badge});

  final String badge;
}

class AboutTeamMember {
  const AboutTeamMember({
    required this.name,
    required this.role,
    required this.imageUrl,
    this.githubUrl,
    this.linkedinUrl,
    this.resumeUrl,
    this.featured = false,
    this.shadowCard = false,
  });

  final String name;
  final String role;
  final String imageUrl;
  final String? githubUrl;
  final String? linkedinUrl;
  final String? resumeUrl;
  final bool featured;
  final bool shadowCard;
}

class AboutCta {
  const AboutCta({
    required this.title,
    required this.description,
    required this.buttonLabel,
  });

  final String title;
  final String description;
  final String buttonLabel;
}
