"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HeroBanner from "@/components/HeroBanner";
import MediaCarousel, { MediaCardItem } from "@/components/MediaCarousel";
import FilterHub from "@/components/FilterHub";
import SearchBar from "@/components/SearchBar";
import { TMDBMovie, TMDBTVShow, TMDBGenre } from "@/lib/tmdb";
import { Loader2 } from "lucide-react";

export default function ExplorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMovie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBTVShow[]>([]);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  
  // Active Filter/Search States
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredResults, setFilteredResults] = useState<TMDBMovie[]>([]);

  // Initial Data Fetch
  useEffect(() => {
    async function fetchInitial() {
      try {
        const [trendingRes, popularRes, topTvRes, genresRes] = await Promise.all([
          fetch("/api/tmdb?action=trending").then((res) => res.json()),
          fetch("/api/tmdb?action=popular").then((res) => res.json()),
          fetch("/api/tmdb?action=topRatedTV").then((res) => res.json()),
          fetch("/api/tmdb?action=genres").then((res) => res.json()),
        ]);

        setTrendingMovies(trendingRes.results || []);
        setPopularMovies(popularRes.results || []);
        setTopRatedTV(topTvRes.results || []);
        setGenres(genresRes || []);
      } catch (err) {
        console.error("Failed to fetch explore data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, []);

  const handleFilterChange = async (filters: { category?: string; language?: string; year?: number }) => {
    if (!filters.language && !filters.year && (!filters.category || filters.category === 'movies')) {
      setIsFiltered(false);
      setFilteredResults([]);
      return;
    }
    
    setLoading(true);
    setIsFiltered(true);
    try {
      let url = `/api/tmdb?action=discover`;
      if (filters.category === 'tv') {
        // Fallback for TV Shows if discoverTV isn't ready
        url = `/api/tmdb?action=topRatedTV`;
      } else if (filters.category === 'trending') {
        url = `/api/tmdb?action=trending`;
      } else {
        if (filters.language) url += `&language=${filters.language}`;
        if (filters.year) url += `&year=${filters.year}`;
      }
      
      const res = await fetch(url).then(r => r.json());
      setFilteredResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (type: string, id: number) => {
    if (type === "movie") router.push(`/movie/${id}`);
    else if (type === "tv") router.push(`/tv/${id}`);
    else if (type === "person") router.push(`/person/${id}`);
  };

  if (loading && trendingMovies.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  // Map to common MediaCardItem format
  const mapMovies = (movies: TMDBMovie[]): MediaCardItem[] => movies.map(m => ({
    id: m.id,
    title: m.title,
    posterPath: m.poster_path,
    rating: m.vote_average,
    year: m.release_date?.substring(0, 4) || "",
    mediaType: "movie",
  }));

  const trendingItems = mapMovies(trendingMovies);
  const popularItems = mapMovies(popularMovies);
  const filteredItems = mapMovies(filteredResults);
  
  const topTvItems: MediaCardItem[] = topRatedTV.map((t) => ({
    id: t.id,
    title: t.name,
    posterPath: t.poster_path,
    rating: t.vote_average,
    year: t.first_air_date?.substring(0, 4) || "",
    mediaType: "tv",
  }));

  return (
    <div className="flex flex-col min-h-screen pb-20">


      {!isFiltered && <HeroBanner movies={trendingMovies} genres={genres} />}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 sm:px-8 mt-12">
        {loading && <div className="text-gold text-sm animate-pulse">Loading content...</div>}
        
        {isFiltered ? (
          <MediaCarousel title="Discover Results" items={filteredItems} onCardClick={(item) => handleNavigate(item.mediaType, item.id)} />
        ) : (
          <>
            <MediaCarousel title="Trending Now" items={trendingItems} onCardClick={(item) => handleNavigate(item.mediaType, item.id)} exploreLink="/explore/trending" />
            <MediaCarousel title="Popular Movies" items={popularItems} onCardClick={(item) => handleNavigate(item.mediaType, item.id)} exploreLink="/explore/movies" />
            <MediaCarousel title="Top Rated TV Shows" items={topTvItems} onCardClick={(item) => handleNavigate(item.mediaType, item.id)} exploreLink="/explore/tv" />
          </>
        )}
      </div>
    </div>
  );
}
