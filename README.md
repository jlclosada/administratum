# Administratum

> Premium wargaming miniature collection manager — Web application with user accounts and cloud sync.

![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Getting started

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://app.supabase.com).
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates every table, Row Level Security policy, and the `media` storage bucket.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 2. Configure environment variables

Create a `.env.local` file in the project root (see [`.env.example`](.env.example)):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open the app, create an account (email + password) and sign in. Each user only sees their own data, enforced by Supabase Row Level Security.

### 4. Deploy to Vercel

1. Push the repository to GitHub and import it in [Vercel](https://vercel.com).
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (already configured via [`vercel.json`](vercel.json)).
3. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings.
4. Deploy.

---

## Overview

Administratum is a premium web application for managing wargaming miniature collections. It supports multiple game systems, army management, detailed paint-status tracking with a checkbox-based workflow, painting process logs, image galleries, and rich analytics. Data is stored per-user in Supabase (PostgreSQL + Storage) and synced across devices.

## Features

- **User accounts**: Email/password authentication with per-user data isolation (Supabase Auth + RLS)
- **Cloud sync**: Your collection is available from any device
- **Multi-Game System**: Warhammer 40k, Age of Sigmar, Middle-earth SBG, and custom games
- **Army Management**: Create armies/factions per game with custom colors
- **Miniature Tracking**: Track units, characters, vehicles, monsters, squads with quantity management
- **Paint Status Checkboxes**: 7 toggleable states (Sin montar → Barnizada) — click to check/uncheck
- **Miniature Detail Page**: Full view with status toggles, painting process steps, colors used, image gallery, and summary
- **Painting Process Log**: Record step-by-step painting recipes with colors used
- **Dashboard Analytics**: Pie charts, progress bars, army completion percentages, recent activity
- **Image Gallery**: Upload and browse miniature photography (Supabase Storage)
- **Dark UI**: Steam + Discord + Notion inspired interface with smooth animations
- **Error Recovery**: Full error boundary — crashes show a recovery screen, not a black page

## Architecture

```
administratum/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # AppLayout, Sidebar
│   │   ├── shared/             # Reusable: StatCard, ErrorBoundary, etc.
│   │   └── ui/                 # shadcn/ui components (Button, Card, Dialog...)
│   ├── data/                   # Static paint catalog (Citadel + Vallejo)
│   ├── db/                     # Data access layer (Supabase queries)
│   │   └── repository.ts       # CRUD operations (games, armies, miniatures)
│   ├── lib/                    # supabase client, storage helpers, cn utility
│   ├── stores/                 # Zustand stores (app + auth)
│   ├── pages/                  # Page components
│   │   ├── AuthPage.tsx        # Login / sign up
│   │   ├── DashboardPage.tsx   # Main analytics dashboard
│   │   ├── GamesPage.tsx       # Game system listing
│   │   ├── GameDetailPage.tsx  # Armies within a game
│   │   ├── ArmyDetailPage.tsx  # Miniatures within an army
│   │   ├── MiniatureDetailPage.tsx # Miniature detail + painting process
│   │   ├── GalleryPage.tsx     # Image gallery
│   │   └── SettingsPage.tsx    # App settings
│   ├── stores/                 # Zustand state management
│   ├── styles/                 # Global CSS + Tailwind theme
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx                 # Router configuration
│   └── main.tsx                # Entry point
├── src-tauri/                  # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs             # Desktop entry point
│   │   └── lib.rs              # Plugin registration
│   ├── capabilities/           # Security permissions
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Node.js dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS theme
└── tsconfig.json               # TypeScript configuration
```

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Desktop Runtime | Tauri v2                          |
| Frontend        | React 19 + TypeScript             |
| Styling         | TailwindCSS + shadcn/ui           |
| State           | Zustand                           |
| Routing         | React Router v7                   |
| Database        | SQLite via @tauri-apps/plugin-sql |
| Animations      | Framer Motion                     |
| Charts          | Recharts                          |
| Icons           | Lucide React                      |
| Build           | Vite 6                            |

## Database Schema

```
games              → id, name, description, cover_image, icon, sort_order, is_custom
armies             → id, game_id (FK), name, description, cover_image, color_primary, color_secondary
miniatures         → id, army_id (FK), name, category, quantity, notes, is_favorite
miniature_statuses → miniature_id (FK), status_type — composite PK (boolean per-status)
painting_processes → id, miniature_id (FK), step_order, title, description, colors_used
miniature_images   → id, miniature_id (FK), file_path, file_name, file_size, width, height
tags               → id, name, color
miniature_tags     → miniature_id (FK), tag_id (FK)
app_settings       → key, value
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** ≥ 1.88
- **System dependencies** for Tauri: [see Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install dependencies
npm install

# Run in development mode (opens Tauri window with hot-reload)
npm run tauri dev

# Build for production
npm run tauri build
```

### Building Installers

```bash
# Build Windows installer (.exe / .msi)
npm run tauri build -- --target x86_64-pc-windows-msvc

# Build macOS installer (.dmg)
npm run tauri build -- --target aarch64-apple-darwin

# Build for current platform
npm run tauri build
```

Output installers will be in `src-tauri/target/release/bundle/`.

## User Flow

```
Dashboard → View stats & recent activity
     ↓
Games → Select game system (40k, AoS, ...)
     ↓
Game Detail → View/create armies
     ↓
Army Detail → Add miniatures with checkbox statuses → Click to open detail
     ↓
Miniature Detail → Toggle statuses, log painting process, manage images
     ↓
Gallery → Browse all uploaded images
```

## Paint Status System

| Status     | Color  | Description                     |
| ---------- | ------ | ------------------------------- |
| Sin montar | Gray   | Unassembled, still on sprue     |
| Montada    | Purple | Assembly complete               |
| Imprimada  | Blue   | Primer applied                  |
| En proceso | Yellow | Painting in progress            |
| Pintada    | Green  | Painting complete               |
| Basada     | Pink   | Base decorated                  |
| Barnizada  | Violet | Varnish applied, fully complete |

## Roadmap

### v1.0 — Core (Current)

- [x] Multi-game system management
- [x] Army/faction creation per game
- [x] Miniature tracking with quantities
- [x] 7-stage paint status system
- [x] Dashboard with analytics
- [x] Image gallery
- [x] Dark theme UI
- [x] SQLite offline storage
- [x] Windows + macOS installers

### v1.1 — Enhanced UX

- [ ] Drag & drop image upload
- [ ] Image optimization + thumbnails
- [ ] Advanced filtering & search
- [ ] Tag management
- [ ] PDF export of collection
- [ ] Wishlist system

### v1.2 — Cloud Ready

- [ ] User authentication
- [ ] Cloud sync (optional)
- [ ] Share collections
- [ ] Community features

### v2.0 — Platform

- [ ] Marketplace integration
- [ ] Mobile companion app
- [ ] Community sharing
- [ ] Advanced statistics & insights

## License

@joseluiscaceres
joseluiscaceres.dev
