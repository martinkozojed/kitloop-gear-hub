-- docs/verification/check_pilot_traction.sql
-- Goal: Founders Dashboard - 3 key metrics over last 7 days
-- Query 1: Number of created/active/completed reservations per provider last 7 days
SELECT p.business_name,
    vd.metric_date,
    vd.total_created_reservations,
    vd.active_reservations,
    vd.completed_reservations,
    vd.cancelled_reservations
FROM public.vw_pilot_daily_metrics vd
    JOIN public.providers p ON p.id = vd.provider_id
WHERE vd.metric_date >= current_date - interval '7 days'
ORDER BY vd.metric_date DESC,
    p.business_name ASC;
-- Query 2: Aggregate metric - how many reservations were actually touched/made
SELECT SUM(total_created_reservations) as global_total_reservations,
    SUM(cancelled_reservations) as global_cancelled
FROM public.vw_pilot_daily_metrics
WHERE metric_date >= current_date - interval '7 days';
-- Query 3: Current Global Inventory Fill Rate (Snapshot)
-- Note: This reads from gear_items to show available vs utilized
SELECT condition_state,
    COUNT(*) as item_count
FROM public.gear_items
GROUP BY condition_state;