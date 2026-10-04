import { db, type WatchlistEntity, type WatchedMovieEntity } from "./db";
import { supabase } from "./supabase";

export interface SyncItemPayload {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number;
  genreIds: number[];
  rating?: number;
}

export const getFullImageUrl = (path: string | null | undefined, size = 'w500') => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Robust Watchlist Toggle: Optimistic UI Updates + Mutual Exclusivity
 */
export async function toggleWatchlist(item: any, currentlyInWatchlist: boolean): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Please log in to save this item.");
      throw new Error("No active session found.");
    }

    const userId = session.user.id;
    const tmdbId = item.tmdbId || item.id;
    
    if (!tmdbId) throw new Error("Missing tmdbId in payload.");

    if (currentlyInWatchlist) {
      // 1. DELETE FROM DEXIE (Optimistic UI Update)
      const records = await db.watchlist.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of records) if (r.id) await db.watchlist.delete(r.id);
      
      // 2. DELETE FROM SUPABASE (Background)
      supabase
        .from("watchlist")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_id", String(tmdbId))
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Delete Watchlist):", error.message);
        });

      return true;
      
    } else {
      // 1. ADD TO DEXIE FIRST (Optimistic UI Update + Mutual Exclusivity)
      
      // Delete any existing entries in both tables to prevent ConstraintError on &tmdbId
      const existingWl = await db.watchlist.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of existingWl) if (r.id) await db.watchlist.delete(r.id);
      
      const existingVault = await db.watchedMovies.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of existingVault) if (r.id) await db.watchedMovies.delete(r.id);

      const newItem: WatchlistEntity = {
        tmdbId: Number(tmdbId),
        title: item.title || item.name || item.original_title || "Unknown",
        posterPath: getFullImageUrl(item.posterUrl || item.posterPath || item.poster_path, 'w500'),
        backdropPath: getFullImageUrl(item.backdropUrl || item.backdropPath || item.backdrop_path, 'original'),
        releaseYear: item.releaseYear || item.release_year || new Date().getFullYear(),
        genreIds: item.genreIds || item.genre_ids || [],
        priority: "medium",
        remindAt: null,
        source: "Explore",
        addedAt: new Date().toISOString(),
        syncId: null, 
      };
      await db.watchlist.put(newItem);

      // 2. BACKGROUND: Supabase (Upsert Watchlist + Delete Vault)
      const payload = {
        user_id: userId,
        tmdb_id: String(tmdbId),
        title: newItem.title,
        poster_url: newItem.posterPath,
        backdrop_path: newItem.backdropPath,
        media_type: item.mediaType || item.media_type || "movie"
      };

      supabase
        .from("watchlist")
        .upsert(payload, { onConflict: "user_id, tmdb_id" })
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Upsert Watchlist):", error.message);
        });
        
      supabase
        .from("vault")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_id", String(tmdbId))
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Delete Vault Exclusivity):", error.message);
        });

      return true; 
    }
  } catch (err: any) {
    console.error("Unexpected Error in toggleWatchlist:", err);
    alert("Error: " + (err.message || "Failed to sync."));
    return false;
  }
}

/**
 * Robust Vault Toggle: Optimistic UI Updates + Mutual Exclusivity
 */
