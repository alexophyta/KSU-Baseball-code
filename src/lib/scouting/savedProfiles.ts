// LocalStorage-backed saved scouting profiles.

import type { RawRow } from "./csvParser";

const STORAGE_KEY = "scouting_saved_profiles_v1";

export interface SavedProfile {
  name: string;
  rows: RawRow[];
  savedAt: string;
  sourceFile: string;
}

export function loadSavedProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedProfiles(profiles: SavedProfile[]): { ok: boolean; error?: unknown } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return { ok: true };
  } catch (e) {
    console.error("Failed to save profiles", e);
    return { ok: false, error: e };
  }
}
