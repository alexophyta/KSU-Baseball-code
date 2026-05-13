
-- Haley, Austin: 837551 -> 1000108700
UPDATE public.plate_appearances SET batter_id = 1000108700 WHERE batter_id = 837551;
UPDATE public.plate_appearances SET pitcher_id = 1000108700 WHERE pitcher_id = 837551;
DELETE FROM public.players WHERE player_id = 837551;

-- Quetschenbach, Jack: 837549 -> 0
UPDATE public.plate_appearances SET batter_id = 0 WHERE batter_id = 837549;
UPDATE public.plate_appearances SET pitcher_id = 0 WHERE pitcher_id = 837549;
DELETE FROM public.players WHERE player_id = 837549;

-- Sheffield, Lincoln: 830369 -> 10078060
UPDATE public.plate_appearances SET batter_id = 10078060 WHERE batter_id = 830369;
UPDATE public.plate_appearances SET pitcher_id = 10078060 WHERE pitcher_id = 830369;
DELETE FROM public.players WHERE player_id = 830369;
