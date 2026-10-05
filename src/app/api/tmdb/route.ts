import { NextResponse } from "next/server";
import {
  fetchTrending,
  fetchPopularMovies,
  fetchTopRatedTV,
  fetchGenres,
  multiSearch,
  discoverMovies,
  fetchNewReleases,
} from "@/lib/tmdb";

/* ──────────────────────────────────────────────────────────
   TMDB API Proxy — keeps API keys server-side
   GET /api/tmdb?action=trending|popular|topRatedTV|genres|search|newReleases
   ────────────────────────────────────────────────────────── */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "newReleases": {
        const page = Number(searchParams.get("page") || 1);
        const data = await fetchNewReleases(page);
        return NextResponse.json(data);
      }

      case "trending": {
        const window = (searchParams.get("window") as "day" | "week") || "day";
        const page = Number(searchParams.get("page") || 1);
        const data = await fetchTrending(window, page);
        return NextResponse.json(data);
      }

      case "popular": {
        const page = Number(searchParams.get("page") || 1);
        const data = await fetchPopularMovies(page);
        return NextResponse.json(data);
      }

      case "topRatedTV": {
        const page = Number(searchParams.get("page") || 1);
        const data = await fetchTopRatedTV(page);
        return NextResponse.json(data);
      }

      case "genres": {
        const data = await fetchGenres();
        return NextResponse.json(data);
      }

      case "search": {
        const query = searchParams.get("query") || "";
        if (!query.trim()) {
          return NextResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
        }
        const page = Number(searchParams.get("page") || 1);
        const data = await multiSearch(query, page);
        return NextResponse.json(data);
      }

      case "discover": {
        const language = searchParams.get("language") || undefined;
        const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
        const page = Number(searchParams.get("page") || 1);
        const data = await discoverMovies({ language, primaryReleaseYear: year, page });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: trending, popular, topRatedTV, genres, search, discover" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("TMDB API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 500 }
    );
  }
}
