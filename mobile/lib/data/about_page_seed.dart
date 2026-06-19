import '../models/about_page_content.dart';

/// Builds About content with absolute asset URLs — mirrors webapp seed.
AboutPageContent buildAboutPageContent() {
  return AboutPageContent(
    legacyV1Url: 'https://syntax-stories.vercel.app/',
    hero: const AboutHero(
      badge: 'Our story',
      title: 'Syntax Stories is built',
      titleHighlight: 'for builders.',
      description:
          'A collaborative home for developers to publish technical stories, follow topics they care about, join squads, and grow through streaks, achievements, and community feedback.',
    ),
    mobileApp: const AboutMobileApp(
      name: 'Syntax Stories',
      subtitle: 'Mobile app',
      playStoreUrl:
          'https://play.google.com/store/apps/details?id=com.syntaxstories.syntax_stories_app',
      qrLabel: 'Scan to download',
    ),
    pillars: const [
      AboutPillar(
        title: 'Our Infrastructure',
        description:
            'Next.js webapp, Node.js API, MongoDB, Redis, Flutter mobile, realtime streams, and admin RBAC — a full stack designed to publish, moderate, and grow with the community.',
        icon: AboutPillarIcon.layers,
        variant: AboutPillarVariant.dark,
      ),
      AboutPillar(
        title: 'Global Reach',
        description:
            'A home for developers to ship technical stories, follow categories, join squads, and connect with builders — wherever they write, read, or collaborate.',
        icon: AboutPillarIcon.globe,
        variant: AboutPillarVariant.card,
      ),
      AboutPillar(
        title: 'Performance',
        description:
            'Redis-backed caching, realtime achievement unlocks, optimized feeds, and a snappy block editor — built so reading, writing, and discovery stay fast.',
        icon: AboutPillarIcon.zap,
        variant: AboutPillarVariant.primary,
      ),
    ],
    journey: const [
      AboutJourneyItem(
        year: '2024',
        event:
            'Syntax Stories concept — a retro-styled dev publishing platform with squads and gamification.',
      ),
      AboutJourneyItem(
        year: '2025',
        event:
            'Web and mobile clients shipped with rich blog editor, OAuth, bookmarks, and explore lanes.',
      ),
      AboutJourneyItem(
        year: '2026',
        event:
            'Achievements, realtime unlocks, billing, admin RBAC, and storage guard rolled out across the stack.',
      ),
    ],
    techStack: const [
      AboutTechItem(name: 'Next.js', icon: 'Globe'),
      AboutTechItem(name: 'React', icon: 'Layers'),
      AboutTechItem(name: 'TypeScript', icon: 'Terminal'),
      AboutTechItem(name: 'Node.js', icon: 'Cpu'),
      AboutTechItem(name: 'MongoDB', icon: 'Database'),
      AboutTechItem(name: 'Redis', icon: 'Zap'),
      AboutTechItem(name: 'Flutter', icon: 'Box'),
      AboutTechItem(name: 'Tiptap', icon: 'Workflow'),
    ],
    teamSection: const AboutTeamSection(
      badge: 'The team',
      title: 'The architects',
      subtitle: 'Meet the builders',
    ),
    statsSection: const AboutStatsSection(badge: 'Platform stats'),
    team: [
      AboutTeamMember(
        name: 'Somya',
        role: 'Database architect & data structures',
        imageUrl: 'assets/developers/somya.png',
        githubUrl: 'https://github.com/Somya170',
        linkedinUrl: 'https://www.linkedin.com/in/somyajaiswal218',
        resumeUrl:
            'https://www.dropbox.com/scl/fi/05wy19m5lmkwjjdacq97l/somya.pdf?rlkey=loyugxm1s23jvxrxxpl6w9axd&st=4apd62x9&dl=0',
        shadowCard: true,
      ),
      AboutTeamMember(
        name: 'Harshit Kushwah',
        role:
            'Full-stack developer · cross-platform mobile app\nAPI architect · system design',
        imageUrl: 'assets/developers/harshit.png',
        githubUrl: 'https://github.com/thundeerfang',
        linkedinUrl: 'https://www.linkedin.com/in/harshitkushwah02/',
        resumeUrl:
            'https://dl.dropboxusercontent.com/scl/fi/vf6000p3s3p7s6de88u3g/HARSHIT_RESUME_1.0.pdf?rlkey=s27b9ugylnav1ltyyt53rhkpv&st=ci7htn50&dl=0',
        featured: true,
      ),
      AboutTeamMember(
        name: 'Vijay',
        role: 'UI/UX designer',
        imageUrl: 'assets/developers/vijay.png',
        githubUrl: 'https://github.com/vijaychouhan2211',
        linkedinUrl: 'https://www.linkedin.com/in/vijay-chouhan-09b83a287/',
        resumeUrl:
            'https://www.dropbox.com/scl/fi/m8xgnkinr2rjvlgcxz2ar/vijay.pdf?rlkey=x4kdsj0gin4dy10qxwyegbb5c&st=io5zfh7z&dl=0',
        shadowCard: true,
      ),
    ],
    cta: const AboutCta(
      title: 'Ready to\nScale?',
      description:
          'Create an account, draft your first post, and join the Syntax Stories community.',
      buttonLabel: 'Join the Crew',
    ),
    footerNote: 'A collaborative project, crafted with ❤️ by our team.',
  );
}
