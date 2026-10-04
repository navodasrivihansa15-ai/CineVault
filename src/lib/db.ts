import Dexie, { type EntityTable } from "dexie";

/* ──────────────────────────────────────────────────────────
   CineVault — Local-First Database (Dexie.js / IndexedDB)
   ────────────────────────────────────────────────────────── */

// ─── Entity Interfaces ───────────────────────────────────

/** A movie the user has already watched */
export interface WatchedMovieEntity {
  /** Auto-incremented local ID */
  id?: number;
  /** TMDB movie ID — unique constraint */
  tmdbId: number;
  /** Movie title */
  title: string;
  /** Poster path from TMDB (e.g. "/abc123.jpg") */
  posterPath: string | null;
  /** Backdrop path from TMDB */
  backdropPath: string | null;
  /** Release year */
  releaseYear: number;
  /** Genre IDs from TMDB */
  genreIds: number[];
  /** User's personal rating (0–10, half-star increments) */
  userRating: number | null;
  /** Free-form notes / mini review */
  notes: string;
  /** ISO timestamp of when the user watched it */
  watchedAt: string;
  /** ISO timestamp of when the record was created */
  createdAt: string;
  /** Supabase UUID for cloud sync (null if not yet synced) */
  syncId: string | null;
}

/** A movie on the user's watchlist / wishlist */
export interface WatchlistEntity {
  id?: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number;
  genreIds: number[];
  /** Priority level for sorting */
  priority: "high" | "medium" | "low";
  /** Optional reminder date (ISO string) */
  remindAt: string | null;
  /** Where the user heard about it */
  source: string;
  addedAt: string;
  syncId: string | null;
}

/** A saved streaming link for a movie */
export interface SavedStreamLink {
  id?: number;
  /** TMDB movie ID this link belongs to */
  tmdbId: number;
  /** Display name (e.g. "Netflix", "Prime Video") */
  providerName: string;
  /** Provider logo path or URL */
  providerLogo: string | null;
  /** Direct URL to the stream */
  url: string;
  /** Quality label (e.g. "4K", "HD", "CAM") */
  quality: string;
  /** User-reported working status */
  isVerified: boolean;
  addedAt: string;
  syncId: string | null;
}

/** User preferences stored locally for instant access */
export interface UserPreferences {
  /** Single-row key — always "preferences" */
  key: string;
  /** Default language filter (ISO 639-1 code, e.g. "en") */
  preferredLanguage: string;
  /** Preferred TMDB region */
  region: string;
  /** Include adult content in results */
  includeAdult: boolean;
  /** UI theme — reserved for future light mode */
  theme: "dark" | "oled";
  /** Default sort for Vault view */
  vaultSortBy: "watchedAt" | "userRating" | "title" | "releaseYear";
  /** Default sort order */
  vaultSortOrder: "asc" | "desc";
  /** Enable haptic / toast notifications */
  notificationsEnabled: boolean;
  /** Last cloud sync timestamp */
  lastSyncedAt: string | null;
}

// ─── Database Definition ─────────────────────────────────

class CineVaultDB extends Dexie {
  watchedMovies!: EntityTable<WatchedMovieEntity, "id">;
  watchlist!: EntityTable<WatchlistEntity, "id">;
  streamLinks!: EntityTable<SavedStreamLink, "id">;
  preferences!: EntityTable<UserPreferences, "key">;

  constructor() {
    super("CineVaultDB");

    this.version(1).stores({
      // Indexes: ++id = auto-increment PK, &tmdbId = unique index
      // Compound & multi-entry indexes for fast querying
      watchedMovies:
        "++id, &tmdbId, title, releaseYear, userRating, watchedAt, createdAt, syncId, *genreIds",
      watchlist:
        "++id, &tmdbId, title, releaseYear, priority, addedAt, syncId, *genreIds",
      streamLinks:
        "++id, tmdbId, providerName, quality, addedAt, syncId",
      preferences:
        "key",
    });
  }
}

// ─── Singleton Instance ──────────────────────────────────

export const db = new CineVaultDB();

// ─── Helper: Seed Default Preferences ────────────────────

export async function ensureDefaultPreferences(): Promise<UserPreferences> {
  const existing = await db.preferences.get("preferences");
  if (existing) return existing;

  const defaults: UserPreferences = {
    key: "preferences",
    preferredLanguage: "en",
    region: "US",
    includeAdult: false,
    theme: "oled",
    vaultSortBy: "watchedAt",
    vaultSortOrder: "desc",
    notificationsEnabled: true,
    lastSyncedAt: null,
  };

  await db.preferences.put(defaults);
  return defaults;
}

// ─── Helper: Quick Stats ─────────────────────────────────

export async function getVaultStats() {
  const [watchedCount, watchlistCount, linksCount] = await Promise.all([
    db.watchedMovies.count(),
    db.watchlist.count(),
    db.streamLinks.count(),
  ]);

  const avgRating = await db.watchedMovies
    .filter((m) => m.userRating !== null)
    .toArray()
    .then((movies) => {
      if (movies.length === 0) return null;
      const sum = movies.reduce((acc, m) => acc + (m.userRating ?? 0), 0);
      return Math.round((sum / movies.length) * 10) / 10;
    });

  return { watchedCount, watchlistCount, linksCount, avgRating };
}
