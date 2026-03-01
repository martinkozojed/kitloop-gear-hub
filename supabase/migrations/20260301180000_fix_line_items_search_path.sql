-- Fix: add SET search_path = public to SECURITY DEFINER trigger function
-- Audit item A: update_reservation_total_on_line_item was SECURITY DEFINER
-- without search_path, violating SSOT §2 Security requirements.
-- Logic is identical to 20260228190000_reservation_line_items.sql; only the
-- function signature gains the search_path clause.
CREATE OR REPLACE FUNCTION public.update_reservation_total_on_line_item() RETURNS TRIGGER AS $$
DECLARE v_res_id UUID;
v_diff numeric(12, 2) := 0;
BEGIN IF TG_OP = 'INSERT' THEN v_res_id := NEW.reservation_id;
v_diff := NEW.amount;
ELSIF TG_OP = 'UPDATE' THEN v_res_id := NEW.reservation_id;
v_diff := NEW.amount - OLD.amount;
ELSIF TG_OP = 'DELETE' THEN v_res_id := OLD.reservation_id;
v_diff := - OLD.amount;
END IF;
IF v_diff != 0 THEN
UPDATE public.reservations
SET total_price = total_price + v_diff,
    amount_total_cents = amount_total_cents + (v_diff * 100)::integer
WHERE id = v_res_id;
END IF;
IF TG_OP = 'DELETE' THEN RETURN OLD;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;