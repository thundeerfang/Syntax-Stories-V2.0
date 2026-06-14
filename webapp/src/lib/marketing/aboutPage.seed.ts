import { developerImages } from "@/lib/core/assets";
import type { AboutPageContent } from "./aboutPage.types";
export const ABOUT_PAGE_SEED: AboutPageContent = {
  hero: {
    badge: "Our story",
    title: "Syntax Stories is built",
    titleHighlight: "for builders.",
    description:
      "A collaborative home for developers to publish technical stories, follow topics they care about, join squads, and grow through streaks, achievements, and community feedback.",
  },
  mobileApp: {
    name: "Syntax Stories",
    subtitle: "Mobile app",
    iconSrc: "/favicon/android-chrome-512x512.png",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.syntaxstories.syntax_stories_app",
    qrLabel: "Scan to download",
  },
  pillars: [
    {
      title: "Our Infrastructure",
      description:
        "Next.js webapp, Node.js API, MongoDB, Redis, Flutter mobile, realtime streams, and admin RBAC — a full stack designed to publish, moderate, and grow with the community.",
      icon: "layers",
      variant: "dark",
    },
    {
      title: "Global Reach",
      description:
        "A home for developers to ship technical stories, follow categories, join squads, and connect with builders — wherever they write, read, or collaborate.",
      icon: "globe",
      variant: "card",
    },
    {
      title: "Performance",
      description:
        "Redis-backed caching, realtime achievement unlocks, optimized feeds, and a snappy block editor — built so reading, writing, and discovery stay fast.",
      icon: "zap",
      variant: "primary",
    },
  ],
  journey: [
    {
      year: "2024",
      event:
        "Syntax Stories concept — a retro-styled dev publishing platform with squads and gamification.",
    },
    {
      year: "2025",
      event:
        "Web and mobile clients shipped with rich blog editor, OAuth, bookmarks, and explore lanes.",
    },
    {
      year: "2026",
      event:
        "Achievements, realtime unlocks, billing, admin RBAC, and storage guard rolled out across the stack.",
    },
  ],
  techStack: [
    { name: "Next.js", icon: "Globe" },
    { name: "React", icon: "Layers" },
    { name: "TypeScript", icon: "Terminal" },
    { name: "Node.js", icon: "Cpu" },
    { name: "MongoDB", icon: "Database" },
    { name: "Redis", icon: "Zap" },
    { name: "Flutter", icon: "Box" },
    { name: "Tiptap", icon: "Workflow" },
  ],
  features: [
    {
      title: "Rich publishing",
      description:
        "Block-based editor with code, diagrams, embeds, and deploy-ready taxonomy.",
      icon: "Terminal",
    },
    {
      title: "Squads & feeds",
      description:
        "Follow categories, join squads, and surface trending lanes tuned for developers.",
      icon: "Layers",
    },
    {
      title: "Gamification",
      description:
        "Streaks, achievements, and respect — progress you can see and celebrate.",
      icon: "BrainCircuit",
    },
  ],
  teamSection: {
    badge: "The team",
    title: "The architects",
    subtitle: "Meet the builders",
  },
  statsSection: {
    badge: "Platform stats",
  },
  team: [
    {
      name: "Somya",
      role: "Database architect & data structures",
      imageSrc: developerImages.somya,
      githubUrl: "https://github.com/",
      linkedinUrl: "https://www.linkedin.com/in/",
      resumeUrl: "/developers/resumes/somya.pdf",
      shadowCard: true,
    },
    {
      name: "Harshit Kushwah",
      role: "Full-stack developer · cross-platform mobile app\nAPI architect · system design",
      imageSrc: developerImages.harshit,
      githubUrl: "https://github.com/harshitkushwah5910",
      linkedinUrl: "https://www.linkedin.com/in/harshitkushwah",
      resumeUrl: "/developers/resumes/harshit-kushwah.pdf",
      featured: true,
    },
    {
      name: "Vijay",
      role: "UI/UX designer",
      imageSrc: developerImages.vijay,
      githubUrl: "https://github.com/",
      linkedinUrl: "https://www.linkedin.com/in/",
      resumeUrl: "/developers/resumes/vijay.pdf",
      shadowCard: true,
    },
  ],
  cta: {
    title: "Ready to\nScale?",
    description:
      "Create an account, draft your first post, and join the Syntax Stories community.",
    buttonLabel: "Join the Crew",
  },
  footerNote: "A collaborative project, crafted with ❤️ by our team.",
};