export async function toggleVault(item: any, currentlyInVault: boolean): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Please log in to log this item.");
      throw new Error("No active session found.");
    }

    const userId = session.user.id;
    const tmdbId = item.tmdbId || item.id;
    
    if (!tmdbId) throw new Error("Missing tmdbId in payload.");

    if (currentlyInVault) {
      // 1. DELETE FROM DEXIE (Optimistic UI Update)
      const records = await db.watchedMovies.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of records) if (r.id) await db.watchedMovies.delete(r.id);
      
      // 2. DELETE FROM SUPABASE (Background)
      supabase
        .from("vault")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_id", String(tmdbId))
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Delete Vault):", error.message);
        });

      return true;
      
    } else {
      // 1. ADD TO DEXIE FIRST (Optimistic UI Update + Mutual Exclusivity)
      const personalRating = item.rating || item.personal_rating || item.userRating || null;
      
      // Delete any existing entries in both tables to prevent ConstraintError on &tmdbId
      const existingVault = await db.watchedMovies.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of existingVault) if (r.id) await db.watchedMovies.delete(r.id);
      
      const existingWl = await db.watchlist.where("tmdbId").equals(Number(tmdbId)).toArray();
      for (const r of existingWl) if (r.id) await db.watchlist.delete(r.id);

      const newItem: WatchedMovieEntity = {
        tmdbId: Number(tmdbId),
        title: item.title || item.name || item.original_title || "Unknown",
        posterPath: getFullImageUrl(item.posterUrl || item.posterPath || item.poster_path, 'w500'),
        backdropPath: getFullImageUrl(item.backdropUrl || item.backdropPath || item.backdrop_path, 'original'),
        releaseYear: item.releaseYear || item.release_year || new Date().getFullYear(),
        genreIds: item.genreIds || item.genre_ids || [],
        userRating: personalRating,
        notes: "",
        watchedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        syncId: null,
      };
      await db.watchedMovies.put(newItem);

      // 2. BACKGROUND: Supabase (Upsert Vault + Delete Watchlist)
      const payload = {
        user_id: userId,
        tmdb_id: String(tmdbId),
        title: newItem.title,
        poster_url: newItem.posterPath,
        backdrop_path: newItem.backdropPath,
        media_type: item.mediaType || item.media_type || "movie",
        personal_rating: personalRating
      };

      supabase
        .from("vault")
        .upsert(payload, { onConflict: "user_id, tmdb_id" })
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Upsert Vault):", error.message);
        });
        
      supabase
        .from("watchlist")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_id", String(tmdbId))
        .then(({ error }) => {
          if (error) console.error("Supabase Error (Delete Watchlist Exclusivity):", error.message);
        });

      return true;
    }
  } catch (err: any) {
    console.error("Unexpected Error in toggleVault:", err);
    alert("Error: " + (err.message || "Failed to sync."));
    return false;
  }
}

/**
 * Move item from Watchlist to Vault (Optimistic)
 */
export async function moveToVault(item: any): Promise<boolean> {
  // This essentially performs a "toggleVault(true)" effectively, but let's be explicit
  return toggleVault(item, false); // false means "it is not currently in vault, so add it and remove from WL"
}

/**
 * Direct Remove from Watchlist (UI pages) - Optimistic
 */
export async function removeFromWatchlist(tmdbId: string | number): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please log in to remove items.");
      throw new Error("No active session found.");
    }
    
    // 1. DELETE FROM DEXIE (Optimistic)
    const records = await db.watchlist.where("tmdbId").equals(Number(tmdbId)).toArray();
    for (const r of records) if (r.id) await db.watchlist.delete(r.id);
    
    // 2. DELETE FROM SUPABASE (Background)
    supabase
      .from("watchlist")
      .delete()
      .eq("user_id", session.user.id)
      .eq("tmdb_id", String(tmdbId))
      .then(({ error }) => {
        if (error) console.error("Supabase Error (Delete Watchlist):", error.message);
      });
    
    return true;
  } catch (err: any) {
    console.error("Error in removeFromWatchlist:", err);
    alert("Error: " + (err.message || "Failed to remove item."));
    return false;
  }
}

/**
 * Direct Remove from Vault (UI pages) - Optimistic
 */
export async function removeFromVault(tmdbId: string | number): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please log in to remove items.");
      throw new Error("No active session found.");
    }
    
    // 1. DELETE FROM DEXIE (Optimistic)
    const records = await db.watchedMovies.where("tmdbId").equals(Number(tmdbId)).toArray();
    for (const r of records) if (r.id) await db.watchedMovies.delete(r.id);
    
    // 2. DELETE FROM SUPABASE (Background)
    supabase
      .from("vault")
      .delete()
      .eq("user_id", session.user.id)
      .eq("tmdb_id", String(tmdbId))
      .then(({ error }) => {
        if (error) console.error("Supabase Error (Delete Vault):", error.message);
      });
    
    return true;
  } catch (err: any) {
    console.error("Error in removeFromVault:", err);
    alert("Error: " + (err.message || "Failed to remove item."));
    return false;
  }
}

