'use client';

import { Button } from '@/components/ui';
import { GithubIcon, XIcon } from '@/components/icons/SocialProviderIcons';
import { DEVELOPERS } from '@/lib/assets';
import { useAuthDialogStore } from '@/store/authDialog';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
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

export default function AboutPage() {
  const openAuthDialog = useAuthDialogStore((s) => s.open);

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
    <div className={cn(SHELL_CONTENT_RAIL_CLASS)}>
      <div className="w-full space-y-32">
        <header className="max-w-3xl">
          <div className="mb-6 inline-block border-2 border-border bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_var(--border)]">
            Est. 2023
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground sm:text-7xl">
            Where code meets{' '}
            <span className="text-primary underline decoration-8 underline-offset-8">context.</span>
          </h1>
          <p className="mt-8 border-l-4 border-primary pl-6 text-xl font-medium leading-relaxed text-muted-foreground">
            Syntax Stories is a publishing platform built by developers, for developers. The signal
            you’ve been looking for in a world of noise.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="border-2 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--border)] lg:col-span-7">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-black uppercase italic">
              <Workflow className="text-primary" /> The Journey
            </h2>
            <div className="relative space-y-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-1 before:bg-border">
              {journey.map((item) => (
                <div key={item.year} className="group relative pl-10">
                  <div className="absolute left-0 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-card transition-colors group-hover:bg-primary">
                    <div className="h-2 w-2 rounded-full bg-border" />
                  </div>
                  <h4 className="text-sm font-black uppercase text-primary">{item.year}</h4>
                  <p className="mt-1 font-medium text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-2 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--border)] lg:col-span-5">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-black uppercase italic">
              <Cpu className="text-primary" /> Built With
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex cursor-default items-center gap-3 border-2 border-border bg-muted/20 p-3 transition-transform hover:-translate-y-1 hover:translate-x-1"
                >
                  <tech.icon className="h-5 w-5" />
                  <span className="text-[11px] font-black uppercase">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-12">
          <div className="text-center">
            <h2 className="inline-block bg-primary px-4 py-2 text-4xl font-black uppercase italic text-primary-foreground shadow-[4px_4px_0px_0px_var(--border)]">
              Next-Gen AI Features
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { title: 'Semantic Search', desc: 'Find articles by concept, not just keywords.', icon: BrainCircuit },
              { title: 'Code Context', desc: 'AI that understands your imports and architecture.', icon: Terminal },
              { title: 'Auto-Indexing', desc: 'Smart tags generated instantly upon publish.', icon: Zap },
            ].map((f) => (
              <div
                key={f.title}
                className="border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_var(--border)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                <f.icon className="mb-4 h-8 w-8 text-primary" strokeWidth={2.5} />
                <h3 className="mb-2 text-lg font-black uppercase">{f.title}</h3>
                <p className="text-sm font-medium text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-2 border-border bg-muted/30 p-12 shadow-[12px_12px_0px_0px_var(--border)]">
          <h2 className="mb-12 text-center text-3xl font-black uppercase italic">Membership Plans</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.name} className="flex flex-col border-2 border-border bg-card p-8">
                <h3 className="text-xl font-black uppercase">{plan.name}</h3>
                <div className="my-4 text-4xl font-black">
                  {plan.price}
                  <span className="text-sm">/mo</span>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> {feat}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full border-2 border-border bg-primary py-3 font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  Select {plan.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-12">
          <h2 className="text-center text-3xl font-black uppercase italic">Meet the Architects</h2>
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {DEVELOPERS.map((dev) => (
              <div key={dev.name} className="group">
                <div className="relative mb-4 inline-block overflow-hidden border-4 border-border shadow-[8px_8px_0px_0px_var(--primary)]">
                  <img src={dev.img} alt={dev.name} className="h-48 w-48 object-cover" />
                </div>
                <h3 className="text-xl font-black uppercase italic">{dev.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{dev.role}</p>
                <div className="mt-4 flex justify-center gap-4">
                  <GithubIcon className="h-5 w-5 cursor-pointer hover:text-primary" />
                  <XIcon className="h-5 w-5 cursor-pointer hover:text-primary" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-none border-4 border-border bg-foreground p-12 text-background shadow-[16px_16px_0px_0px_var(--border)] dark:bg-primary">
          <div className="flex flex-col items-center gap-8 text-center">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
              Ready to share <br /> your story?
            </h2>
            <p className="max-w-md text-lg font-bold uppercase opacity-90">
              Join 50,000+ developers shipping insights daily. Your first article is just a few
              keystrokes away.
            </p>
            <div className="w-full max-w-xs scale-110">
              <Button variant="primary" className="w-full" onClick={() => openAuthDialog('signup')}>
                Get started
              </Button>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </footer>
      </div>
    </div>
  );
}
