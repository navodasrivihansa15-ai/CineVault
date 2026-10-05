import { searchMediaFiltered } from "@/lib/tmdb";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertCircle, Search } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SearchFilters from "@/components/SearchFilters";

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; year?: string; lang?: string; page?: string };
}) {
  const query = searchParams.q || "";
  const type = searchParams.type || "all";
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

  try {
    const data = await searchMediaFiltered({
      query,
      type,
      year,
      lang,
      page,
    });
    
    // Filter out people from multi-search results
    const filteredResults = (data.results as TMDBResult[]).filter(
      (m) => m.media_type !== "person"
    );

    results = filteredResults.map((m) => ({
      id: m.id,
      title: m.title || m.name || "Unknown Title",
      posterPath: m.poster_path,
      rating: m.vote_average || 0,
      year: (m.release_date || m.first_air_date || "").substring(0, 4),
      mediaType: m.media_type || (type === "all" ? "movie" : type),
    }));
    totalPages = data.total_pages;
  } catch (error) {
    console.error("Failed to fetch search data:", error);
  }

  // Ensure totalPages doesn't exceed 500 (TMDB API limit usually)
  totalPages = Math.max(1, Math.min(totalPages, 500));

  // Pagination URL builder
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (year) params.set("year", year);
    if (lang) params.set("lang", lang);
    params.set("page", newPage.toString());
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-2 md:gap-4">
          <div className="flex items-start md:items-center gap-2 md:gap-3">
            <Search className="w-6 h-6 md:w-7 md:h-7 text-[#D4AF37] mt-1 md:mt-0 shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2 leading-tight">
                Search Results for <span className="text-[#D4AF37]">"{query}"</span>
              </h1>
              <div className="text-xs md:text-sm text-white/60">
                Page {page} of {totalPages}
              </div>
            </div>
          </div>
        </div>

        {/* Local Filters */}
        <SearchFilters />

        {/* Grid or Fallback */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-[#0B0C10] rounded-2xl border border-white/5 shadow-lg">
            <AlertCircle size={48} className="text-[#D4AF37] mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-2">No matches found</h2>
            <p className="text-gray-400 max-w-md">
              We couldn&apos;t find anything matching &quot;{query}&quot; with your current filters. Try adjusting your search or changing the media type.
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
