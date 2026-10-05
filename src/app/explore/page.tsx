import { discoverMedia } from "@/lib/tmdb";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import MediaCard from "@/components/MediaCard";

export const revalidate = 3600; // 1 hour

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { type?: string; genre?: string; year?: string; lang?: string; page?: string };
}) {
  const type = searchParams.type || "all";
  const genre = searchParams.genre;
  const year = searchParams.year;
  const lang = searchParams.lang;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  let results: {
    id: number;
    title: string;
    posterPath: string | null;
    rating: number;
    year: string;
    mediaType: string;
  }[] = [];
  let totalPages = 1;
  let title = "Explore All";
  
  if (type === 'movie') title = "Discover Movies";
  else if (type === 'tv') title = "Discover TV Shows";
  else if (type === 'trending') title = "Trending Now";

  try {
    const data = await discoverMedia({
      type,
      genre,
      year,
      lang,
      page,
    });
    
    results = (data.results as TMDBResult[]).map((m) => ({
      id: m.id,
      title: m.title || m.name || "Unknown Title",
      posterPath: m.poster_path,
      rating: m.vote_average || 0,
      year: (m.release_date || m.first_air_date || "").substring(0, 4),
      mediaType: m.media_type || (type === "all" ? "movie" : type),
    }));
    totalPages = data.total_pages;
  } catch (error) {
    console.error("Failed to fetch discover data:", error);
  }

  // Ensure totalPages doesn't exceed 500 (TMDB API limit usually)
  totalPages = Math.min(totalPages, 500);

  // Pagination URL builder
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (genre) params.set("genre", genre);
    if (year) params.set("year", year);
    if (lang) params.set("lang", lang);
    params.set("page", newPage.toString());
    return `/explore?${params.toString()}`;
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <div className="text-sm font-medium text-[#D4AF37] bg-[#D4AF37]/10 px-4 py-1.5 rounded-full border border-[#D4AF37]/20 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Grid or Fallback */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-[#0B0C10] rounded-2xl border border-white/5">
            <AlertCircle size={48} className="text-[#D4AF37] mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-2">No titles found</h2>
            <p className="text-gray-400 max-w-md">
              We couldn&apos;t find anything matching your exact criteria. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {results.map((item) => (
                <Link key={item.id} href={`/${item.mediaType}/${item.id}`} className="w-full">
                  <MediaCard
                    id={item.id}
                    title={item.title}
                    posterPath={item.posterPath}
                    rating={item.rating}
                    year={item.year}
                    mediaType={item.mediaType as "movie" | "tv"}
                    className="w-full"
                  />
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                {page > 1 ? (
                  <Link
                    href={buildPageUrl(page - 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#0B0C10] text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all shadow-lg"
                  >
                    <ChevronLeft size={18} />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/5 bg-[#0B0C10]/50 text-gray-600 cursor-not-allowed">
                    <ChevronLeft size={18} />
                    <span>Previous</span>
                  </div>
                )}
                
                <span className="text-sm font-medium text-gray-400 px-2">
                  {page} / {totalPages}
                </span>
                
                {page < totalPages ? (
                  <Link
                    href={buildPageUrl(page + 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#0B0C10] text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all shadow-lg"
                  >
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/5 bg-[#0B0C10]/50 text-gray-600 cursor-not-allowed">
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
