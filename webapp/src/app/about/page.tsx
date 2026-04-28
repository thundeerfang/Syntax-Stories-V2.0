'use client';

import { AboutGetStarted } from './AboutGetStarted';
import { DEVELOPERS } from '@/lib/assets';
import {
  Cpu,
  Layers,
  Zap,
  Terminal,
  Globe,
  CheckCircle2,
  Database,
  Box,
  BrainCircuit,
  Workflow,
} from 'lucide-react';

/** Lucide brand icons are deprecated; inline marks avoid S1874 and match common GitHub / X glyphs. */
function SocialGitHubIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SocialXIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function AboutPage() {
  const techStack = [
    { name: 'Next.js 14', icon: Globe, color: 'bg-black text-white' },
    { name: 'Tailwind CSS', icon: Layers, color: 'bg-cyan-500 text-white' },
    { name: 'Express.js', icon: Terminal, color: 'bg-green-600 text-white' },
    { name: 'MongoDB', icon: Database, color: 'bg-emerald-500 text-white' },
    { name: 'Redis', icon: Zap, color: 'bg-red-500 text-white' },
    { name: 'Docker', icon: Box, color: 'bg-blue-500 text-white' },
  ];

  const journey = [
    { year: '2023', event: 'The first line of code was pushed to a private repo.' },
    { year: '2024', event: 'Reached 10,000 active developers sharing insights.' },
    { year: 'Today', event: 'Leading the way in AI-powered technical publishing.' },
  ];

  const plans = [
    { name: 'Hobby', price: '$0', features: ['Markdown Editor', '5 Articles/mo', 'Community Access'] },
    { name: 'Pro', price: '$12', features: ['AI Co-writer', 'Custom Domains', 'Analytics', 'No Ads'] },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-24 space-y-32">
      {/* Header Section */}
      <header className="max-w-3xl">
        <div className="inline-block px-3 py-1 border-2 border-border bg-primary text-primary-foreground text-xs font-black uppercase mb-6 shadow-[4px_4px_0px_0px_var(--border)]">
          Est. 2023
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl uppercase italic">
          Where code meets <span className="text-primary underline decoration-8 underline-offset-8">context.</span>
        </h1>
        <p className="mt-8 text-xl font-medium leading-relaxed text-muted-foreground border-l-4 border-primary pl-6">
          Syntax Stories is a publishing platform built by developers, for developers. 
          The signal you’ve been looking for in a world of noise.
        </p>
      </header>

      {/* Journey & Tech Stack Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Journey - Timeline */}
        <div className="lg:col-span-7 border-2 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
            <Workflow className="text-primary" /> The Journey
          </h2>
          <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-1 before:bg-border">
            {journey.map((item) => (
              <div key={item.year} className="relative pl-10 group">
                <div className="absolute left-0 top-1 w-7 h-7 bg-card border-2 border-border rounded-full flex items-center justify-center group-hover:bg-primary transition-colors z-10">
                    <div className="w-2 h-2 bg-border rounded-full" />
                </div>
                <h4 className="font-black text-primary text-sm uppercase">{item.year}</h4>
                <p className="text-muted-foreground font-medium mt-1">{item.event}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="lg:col-span-5 border-2 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
            <Cpu className="text-primary" /> Built With
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {techStack.map((tech) => (
              <div key={tech.name} className="flex items-center gap-3 p-3 border-2 border-border bg-muted/20 hover:translate-x-1 hover:-translate-y-1 transition-transform cursor-default">
                <tech.icon className="h-5 w-5" />
                <span className="text-[11px] font-black uppercase">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="space-y-12">
        <div className="text-center">
            <h2 className="text-4xl font-black uppercase italic inline-block bg-primary text-primary-foreground px-4 py-2 shadow-[4px_4px_0px_0px_var(--border)]">
                Next-Gen AI Features
            </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                { title: 'Semantic Search', desc: 'Find articles by concept, not just keywords.', icon: BrainCircuit },
                { title: 'Code Context', desc: 'AI that understands your imports and architecture.', icon: Terminal },
                { title: 'Auto-Indexing', desc: 'Smart tags generated instantly upon publish.', icon: Zap }
            ].map((f) => (
                <div key={f.title} className="p-6 border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                    <f.icon className="h-8 w-8 text-primary mb-4" strokeWidth={2.5} />
                    <h3 className="text-lg font-black uppercase mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{f.desc}</p>
                </div>
            ))}
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="bg-muted/30 border-2 border-border p-12 shadow-[12px_12px_0px_0px_var(--border)]">
        <h2 className="text-3xl font-black uppercase italic mb-12 text-center">Membership Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className="flex flex-col border-2 border-border bg-card p-8">
              <h3 className="text-xl font-black uppercase">{plan.name}</h3>
              <div className="text-4xl font-black my-4">{plan.price}<span className="text-sm">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> {feat}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 border-2 border-border bg-primary text-primary-foreground font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                Select {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="space-y-12">
        <h2 className="text-3xl font-black uppercase italic text-center">Meet the Architects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {DEVELOPERS.map((dev) => (
            <div key={dev.name} className="group">
              <div className="relative inline-block border-4 border-border shadow-[8px_8px_0px_0px_var(--primary)] overflow-hidden mb-4">
                <img src={dev.img} alt={dev.name} className="w-48 h-48 object-cover" />
              </div>
              <h3 className="text-xl font-black uppercase italic">{dev.name}</h3>
              <p className="text-primary font-black text-[10px] uppercase tracking-widest">{dev.role}</p>
              <div className="flex justify-center gap-4 mt-4">
                <SocialGitHubIcon className="h-5 w-5 hover:text-primary cursor-pointer" />
                <SocialXIcon className="h-5 w-5 hover:text-primary cursor-pointer" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-none border-4 border-border bg-foreground p-12 text-background dark:bg-primary shadow-[16px_16px_0px_0px_var(--border)]">
        <div className="flex flex-col items-center gap-8 text-center">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
            Ready to share <br /> your story?
          </h2>
          <p className="max-w-md text-lg font-bold opacity-90 uppercase">
            Join 50,000+ developers shipping insights daily. Your first article is just a few keystrokes away.
          </p>
          <div className="w-full max-w-xs scale-110">
            <AboutGetStarted />
          </div>
        </div>
      </section>

      {/* Footer Text */}
      <footer className="text-center text-muted-foreground font-bold text-xs uppercase tracking-widest pb-12">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      </footer>
    </div>
  );
}