import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          challengeurl?: string;
          credentials?: 'omit' | 'same-origin' | 'include';
          overlay?: boolean;
          floating?: 'auto' | 'top' | 'bottom';
          floatinganchor?: string;
          floatingoffset?: number | string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
