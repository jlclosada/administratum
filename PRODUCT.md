# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tabletop wargaming hobbyists (Warhammer 40,000 to start) who collect and paint physical miniatures and build army lists to play with them. Open to the whole hobby community as a registered product, not a private tool for the owner alone.

## Product Purpose

A single home for a wargamer's whole hobby workflow: track what miniatures you own and their painting progress, build legal army lists against always-current points, browse the official points/detachment catalog, and read community painting guides — instead of splitting that across a spreadsheet, a separate list-builder app, and a forum.

## Positioning

All-in-one, not single-purpose. Generic army-list builders (New Recruit, BattleScribe) only build lists; spreadsheets only track what you own. Administratum's mechanism a neighboring tool can't truthfully copy: collection + painting-progress tracking, legal list-building, a points/detachment catalog kept current by an automated daily sync against Warhammer Community's own Munitorum Field Manual and official downloads, and community guides — all in one coherent product.

## Operating Context

- Sign up / sign in (Supabase Auth), then manage games → armies → miniatures.
- Record painting-status progression per miniature (unassembled → assembled → primed → … → varnished/complete).
- Build army lists that reference the points catalog.
- Browse the points catalog per faction: unit pricing, detachments, faction art — sourced from `mfm.warhammer-community.com`, synced daily via a scheduled scraper (`scripts/mfm/`).
- Browse/download official Warhammer Community PDFs (rules, faction packs, event companions), also synced daily (`scripts/downloads/`).
- Read and (for authors) write community painting guides and articles.
- Personal dashboard: collection/painting stats, army completion progress.
- Also ships as a Tauri v2 desktop app (macOS/Windows) alongside the Vercel-hosted web app.

## Capabilities and Constraints

- Solo-built and solo-maintained (one developer, no dedicated design or support staff) — favors durable, low-maintenance solutions (e.g. automated sync crons) over anything that needs manual upkeep.
- Backend: Supabase (Postgres + Storage + Auth), RLS-enforced — a user's own collection data (games/armies/miniatures/lists) is private to them; painting guides are public by default when published.
- Owner is based in Spain (individual, not a registered business) — GDPR/LOPDGDD applies; real legal pages (aviso legal, privacidad, cookies, términos) already exist and are grounded in the actual schema, not boilerplate.
- Not affiliated with or endorsed by Games Workshop. Points/detachment/download data is sourced from GW's own public Warhammer Community pages for reference use — no GW-copyrighted artwork or trademarks should be fabricated or implied as official in any new imagery.
- Pre-launch: no confirmed live user base yet. Real synced catalog/downloads data has been verified live against the source sites; real user-generated content (guides, articles, collections) is not yet confirmed populated. Do not fabricate testimonials, user counts, or community activity.

## Brand Commitments

No fixed brand system beyond the serious, elegant, minimalist tone already adopted in the current re-theme (grayscale/graphite base, moved away from an earlier pink/blue palette). No requirement to evoke Warhammer/40k aesthetics explicitly, nor to avoid it — open design direction within the serious/minimalist baseline.

## Evidence on Hand

- Real MFM points + detachment + faction-art data, verified live against `mfm.warhammer-community.com` (e.g. Space Marines: 103 units / 23 detachments).
- Real official downloads catalog, verified live against `warhammer-community.com/en-gb/downloads/warhammer-40000/` (39 entries at last check: core rules, faction packs, event companions).
- No confirmed real articles/guides/user collections yet — treat as empty/example state, not a populated community, until told otherwise.

## Product Principles

1. One coherent product beats stitching together a spreadsheet, a list builder, and a forum — every feature should reduce how many other tools a wargamer needs.
2. Reference data (points, detachments, official PDFs) must always reflect GW's current official source — freshness through automation, not manual curation.
3. A user's own collection is private by default; guides and other community content are public by design.
4. Serious, elegant, minimalist — a professional tool for a hobby, not a themed fan site.
5. Small-team reality: prefer durable, low-maintenance design and engineering choices, since there's no dedicated support or design staff behind this.

## Accessibility & Inclusion

No product-specific requirement established yet.
