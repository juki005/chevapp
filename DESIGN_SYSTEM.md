# ChevApp Design System

> The canonical reference. When code and this doc disagree, **this doc wins** and the code is the bug.

Two modes: **Ugljen** (dark, charcoal) and **Somun** (light, warm cream). Both are first-class — everything must work equally in both.

Inspired by 7shifts. One token → one job. If you need a new color, a new radius, or a new shadow, **the answer is usually no** — reuse what's here.

---

## 1 · Color tokens

### Brand (locked hex)

| Hex | Token | Job |
|---|---|---|
| `#D35400` | `vatra` (burnt-orange-500) | Primary CTA · icons · active nav · Finder · the thing users MUST do |
| `#FF6B00` | `vatra-hover` (brand-orange) | Hover, glows, hero accents |
| `#A04000` | `vatra-pressed` (burnt-orange-600) | Pressed state, deep accents |
| `#0D0D0D` | `ugljen-bg` | Dark mode app background |
| `#1A1A1A` | `ugljen-surface` | Dark mode card surface |
| `#2A2A2A` | `ugljen-border` | Dark mode borders, dividers |
| `#F9F7F2` | `somun-bg` | Light mode app background |
| `#FFFFFF` | `somun-surface` | Light mode card surface |
| `#D6D0C7` | `somun-border` | Light mode borders (warm taupe) |
| `#F5F5DC` | `cream` | Hero text on dark ONLY |

### Semantic accents (same hex across both modes — meaning is universal)

| Hex | Token | **Only** use for |
|---|---|---|
| `#D35400` | Vatra Orange | Primary CTA · main buttons · active nav · primary actions |
| `#D97706` | Amber XP | Gamification: XP gains, streak counter, tier badges, points earned. **Never on buttons.** |
| `#16A34A` | Ember Green | Success: review submitted, route saved, XP earned animation, completed |
| `#E63946` | Žar Red | Alert / error / destructive: validation errors, sign out, delete, failed |
| `#987FE8` | Somun Purple | Passive status badges only: "Objavljeno", "Novo", "Trending". **Never interactive.** |

### CSS variable access

Exposed as RGB channels in `app/globals.css`:

```css
rgb(var(--primary))             /* vatra */
rgb(var(--primary-hover))       /* vatra-hover */
rgb(var(--primary-pressed))     /* vatra-pressed */
rgb(var(--background))          /* mode-aware */
rgb(var(--surface))
rgb(var(--border))
rgb(var(--foreground))
rgb(var(--muted))
rgb(var(--cream))               /* hero on dark */

rgb(var(--amber-xp))
rgb(var(--ember-green))
rgb(var(--zar-red))
rgb(var(--somun-purple))
```

With alpha: `rgb(var(--primary) / 0.15)`.

### Tailwind access

```tsx
// Semantic (mode-aware)
className="bg-background text-foreground border-border"
className="bg-surface text-muted"
className="bg-primary text-primary-fg"
className="hover:bg-vatra-hover active:bg-vatra-pressed"

// Accents (never vary by mode)
className="text-amber-xp"
className="bg-ember-green/10 text-ember-green"
className="border-zar-red"
className="bg-somun-purple/10 text-somun-purple"
```

---

## 2 · Typography

**Two families. Never more. Never cross-use.**

| Family | Use for | Never for |
|---|---|---|
| **Oswald** 600/700 | `<h1>`, `<h2>`, `<h3>`, card titles, display text | Body, labels, captions |
| **Inter** 400/500/600 | Body, labels, captions, form text | Headings |

### Scale (jumps must be dramatic)

| Token | Size | Font · weight · tracking · line-height | Usage |
|---|---|---|---|
| `text-hero` | 80px | Oswald 700 · -1.25% tracking · 0.95 | Hero H1. Minimum 72px, never less. |
| `text-section` | 48px | Oswald 600 · +2% tracking · 1.05 · UPPER | Section titles |
| `text-card-title` | 32px | Oswald 600 · +0.5% tracking · 1.1 | Card titles. Minimum 28px, never 22px. |
| `text-subsec` | 18px | Inter 600 · 1.4 | Subsections |
| `text-body` | 15px | Inter 400 · 1.7 | Body copy |
| `text-label` | 11px | Inter 600 · +13.6% tracking · UPPER | Labels, badges, small caps |

Letter-spacing rule: `-1px` at 80px, `0.5–1px` at smaller sizes.

---

## 3 · Surfaces

### Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-card` | **20px** | Cards, panels, modals. **Never less than 16px on card-like surfaces.** |
| `rounded-chip` | 12px | Chips, small buttons, icon containers |
| `rounded-pill` | 9999px | Badges, toggles |

### Shadow — two levels only. Never mix.

| Token | Usage |
|---|---|
| `shadow-soft-md` | Cards, chips, inline surfaces |
| `shadow-soft-xl` | Modals, popovers, drawers |
| `shadow-brand` | Only on `.btn-primary` glow state |

In Ugljen (dark), shadows disappear — don't substitute them with lighter shadows. Use borders instead.

---

## 4 · Icons

