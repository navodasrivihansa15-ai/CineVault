/* ──────────────────────────────────────────────────────────
   CineVault — TMDB API Utility (Server-Side with Revalidation)
   ────────────────────────────────────────────────────────── */

/**
 * Environment variable — set in `.env.local`:
 *
 *   TMDB_API_KEY=your_tmdb_v3_api_key
 *   (or TMDB_ACCESS_TOKEN for v4 bearer auth)
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY ?? "";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN ?? "";

// ─── Types ───────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  adult: boolean;
  video: boolean;
}

export interface TMDBMovieDetails extends TMDBMovie {
  runtime: number | null;
  budget: number;
  revenue: number;
  tagline: string;
  status: string;
  homepage: string;
  imdb_id: string | null;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  spoken_languages: { iso_639_1: string; name: string }[];
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface DiscoverFilters {
  language?: string;
  region?: string;
  sortBy?: string;
  year?: number;
  primaryReleaseYear?: number;
  withGenres?: string; // comma-separated genre IDs
  withoutGenres?: string;
  voteAverageGte?: number;
  voteAverageLte?: number;
  voteCountGte?: number;
  includeAdult?: boolean;
  page?: number;
}

// ─── Internal Fetch Wrapper ──────────────────────────────

/**
 * Centralized fetch with auth and Next.js ISR revalidation.
 * Falls back from Bearer token → API key query param.
 */
async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
  revalidate: number = 3600 // default: 1 hour
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);

  // Add API key as query param if no bearer token
  if (!TMDB_ACCESS_TOKEN && TMDB_API_KEY) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }

  // Append extra query params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDB API error ${res.status} on ${endpoint}: ${body}`
    );
  }

  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────

/** Image base URLs */
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const posterUrl = (path: string | null, size = "w500") =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
export const backdropUrl = (path: string | null, size = "w1280") =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

// ── Trending ─────────────────────────────────────────────

/**
 * Fetch trending movies.
 * @param window — "day" or "week"
 * @param page — page number (1-indexed)
 * @param revalidate — ISR revalidation period in seconds (default: 1 hour)
 */
export async function fetchTrending(
  window: "day" | "week" = "day",
  page = 1,
  revalidate = 3600
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch(
    `/trending/movie/${window}`,
    { page, language: "en-US" },
    revalidate
  );
}

// ── Discover (with Filters) ──────────────────────────────

/**
 * Discover movies with rich filtering.
 * All filters are optional — omitted ones use TMDB defaults.
 */
export async function discoverMovies(
  filters: DiscoverFilters = {},
  revalidate = 3600
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  const params: Record<string, string | number | boolean> = {
    language: filters.language ?? "en-US",
    sort_by: filters.sortBy ?? "popularity.desc",
    include_adult: filters.includeAdult ?? false,
    page: filters.page ?? 1,
  };

  if (filters.region) params.region = filters.region;
  if (filters.year) params.year = filters.year;
  if (filters.primaryReleaseYear)
    params.primary_release_year = filters.primaryReleaseYear;
  if (filters.withGenres) params.with_genres = filters.withGenres;
  if (filters.withoutGenres) params.without_genres = filters.withoutGenres;
  if (filters.voteAverageGte)
    params["vote_average.gte"] = filters.voteAverageGte;
  if (filters.voteAverageLte)
    params["vote_average.lte"] = filters.voteAverageLte;
  if (filters.voteCountGte)
    params["vote_count.gte"] = filters.voteCountGte;

  return tmdbFetch("/discover/movie", params, revalidate);
}

export interface DiscoverMediaParams {
  type: string; // 'movie' | 'tv' | 'trending'
  genre?: string;
  year?: string;
  lang?: string;
  page?: number;
}

/**
 * Universal discover function supporting both movies and TV shows, with explicit query mapping.
 */
