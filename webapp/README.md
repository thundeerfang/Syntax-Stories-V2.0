# Syntax Stories – Webapp (Next.js)

Production-ready Next.js frontend for the tech blogging platform (Medium-like).  
Uses **Tailwind CSS**, **black/white/gray** color scheme, **dark mode**, and a **Retro UI** style (sharp corners, box shadows).

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Retro-inspired UI** (border, shadow, no radius)

## Folder structure

```
webapp/
├── src/
│   ├── app/                 # App Router: layout, pages, globals
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Landing
│   │   ├── globals.css
│   │   └── providers.tsx
│   ├── components/
│   │   ├── layout/         # Navbar, Footer
│   │   └── ui/             # Reusable: Button, etc.
│   ├── context/            # AuthContext, ThemeContext
│   ├── api/                # API client, auth
│   ├── lib/                # utils (cn, etc.)
│   ├── hooks/              # useAuth, etc.
│   └── types/              # Shared TS types
├── public/
├── .env.example
├── next.config.ts
├── tailwind (via postcss)
└── package.json
```

## Setup

1. **Install**

   ```bash
   cd webapp
   npm install
   ```

2. **Env**

   Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_API_BASE_URL` (optional, for API)
   - `NEXT_PUBLIC_APP_NAME`

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Navbar**: Logo, nav links (Home, Blog, About), dark mode toggle, Log in / Get started or Dashboard / Log out
- **Footer**: Product, Company, Developers links; copyright; Terms/Privacy
- **Landing**: Hero, “How it works” cards, CTA
- **Dark mode**: Toggle in nav; preference stored in `localStorage`; class on `<html>`
- **Auth context**: `useAuth()` for user, login, logout (wire to your API later)
- **Theme context**: `useTheme()` for dark/light and toggle
- **Reusable UI**: `Button` in `@/components/ui`; extend under `components/ui` and `components/layout`

## Theme (Tailwind + globals.css)

- **Light**: `--background: #fff`, `--foreground: #0a0a0a`, `--muted`, `--border`
- **Dark** (`.dark`): dark background/foreground, same structure
- **Retro**: `rounded-none`, `border-2 border-border`, `shadow-sm`; active states with slight translate

## Production

- `npm run build` then `npm run start`
- Set env in your host (e.g. Vercel) for `NEXT_PUBLIC_*` as needed.
