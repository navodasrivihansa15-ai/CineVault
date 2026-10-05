import { fetchTrending, fetchPopularMovies, fetchTopRatedTV } from "@/lib/tmdb";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "@/components/MediaCard";

export const revalidate = 3600; // 1 hour

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: { type: string };
  searchParams: { page?: string };
}) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const type = params.type; // "trending", "movies", "tv"
  
  let results: any[] = [];
  let totalPages = 1;
  let title = "Explore";
  
  try {
    if (type === "trending") {
      title = "Trending Now";
      const data = await fetchTrending("day", page);
      results = data.results.map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        posterPath: m.poster_path,
        rating: m.vote_average,
        year: (m.release_date || m.first_air_date || "").substring(0, 4),
        mediaType: m.media_type || "movie",
      }));
      totalPages = data.total_pages;
    } else if (type === "movies") {
      title = "Popular Movies";
      const data = await fetchPopularMovies(page);
      results = data.results.map((m: any) => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        rating: m.vote_average,
        year: (m.release_date || "").substring(0, 4),
        mediaType: "movie",
      }));
      totalPages = data.total_pages;
    } else if (type === "tv") {
      title = "Top Rated TV Shows";
      const data = await fetchTopRatedTV(page);
      results = data.results.map((t: any) => ({
        id: t.id,
        title: t.name,
        posterPath: t.poster_path,
        rating: t.vote_average,
        year: (t.first_air_date || "").substring(0, 4),
        mediaType: "tv",
      }));
      totalPages = data.total_pages;
    }
  } catch (error) {
    console.error("Failed to fetch explore data:", error);
  }

  // Ensure totalPages doesn't exceed 500 (TMDB api limit usually)
  totalPages = Math.min(totalPages, 500);

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <div className="text-sm font-medium text-silver-dark bg-white/5 px-3 py-1 rounded-full border border-white/10">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Grid */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">No results found</h2>
            <p className="text-silver-dark">Try exploring a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {results.map((item) => (
              <Link key={item.id} href={`/${item.mediaType}/${item.id}`} className="w-full">
                <MediaCard
                  id={item.id}
                  title={item.title}
                  posterPath={item.posterPath}
                  rating={item.rating}
                  year={item.year}
                  mediaType={item.mediaType}
                  className="w-full"
                />
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-4">
            <Link
              href={`/explore/${type}?page=${Math.max(1, page - 1)}`}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all ${
                page <= 1
                  ? "pointer-events-none opacity-30 bg-white/5 text-silver-dark"
                  : "bg-gold/10 text-gold hover:bg-gold hover:text-black shadow-inner-gold hover:shadow-gold-sm border border-gold/20 hover:border-gold"
              }`}
            >
              <ChevronLeft size={18} /> Prev
            </Link>
            
            <div className="flex h-10 min-w-[2.5rem] px-2 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-sm font-bold text-white">
              {page}
            </div>
            
            <Link
              href={`/explore/${type}?page=${Math.min(totalPages, page + 1)}`}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all ${
                page >= totalPages
                  ? "pointer-events-none opacity-30 bg-white/5 text-silver-dark"
                  : "bg-gold/10 text-gold hover:bg-gold hover:text-black shadow-inner-gold hover:shadow-gold-sm border border-gold/20 hover:border-gold"
              }`}
            >
              Next <ChevronRight size={18} />
            </Link>
          </div>
        )}
        
      </div>
    </div>
  );
}