export async function discoverMedia(
  params: DiscoverMediaParams,
  revalidate = 3600
): Promise<TMDBPaginatedResponse<any>> {
  if (params.type === "trending") {
    // Trending endpoint doesn't support with_genres or year, just page and time window.
    return tmdbFetch(`/trending/all/day`, { page: params.page || 1 }, revalidate);
  }

  if (params.type === "all") {
    if (!params.genre && !params.year && !params.lang) {
      return tmdbFetch(`/trending/all/day`, { page: params.page || 1 }, revalidate);
    }
    
    // Otherwise, fetch both and merge
    const movieParams: Record<string, string | number> = {
      page: params.page || 1,
      sort_by: "popularity.desc",
    };
    const tvParams: Record<string, string | number> = {
      page: params.page || 1,
      sort_by: "popularity.desc",
    };

    if (params.genre) {
      movieParams.with_genres = params.genre;
      tvParams.with_genres = params.genre;
    }
    if (params.lang) {
      movieParams.with_original_language = params.lang;
      tvParams.with_original_language = params.lang;
    }
    if (params.year) {
      movieParams.primary_release_year = params.year;
      tvParams.first_air_date_year = params.year;
    }

    const [movieRes, tvRes] = await Promise.all([
      tmdbFetch("/discover/movie", movieParams, revalidate) as Promise<any>,
      tmdbFetch("/discover/tv", tvParams, revalidate) as Promise<any>
    ]);

    const combinedResults = [
      ...(movieRes.results || []).map((m: any) => ({ ...m, media_type: "movie" })),
      ...(tvRes.results || []).map((t: any) => ({ ...t, media_type: "tv" }))
    ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return {
      page: params.page || 1,
      results: combinedResults.slice(0, 20),
      total_pages: Math.max(movieRes.total_pages || 1, tvRes.total_pages || 1),
      total_results: (movieRes.total_results || 0) + (tvRes.total_results || 0)
    };
  }

  const endpoint = params.type === "tv" ? "/discover/tv" : "/discover/movie";
  const apiParams: Record<string, string | number> = {
    page: params.page || 1,
    sort_by: "popularity.desc",
  };

  if (params.genre) apiParams.with_genres = params.genre;
  if (params.lang) apiParams.with_original_language = params.lang;
  
  if (params.year) {
    if (params.type === "tv") {
      apiParams.first_air_date_year = params.year;
    } else {
      apiParams.primary_release_year = params.year;
    }
  }

  return tmdbFetch(endpoint, apiParams, revalidate);
}

// ── Search ───────────────────────────────────────────────

/**
 * Search movies by query string.
 * @param query — search string
 * @param page — page number
 * @param options — optional language, year, include_adult, region
 */
export async function searchMovies(
  query: string,
  page = 1,
  options: {
    language?: string;
    year?: number;
    includeAdult?: boolean;
    region?: string;
  } = {},
  revalidate = 600 // 10 min for search results
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch(
    "/search/movie",
    {
      query,
      page,
      language: options.language ?? "en-US",
      include_adult: options.includeAdult ?? false,
      ...(options.year ? { year: options.year } : {}),
      ...(options.region ? { region: options.region } : {}),
    },
    revalidate
  );
}

export interface SearchMediaFilteredParams {
  query: string;
  type?: string;
  year?: string;
  lang?: string;
  page?: number;
}

/**
 * Powerful search function respecting the Navbar filters (Type, Year, Language).
 */
export async function searchMediaFiltered(
  params: SearchMediaFilteredParams,
  revalidate = 600
): Promise<TMDBPaginatedResponse<any>> {
  if (!params.query) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }

  let endpoint = "";
  if (params.type === "all") endpoint = "/search/multi";
  else if (params.type === "tv") endpoint = "/search/tv";
  else endpoint = "/search/movie";
  
  const apiParams: Record<string, string | number> = {
    query: params.query,
    page: params.page || 1,
  };

  if (params.lang) apiParams.language = params.lang;
  else apiParams.language = "en-US";

  if (params.year) {
    if (params.type === "tv") {
      apiParams.first_air_date_year = params.year;
    } else if (params.type === "movie" || !params.type) {
      apiParams.primary_release_year = params.year;
    }
    // Note: /search/multi does not fully support year filtering natively on TMDB for both simultaneously.
  }

  return tmdbFetch(endpoint, apiParams, revalidate);
}

