# 🏁 Stable Checkpoint — Sprint 17

> **If a future sprint breaks something, roll back to here.** This is the last commit where the app is known to build, run, and have a clean backend foundation. Use it as your "home base."
>
> The pointer hasn't moved since Sprint 17 because Sprints 18 → 26j are still pending dev-verification by the maintainer. Once the design-system migration is verified in both Ugljen + Somun modes, move the checkpoint to the current HEAD.

---

## 📍 The commit

| | |
|---|---|
| **Hash** | `ad5880e` |
| **Message** | `feat(ugc): place_reviews table, moderation queue, user_photos bucket, image compression` |
| **Date** | Sprint 17 — UGC Architecture & Database Defense |
| **Branch** | `main` (pushed to `origin/main`) |

### Roll back to here

```bash
# See where you are
git log --oneline -5

# HARD reset to the checkpoint (⚠️ discards local changes)
git reset --hard ad5880e

# Or: just branch off it to experiment safely
git checkout -b experiment ad5880e
```

---

## ✅ What works at this checkpoint

### Frontend
- **Finder** — Google Places search with `RankBy.DISTANCE`, city Iron Wall filter, "Search this area" without map yo-yo
- **Finder → Istraži button** — links to `/community?tab=explore&search={city}` (TripAdvisor-green, lives next to Rulet)
- **Kitchen → Videos tab** — YouTube search block on top, "coming soon" card below with `mt-12` spacing
- **Academy** — education-only: Word of the Day + Gastro Dictionary with "Učitaj još" pagination (5 terms at a time)
- **Profile** — custom XP tier dashboard (Početnik → Gurman → Majstor Roštilja → Doktor za Somun) with pip track

### Backend (Sprint 17 additions)
- **`public.place_reviews`** table — keyed by Google Place ID, `UNIQUE(user_id, place_id)`, RLS locked down
- **`public.restaurants`** — has `is_approved` + `submitted_by` columns, moderation RLS
- **`storage.user_photos`** bucket — 512 KB ceiling, jpeg/png/webp, per-user folder RLS
- **`lib/utils/imageCompression.ts`** — `compressImage()` and `makePhotoPath()` helpers ready to import
- **`browser-image-compression@^2.0.2`** — installed in `node_modules`

---

## ❌ What does NOT exist yet (known gaps)

These are _expected_ gaps, not bugs. Sprint 17 was intentionally backend-only.

- No "Ostavi recenziju" button anywhere
- No review submission modal
- No photo upload UI
- No review display on restaurant cards
- No "Submit a new place" form
- No admin moderation queue page

If you go to look for these and can't find them, that's because they haven't been built.

---

## 🗄️ Supabase state

All migrations **through `016_ugc_reviews_and_photos.sql`** must be run in Supabase SQL Editor for this checkpoint to work. Verify with:

```sql
-- Should return rows for migrations 001 → 016 worth of tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should exist
SELECT COUNT(*) FROM public.place_reviews;

-- Should return the user_photos bucket
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'user_photos';

-- Should return is_approved + submitted_by
SELECT column_name FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('is_approved', 'submitted_by');
```

---

## 🚨 If something breaks later

1. **First:** check what sprint broke it (`git log --oneline`)
2. **Try:** revert just the bad commit — `git revert <hash>`
3. **If revert cascades:** hard reset to this checkpoint and cherry-pick the sprints you want to keep:
   ```bash
   git reset --hard ad5880e
   git cherry-pick <good-sprint-hash>
   ```
4. **Nuclear option:** branch from here, rebuild the broken sprint from scratch
   ```bash
   git checkout -b rebuild ad5880e
   ```

---

## 📚 Sprint history up to this checkpoint

