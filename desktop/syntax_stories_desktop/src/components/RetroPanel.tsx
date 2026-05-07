import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  variant?: 'green' | 'amber';
};

export function RetroPanel({ title, children, variant = 'green' }: Props) {
  const cls = variant === 'amber' ? 'retro-panel retro-panel--amber' : 'retro-panel';
  return (
    <section className={cls}>
      <h2 className="retro-panel__title">{title}</h2>
      <div className="retro-panel__body">{children}</div>
    </section>
  );
}