| Rule | Value |
|---|---|
| **Color** | Always `vatra` (#D35400) on both dark and light. Never white, never gray. |
| **Stroke** | Rounded linecap + linejoin. Weight: 1.5px @ 48px+ · 2px @ 24–48px · 2.5px @ 16–24px. |
| **Size** | 16px inline · 20px nav · 24px buttons · 32px cards · 48px feature · 64–80px hero/empty states |
| **Source** | `lucide-react` (placeholder) until the ChevApp brand icon set arrives. |

### The rule

> **Never use emoji as icons in UI components.**

Emoji are acceptable in *user content* (chat messages, user reviews) but not in the app chrome (buttons, nav, cards, badges).

During the migration phase (Sprint 20–26), existing emoji icons stay in place as placeholders. Each one gets a `// TODO(icons): swap for brand <Name>` comment so they're grep-able when the SVG set lands in Sprint 27.

### Containers (brand icon set)

| Variant | Usage |
|---|---|
| **Monoline** | Bare icon, no container. Dark hero sections. |
| **Pill** | Icon inside a tinted rounded-square (20% vatra bg). Cards, feature sections. |
| **Editorial** | Icon inside a bordered rounded-square (outline only). Navigation, settings. |

---

## 5 · Buttons · Action hierarchy

**One color per action type. Never two orange buttons competing at the same level.**

| Variant | Style | Usage |
|---|---|---|
| Primary | Flat vatra fill, white text, `rounded-card` | Main commit action: "Istraži Finder", "Objavi Recenziju". **Flat. No gradient.** |
| Secondary (ghost) | Transparent fill, 1.5px vatra border | Cancel, Back, "Vidi sve" |
| FAB | Elevated vatra fill, shadow-soft-xl | "Rulet" — always visually distinct from primary. Elevation via shadow, never gradient. |
| XP Reward | Amber-xp fill, lightning icon | "+150 XP ⚡", "+200 XP zarađeno" |
| Destructive | Žar-red fill or border | "Odjava", "Obriši" |

### The XP rule

> **Always show XP gain on commit buttons.** Format: `Objavi +150 XP ⚡`.

Makes the reward feel immediate. Users learn the economy.

### The 7shifts "Inactive Contrast Principle"

> **Inactive = white/foreground text + border only. Never a muted fill.**

- Active tab → vatra fill + vatra text + vatra border
- Inactive tab → transparent fill + foreground text + border only

Applies to: tab bars, toggles, calendar days, rating scales, status toggles.

---

## 6 · Status badges (semantic chips — each color = one meaning)

| Variant | Color | Meaning |
|---|---|---|
| `featured` | Vatra orange | Highlighted restaurant |
| `xp` | Amber + ⚡ | Gamification reward (+200 XP) |
| `published` | Ember green + ✓ | Objavljeno — review published |
| `closed` | Žar red | Zatvoreno — restaurant closed |
| `new` | Somun purple | Novo — new listing |
| `pending` | Vatra outline (border only) | Čeka pregled — pending moderation |

---

## 7 · Modes (Ugljen ↔ Somun)

Both modes are **first-class**. Every component must be designed for both. Don't ship dark-mode-first components that look broken in light, or vice versa.

### Rules

- `bg-background`, `text-foreground`, `bg-surface`, `border-border`, `text-muted` — these **adapt automatically** via CSS variables.
- Vatra (`text-primary`, `bg-primary`) is **identical in both modes** — #D35400 always.
- Semantic accents (amber-xp, ember-green, zar-red, somun-purple) are **identical in both modes**.
- Shadows visible in Somun → hidden in Ugljen. Use borders in Ugljen to convey separation.

### Theme switching

Handled by `<ThemeProvider>` (components/layout/ThemeProvider) + inline script in `app/[locale]/layout.tsx` that sets `.dark` on `<html>` before first paint to prevent FOUC.

---

## 8 · The "Never" list

Cheat sheet of things that are always wrong. If you catch one in review, it's a bug.

- ❌ Emoji as UI chrome icons (buttons, nav, cards, badges). User content is fine.
- ❌ Two primary-orange buttons visible at the same level.
- ❌ Oswald for body text. Inter for headings.
- ❌ Card title below 28px. Hero below 72px.
- ❌ Card radius below 16px.
- ❌ Raw hex colors in component files (`#FF6B00`, `#4285f4`, etc.). Use tokens.
- ❌ Inventing a new orange, a new green, a new radius. Reuse what's here.
- ❌ Shadows in dark mode. Use borders.
- ❌ Amber-xp on a button. XP color is gamification-only.
- ❌ Somun-purple on an interactive element. Purple = passive status only.
- ❌ Muted-fill "inactive" states. Inactive = white/foreground + border.
- ❌ Gradients on primary buttons. Flat fills only.
- ❌ `text-white` or `text-gray-400` on icons. Icons are always vatra (#D35400).

---

## 9 · Migration status

Token layer landed: **Sprint 20**. Component migration rolls out across Sprints 21–26:

| Sprint | Status | Focus |
|---|---|---|
| 20 | ✅ done | Foundation tokens + rules doc (this file) |
| 21 | pending | Typography primitives (`<HeroTitle>`, `<SectionTitle>`, etc.) |
| 22 | pending | `<Button>` primitive (5 variants) |
| 23 | pending | `<Badge>` primitive + status chips |
| 24 | pending | `<Toggle>` + `<TabBar>` (7shifts contrast rule) |
| 25 | pending | Finder cards migration (`RestaurantCard`, `PlaceResultCard`) |
| 26 | pending | ReviewModal, feature cards, XP profile card |
| 27 | deferred | Brand icon set swap (blocked on SVG source) |

Hardcoded hex values (17 files as of Sprint 20) get swept in Sprint 25–26 when we touch the components. Don't hand-edit them individually — the sweep is cheaper.
