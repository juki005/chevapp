# CLAUDE.md

Guidance for future Claude Code sessions working on this repo. Read this first, then `DESIGN_SYSTEM.md` before touching UI.

---

## Project

**ChevApp** — a ćevapi discovery + community app for the Balkans. Users find grills (Finder), leave reviews, earn XP, and climb through tiers (Početnik → Gurman → Majstor Roštilja → Doktor za Somun).

Inspired by 7shifts discipline: **one token → one job, one color → one meaning**. The visual language is "Ugljen & Somun" — charcoal dark mode, warm cream light mode, vatra orange (#D35400) as the only primary.

## Stack

- **Next.js 14 App Router** with `[locale]` segment (hr/en/de/sr/bs/sl)
- **next-intl** for i18n · messages in `messages/*.json`
- **Tailwind CSS** with CSS variables for mode switching — config in `tailwind.config.ts`
- **Supabase** — auth, Postgres, RLS policies, storage buckets. Migrations in `supabase/migrations/`.
- **TypeScript strict mode**
- **lucide-react** for icons (placeholder until Sprint 27 brand icon set lands)

## Design system — short version

Full rules live in `DESIGN_SYSTEM.md`. **Read it before any UI change.** The highlights:

### Tokens always. Hardcoded hex never.

```tsx
// ✅
className="bg-primary text-primary-fg border-border"
className="bg-ember-green/10 text-ember-green"
style={{ color: "rgb(var(--vatra))" }}

// ❌
style={{ color: "#D35400" }}
className="bg-[#FF6B00]"
```

### The fixed 5 semantic colors

| Token | Meaning | Never use for |
|---|---|---|
| `vatra` (#D35400) | Primary CTA | Anything else |
| `amber-xp` (#D97706) | Gamification (XP, streaks, tiers) | Buttons |
| `ember-green` (#16A34A) | Success / confirmed | Neutral UI |
| `zar-red` (#E63946) | Alert / destructive | Regular text |
| `somun-purple` (#987FE8) | Passive status badges | Interactive elements |

### Typography

- **Oswald** → headings + card titles ONLY (600/700 weight)
- **Inter** → body, labels, captions ONLY (400/500/600 weight)
- Card titles: minimum **28px**. Hero: minimum **72px**.

### Never list (copy from DESIGN_SYSTEM.md §8)

- ❌ Emoji as UI icons in chrome (buttons, nav, cards, badges)
- ❌ Two primary-orange buttons at the same visual level
- ❌ Oswald for body / Inter for headings
- ❌ Raw hex in component files — use tokens
- ❌ Gradients on primary buttons — flat fills only
- ❌ Amber-xp on buttons (XP color is gamification-only)
- ❌ Somun-purple on interactive elements (passive only)
- ❌ Muted-fill inactive states (inactive = white + border, the "7shifts rule")

---

## Workflow

### Sprint-based commits

Every substantial change is a **sprint** with a numbered commit. Pattern established in commit history:

```
feat(scope): Sprint N — one-line summary

Paragraph explaining what, why, and any notable trade-offs.
Keep the imperative voice: "add X", "fix Y", "refactor Z".

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Use HEREDOC for multi-line messages so formatting survives Windows shells:

```bash
git commit -m "$(cat <<'EOF'
feat(ui): Sprint 22 — Button primitive

... body ...

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Before every commit

1. **Typecheck**: `npx tsc --noEmit` — must pass clean.
2. **Stage specific files** (`git add path/to/file`), **never** `git add -A` — avoids sweeping in `.env`, `supabase/.temp/*`, or local settings.
3. **Commit + push** in parallel tool calls when independent.

### CHECKPOINT.md

Rolling "safe to reset here" marker. Updated at major sprint boundaries (see `CHECKPOINT.md` for the current home base). If a sprint breaks something, `git reset --hard <checkpoint-hash>` recovers to a known-good state.

### Git safety

- Never `--amend` a commit that's been pushed — create a new commit.
- Never force-push to `main`.
- Never `--no-verify` / `--no-gpg-sign` without explicit user ask.

---

## Common commands

```bash
# Typecheck
npx tsc --noEmit

# Dev server
npm run dev

# Build
npm run build

# DB migrations (copy into Supabase SQL editor — not auto-run)
ls supabase/migrations/
```

---

## Important file locations

| Path | What |
|---|---|
| `DESIGN_SYSTEM.md` | Canonical design rules (read before any UI change) |
| `CHECKPOINT.md` | Rollback home base + sprint history |
| `tailwind.config.ts` | Design tokens (colors, fonts, radii, shadows, type scale) |
| `app/globals.css` | CSS variables for Ugljen/Somun mode switching |
| `app/[locale]/layout.tsx` | Root layout — font loading, theme provider, nav shell |
| `lib/supabase/client.ts` · `server.ts` | Supabase client factories (browser / server) |
| `lib/i18n/routing.ts` | Locale registry |
| `components/ui/` | Shared primitives (Button, Badge, etc. — populated Sprints 22–24) |
| `components/finder/` | Finder feature (cards, map, filters) |
| `components/admin/` | Admin dashboard (stats, users, moderation, CMS) |
| `lib/actions/` | Server actions (reviews, places, moderation) |
| `supabase/migrations/` | SQL migrations, numbered sequentially |

---

## Current sprint plan

Tracked in `DESIGN_SYSTEM.md` §9. In short:

- **20 ✅** — Foundation tokens + rules doc (this doc + `DESIGN_SYSTEM.md`)
- **21** — Typography primitives
- **22** — `<Button>` primitive (5 variants)
- **23** — `<Badge>` primitive + semantic status chips
- **24** — `<Toggle>` + `<TabBar>` (inactive-contrast rule)
- **25** — Finder cards migration (`RestaurantCard`, `PlaceResultCard`)
- **26** — ReviewModal, feature cards, XP profile card
- **27** *(deferred)* — Brand icon set swap (blocked on SVG source)

When resuming mid-flight, check `git log --oneline -5` for the last sprint number and continue from there.

---

## Icons — interim policy

The ChevApp brand icon set (12 custom SVGs: Roštilj, Somun, Vatra, Ćevapi, Finder, Jukebox, Akademija, XP/Tier, Rulet, Ocjena, Zajednica, Gastro Ruta) is **not yet in the repo** — source files don't exist in a grabbable format yet.

**Until Sprint 27:**

- Use `lucide-react` with the color rule enforced: `className="text-primary"` (= vatra #D35400).
- Wrap any emoji currently used as a UI icon with a `// TODO(icons): swap for brand <Name>` comment so we can grep them all when the SVGs arrive.
- Don't hand-draw custom SVGs from design mockups — we'll do a clean swap once the real assets land.

---

## When in doubt

1. Check `DESIGN_SYSTEM.md` for the rule.
2. Check existing components for a matching pattern.
3. Ask the user before inventing a new token, color, or radius.
4. Prefer reusing over creating. "The answer is usually no" to new design primitives.
