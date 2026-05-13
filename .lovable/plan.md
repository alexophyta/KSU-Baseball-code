## Goal

On the Player Data page, change the "Game Date" filter from single-select to multi-select. On the pitching tab, the **Inning Detail** section should:
- Render exactly as it does today when **one** game is selected.
- Be hidden when **multiple** games (or "all" with >1 available game) are selected.

## Changes

### 1. Type update — `src/lib/playerAnalytics/types.ts`
Change `selectedDate: string` → `selectedDates: string[]` (empty array = "All Games"). Update `DEFAULT_FILTERS` in `src/pages/PlayerData.tsx` accordingly.

### 2. Filter UI — `src/components/player-analytics/PlayerFilterBar.tsx`
Replace the existing `<Select>` for game date with a Popover + Checkbox list (matching the existing Counts / Pitches multi-select pattern already used in this file). Label logic:
- `[]` → "All Games"
- 1 selected → show that date
- N selected → "N games"
Include a "Clear" button.

### 3. Filter chips — `src/components/player-analytics/FilterChips.tsx`
Render one chip per selected date (or a single "Dates: N" chip), with remove/clear handlers updated for the array. Update the "Clear all" reset to use `selectedDates: []`.

### 4. Compute filters — `src/lib/playerAnalytics/computeHitting.ts` and `computePitching.ts`
Replace:
```ts
if (selectedDate !== "all") filteredPAs = filteredPAs.filter(pa => pa.games?.game_date === selectedDate);
```
with:
```ts
if (selectedDates.length > 0) filteredPAs = filteredPAs.filter(pa => selectedDates.includes(pa.games?.game_date));
```

### 5. Inning Detail gating — `computeInningData` in `src/lib/playerAnalytics/computePitching.ts` and the `inningData` memo in `src/pages/PlayerData.tsx`
Change signature from `selectedDate: string` to `selectedDates: string[]`. Logic:
- If `selectedDates.length === 1` → compute inning data for that single date (existing behavior).
- Otherwise (0 or 2+) → return `null`, which already causes `PitchingTab` to skip rendering the Inning Detail block (it's wrapped in `inningData && inningData.length > 0`).

No changes needed inside `PitchingTab.tsx` — the existing conditional handles `null` correctly.

## Notes
- "All Games" with only 1 available date will still show inning detail (single effective game). This matches the user's intent of "keep how it runs when one is selected."
- Hitting tab is unaffected aside from the multi-date filter applying to its calculations.
