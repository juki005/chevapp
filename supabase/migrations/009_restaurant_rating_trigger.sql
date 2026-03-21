-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 009: Auto-sync restaurant rating + review_count
-- Whenever a row is inserted, updated, or deleted in restaurant_reviews,
-- this trigger recalculates the denormalized columns on the restaurants table.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_restaurant_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  -- Determine which restaurant was affected
  IF TG_OP = 'DELETE' THEN
    v_restaurant_id := OLD.restaurant_id;
  ELSE
    v_restaurant_id := NEW.restaurant_id;
  END IF;

  -- Recalculate and write back to the restaurants row
  UPDATE public.restaurants
  SET
    rating       = COALESCE((
                     SELECT ROUND(AVG(rating)::numeric, 1)
                     FROM   public.restaurant_reviews
                     WHERE  restaurant_id = v_restaurant_id
                   ), 0),
    review_count = (
                     SELECT COUNT(*)
                     FROM   public.restaurant_reviews
                     WHERE  restaurant_id = v_restaurant_id
                   )
  WHERE id = v_restaurant_id;

  RETURN NULL; -- AFTER trigger; return value is ignored
END;
$$;

-- Drop and recreate so running this file twice is safe
DROP TRIGGER IF EXISTS trg_sync_restaurant_rating ON public.restaurant_reviews;

CREATE TRIGGER trg_sync_restaurant_rating
  AFTER INSERT OR UPDATE OR DELETE
  ON public.restaurant_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_restaurant_rating();