// ── Movie Details ────────────────────────────────────────

/**
 * Fetch full details for a single movie.
 * @param movieId — TMDB movie ID
 * @param appendToResponse — extra sub-requests (e.g. "credits,videos,images")
 */
export async function fetchMovieDetails(
  movieId: number,
  appendToResponse = "credits,videos,images,recommendations",
  revalidate = 86400 // 24 hours — movie details rarely change
): Promise<TMDBMovieDetails> {
  return tmdbFetch(
    `/movie/${movieId}`,
    {
      language: "en-US",
      append_to_response: appendToResponse,
    },
    revalidate
  );
}

// ── Genre List ───────────────────────────────────────────

/**
 * Fetch the full list of TMDB movie genres.
 * Cached aggressively — genres almost never change.
 */
export async function fetchGenres(
  language = "en-US",
  revalidate = 604800 // 7 days
): Promise<TMDBGenre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>(
    "/genre/movie/list",
    { language },
    revalidate
  );
  return data.genres;
}

// ── TV Show Types ────────────────────────────────────────

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  origin_country: string[];
  media_type?: string;
}

export interface TMDBTVDetails extends TMDBTVShow {
  episode_run_time: number[];
  homepage: string;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  number_of_episodes: number;
  number_of_seasons: number;
  status: string;
  tagline: string;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  seasons: {
    air_date: string;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
  }[];
}

export interface TMDBMultiResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  profile_path?: string | null;
  known_for_department?: string;
  job?: string;
  department?: string;
}

// ── TV Details ───────────────────────────────────────────

export async function fetchTVDetails(
  tvId: number,
  appendToResponse = "credits,videos,images,recommendations",
  revalidate = 86400
): Promise<TMDBTVDetails> {
  return tmdbFetch(
    `/tv/${tvId}`,
    {
      language: "en-US",
      append_to_response: appendToResponse,
    },
    revalidate
  );
}

// ── Popular Movies ───────────────────────────────────────


export async function fetchPopularMovies(
  page = 1,
  revalidate = 3600
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch(
    "/movie/popular",
    { page, language: "en-US" },
    revalidate
  );
}

// ── Top Rated TV Shows ───────────────────────────────────

export async function fetchTopRatedTV(
  page = 1,
  revalidate = 3600
): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return tmdbFetch(
    "/tv/top_rated",
    { page, language: "en-US" },
    revalidate
  );
}

// ── Multi Search ─────────────────────────────────────────

export async function multiSearch(
  query: string,
  page = 1,
  revalidate = 300
): Promise<TMDBPaginatedResponse<TMDBMultiResult>> {
  return tmdbFetch(
    "/search/multi",
    { query, page, language: "en-US", include_adult: false },
    revalidate
  );
}

// ── People ───────────────────────────────────────────────

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface TMDBPersonDetails extends TMDBPerson {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  also_known_as: string[];
  combined_credits?: {
    cast: TMDBMultiResult[];
    crew: TMDBMultiResult[];
  };
}

/**
 * Search people by query string.
 */
export async function searchPeople(
  query: string,
  page = 1,
  revalidate = 600
): Promise<TMDBPaginatedResponse<TMDBPerson>> {
  return tmdbFetch(
    "/search/person",
    { query, page, language: "en-US", include_adult: false },
    revalidate
  );
}

/**
 * Fetch full details for a single person including their combined credits.
 */
export async function getPersonDetails(
  personId: string | number,
  appendToResponse = "combined_credits",
  revalidate = 86400
): Promise<TMDBPersonDetails> {
  return tmdbFetch(
    `/person/${personId}`,
    {
      language: "en-US",
      append_to_response: appendToResponse,
    },
    revalidate
  );
}