/**
 * Update Vault Entry (e.g. personal rating) - Optimistic
 */
export async function updateVaultEntry(tmdbId: string | number, updates: any): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please log in to update items.");
      throw new Error("No active session found.");
    }
    
    // 1. UPDATE DEXIE (Optimistic)
    const records = await db.watchedMovies.where("tmdbId").equals(Number(tmdbId)).toArray();
    for (const r of records) {
      if (r.id) {
        const dexieUpdates: any = {};
        if (updates.personal_rating !== undefined) dexieUpdates.userRating = updates.personal_rating;
        if (updates.notes !== undefined) dexieUpdates.notes = updates.notes;
        
        await db.watchedMovies.update(r.id, dexieUpdates);
      }
    }
    
    // 2. UPDATE SUPABASE (Background)
    supabase
      .from("vault")
      .update(updates)
      .eq("user_id", session.user.id)
      .eq("tmdb_id", String(tmdbId))
      .then(({ error }) => {
        if (error) console.error("Supabase Error (Update Vault):", error.message);
      });
    
    return true;
  } catch (err: any) {
    console.error("Error in updateVaultEntry:", err);
    alert("Error: " + (err.message || "Failed to update item."));
    return false;
  }
}

/**
 * Downloads user's entire watchlist and vault from Supabase and restores Dexie.
 * Called ON LOGIN. Uses bulkPut to avoid dupes.
 */
export async function restoreDataFromCloud() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    console.log("Starting Cloud Restore for user:", userId);

    // 1. Fetch Watchlist
    const { data: cloudWatchlist, error: wlError } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId);

    if (wlError) {
      console.error("Supabase Error (Fetch Watchlist):", wlError.message);
    }

    // 2. Fetch Vault
    const { data: cloudVault, error: vError } = await supabase
      .from("vault")
      .select("*")
      .eq("user_id", userId);

    if (vError) {
      console.error("Supabase Error (Fetch Vault):", vError.message);
    }

    // 3. Clear local DB before inserting cloud data to ensure exact sync
    await db.watchlist.clear();
    await db.watchedMovies.clear();

    // 4. Transform and Insert Watchlist
    if (cloudWatchlist && cloudWatchlist.length > 0) {
      const localWatchlist: WatchlistEntity[] = cloudWatchlist.map((item) => ({
        tmdbId: Number(item.tmdb_id),
        title: item.title,
        posterPath: item.poster_url,      
        backdropPath: item.backdrop_path,
        releaseYear: item.release_year || new Date().getFullYear(), 
        genreIds: item.genre_ids || [],
        priority: "medium",
        remindAt: null,
        source: "Cloud",
        addedAt: item.created_at || new Date().toISOString(),
        syncId: item.id,
      }));
      await db.watchlist.bulkPut(localWatchlist);
    }

    // 5. Transform and Insert Vault
    if (cloudVault && cloudVault.length > 0) {
      const localVault: WatchedMovieEntity[] = cloudVault.map((item) => ({
        tmdbId: Number(item.tmdb_id),
        title: item.title,
        posterPath: item.poster_url,      
        backdropPath: item.backdrop_path,
        releaseYear: item.release_year || new Date().getFullYear(),
        genreIds: item.genre_ids || [],
        userRating: item.personal_rating || item.user_rating || null,
        notes: item.notes || "",
        watchedAt: item.watched_at || item.created_at || new Date().toISOString(),
        createdAt: item.created_at || new Date().toISOString(),
        syncId: item.id,
      }));
      await db.watchedMovies.bulkPut(localVault);
    }

    console.log("Cloud Restore Complete!");
  } catch (err) {
    console.error("Unexpected Error in restoreDataFromCloud:", err);
  }
}