| Sprint | Commit | Focus |
|---|---|---|
| 9–12 | `436bd00`–`d...` | Finder: dual-action search, map viewport, card overflow, distance ranking |
| 13.x | `da0e1d0`–`e8cd858` | Istraži button + community deep-link |
| 14 | `ff472f8` | YouTube search promoted above "coming soon" |
| 14/15 | `ed74050` | Profile cleanup + GastroDictionary in Academy |
| 15b | `afbfd7c` | Education-only Academy + custom XP tiers on Profile |
| 16 | `9423396` | GastroDictionary "Učitaj još" pagination + Kitchen spacing |
| **17** | **`ad5880e`** ← **CHECKPOINT** | UGC database foundation |

---

## 📈 Since this checkpoint (not yet dev-verified)

The design-system migration lives beyond the checkpoint. `main` is 16+ sprints ahead. Once verified in both modes, advance the pointer to the HEAD below.

| Sprint | Commit | Focus |
|---|---|---|
| 18 | — | UGC UI: review modal, photo upload, review display |
| 19 | — | ReviewStatsBadge + batch aggregates |
| 20 | — | Foundation tokens + `DESIGN_SYSTEM.md` rules doc |
| 21 | — | Typography primitives (`HeroTitle`, `SectionTitle`) |
| 22 | `e04805f` | `<Button>` primitive — 5 variants |
| 23 | `0bf53ec` | `<Badge>` primitive — 6 semantic variants |
| 24 | `9adea71` | `<Toggle>` + `<TabBar>` (7shifts inactive-contrast rule) |
| 25 | `2ced358` | Finder cards — `RestaurantCard`, `PlaceResultCard`, `ReviewStatsBadge` |
| 26  | `e9b4a93` | `ReviewModal` + swept `VibrantBadge` from `KitchenPageClient` |
| 26b | `6f4ebf5` | `DirectionsButton` + dead-code sweep (`VibrantBadge`, `SubmitReviewModal`) |
| 26c | `3986847` | Homepage `app/[locale]/page.tsx` — hero / features / CTA / footer |
| 26d | `5fcd80b` | Typography primitives cleanup + root error boundary |
| 26e | `b24f98f` | `MobileBottomNav` (Rulet gradient → flat) + PWA manifest |
| 26f | `5e2876d` | `Toast` (info = somun-purple) + `LanguageSwitcher` |
| 26g | `3fb9a7b` | `RestaurantCardSkeleton` + `StyleFilter` |
| 26h | `f8693c9` | `RestaurantGrid` — cream→muted contrast fix |
| 26i | `66e1f7f` | `ReviewList` — stars aligned to `amber-xp` |
| **26j** | **`654284d`** ← **current HEAD** | `FinderFilterBar` — Rulet gradient → flat, TripAdvisor green documented as external-brand exception |

### Still pending DS migration

- **`components/layout/Navbar.tsx`** (318 lines) — desktop nav chrome
- **`components/finder/LocationFilter.tsx`** (349 lines) — country/city picker
- **`app/[locale]/profile/page.tsx`** (1,641 lines) — XP tier block, needs extraction into `components/profile/*` before tokenization
- **Misc leftovers** in admin, academy, community, journal — surfaced in audit grep but not yet touched

### Blocked

- **Sprint 27** — brand icon set (12 custom SVGs: Roštilj, Somun, Vatra, Ćevapi, Finder, Jukebox, Akademija, XP/Tier, Rulet, Ocjena, Zajednica, Gastro Ruta). Emoji placeholders across the app are tagged `// TODO(icons)` ready for a grep-and-replace once SVGs land.

---

## ➡️ Next logical sprint

**Sprint 26k** — pick one of:
- `Navbar.tsx` (desktop nav, 318L) — medium-sized, one focused file
- `LocationFilter.tsx` (349L) — country/city autocomplete, one focused file
- **Profile page extraction** — open a fresh session; read `app/[locale]/profile/page.tsx`, propose a `components/profile/*` split plan, then migrate. Too big for a mid-session push.

Once 26k → profile page are shipped and dev-verified, advance this checkpoint to the new HEAD.
