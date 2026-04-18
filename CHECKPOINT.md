# 🏁 Stable Checkpoint — Sprint 17

> **If a future sprint breaks something, roll back to here.** This is the last commit where the app is known to build, run, and have a clean backend foundation. Use it as your "home base."

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
| **17** | **`ad5880e`** ← **YOU ARE HERE** | UGC database foundation |

---

## ➡️ Next logical sprint

**Sprint 18 — "UGC UI: Reviews + Photo Upload"**
Wire the Sprint 17 backend to actual buttons:
- Review modal (meat + bread stars, comment, photo upload)
- Upload flow: `compressImage()` → `supabase.storage.upload()` → `place_reviews` insert
- Review display under restaurant cards
- "Already reviewed" state using the `UNIQUE(user_id, place_id)` collision
