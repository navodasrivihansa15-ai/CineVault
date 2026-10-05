import Image from "next/image";
import Link from "next/link";
import { fetchTVDetails, backdropUrl, posterUrl } from "@/lib/tmdb";
import MediaActions from "@/components/MediaActions";
import SeasonSelector from "@/components/SeasonSelector";
import StreamPlayer from "@/components/StreamPlayer";
import BackButton from "@/components/BackButton";
import TrailerSection from "@/components/TrailerSection";
import { Star, Tv as TvIcon, Calendar } from "lucide-react";

export default async function TVDetailsPage({ 
  params,
  searchParams,
}: { 
  params: { id: string },
  searchParams: { s?: string, e?: string }
}) {
  const season = Number(searchParams.s) || 1;
  const episode = Number(searchParams.e) || 1;

  const tv = await fetchTVDetails(Number(params.id));
  
  // Cast added properties from append_to_response
  const credits = (tv as any).credits;
  const videos = (tv as any).videos?.results?.filter((v: any) => v.site === "YouTube" && v.type === "Trailer") || [];
  const cast = credits?.cast?.slice(0, 10) || [];
  const crew = credits?.crew || [];
  const directors = crew.filter((c: any) => c.job === "Director");
  const writers = crew.filter((c: any) => ["Screenplay", "Writer", "Story", "Writing"].includes(c.job));
  
  // For TV shows, creators are often listed separately
  if ((tv as any).created_by) {
    (tv as any).created_by.forEach((creator: any) => {
      if (!writers.find((w: any) => w.id === creator.id)) {
        writers.push({ ...creator, job: "Creator" });
      }
    });
  }
  
  const uniqueWriters = Array.from(new Map(writers.map((w: any) => [w.id, w])).values());

  const releaseYear = tv.first_air_date ? Number(tv.first_air_date.substring(0, 4)) : 0;
  const genreIds = tv.genres.map(g => g.id);

  return (
    <div className="flex flex-col min-h-screen bg-oled pb-20">
      <BackButton />
      {/* Parallax Header */}
      <section className="relative h-[40vh] md:h-[70vh] min-h-[300px] md:min-h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 fixed-bg pointer-events-none">
          {tv.backdrop_path ? (
            <Image
              src={backdropUrl(tv.backdrop_path, "original")!}
              alt={tv.name}
              fill
              priority
              className="object-cover object-top opacity-50"
              style={{ objectPosition: "50% 20%" }}
            />
          ) : (
            <div className="h-full w-full bg-navy-light opacity-50" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-oled/50 to-transparent" />
      </section>

      {/* Content Section Overlay */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 lg:px-16 relative z-10 -mt-16 md:-mt-32">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          
          {/* Mobile Top Row: Poster + Title/Meta */}
          <div className="flex flex-row gap-4 md:block items-end md:items-start">
            {/* Poster */}
            <div className="w-28 h-40 sm:w-32 sm:h-48 md:w-64 md:h-96 rounded-lg shadow-2xl border border-white/10 z-20 flex-shrink-0 overflow-hidden relative bg-navy">
              {tv.poster_path ? (
                <Image
                  src={posterUrl(tv.poster_path, "w500")!}
                  alt={tv.name}
                  fill
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-navy" />
              )}
            </div>

            {/* Mobile Title & Meta (Hidden on Desktop) */}
            <div className="flex-1 animate-fade-up md:hidden pb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                {tv.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-medium text-silver-light">
                <div className="flex items-center gap-1 rounded-lg border border-gold/20 bg-gold/[0.08] px-2 py-0.5">
                  <Star className="w-3 h-3 fill-gold text-gold" />
                  <span className="text-gold">{tv.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-silver-dark">
                  <Calendar className="w-3 h-3" />
                  <span>{releaseYear}</span>
                </div>
                <div className="flex items-center gap-1 text-silver-dark">
                  <TvIcon className="w-3 h-3" />
                  <span>{tv.number_of_seasons} S</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Container */}
          <div className="flex-1 animate-fade-up md:pt-10">
            {/* Desktop Title & Meta (Hidden on Mobile) */}
            <div className="hidden md:block mb-6">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
                {tv.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-silver-light">
                <div className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/[0.08] px-2.5 py-1">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="text-gold">{tv.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-silver-dark">
                  <Calendar className="w-4 h-4" />
                  <span>{tv.first_air_date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-silver-dark">
                  <TvIcon className="w-4 h-4" />
                  <span>{tv.number_of_seasons} Seasons</span>
                </div>
                <div className="flex items-center gap-1.5 text-silver-dark px-2 py-0.5 rounded border border-white/10 text-xs">
                  <span>{tv.status}</span>
                </div>
              </div>
            </div>

            <p className="max-w-3xl text-xs md:text-base leading-relaxed text-silver mb-4 md:mb-6 line-clamp-4 md:line-clamp-none">
              {tv.overview}
            </p>

            <div className="flex flex-col gap-2 mb-8 text-xs md:text-sm">
              {directors.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-silver-dark font-medium min-w-[80px]">Directed By</span>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {directors.map((d: any, i: number) => (
                      <span key={d.id} className="text-silver-light">
                        <Link href={`/person/${d.id}`} className="hover:text-gold transition-colors">
                          {d.name}
                        </Link>
                        {i < directors.length - 1 && ","}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {uniqueWriters.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-silver-dark font-medium min-w-[80px]">Written By</span>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {uniqueWriters.map((w: any, i: number) => (
                      <span key={w.id} className="text-silver-light">
                        <Link href={`/person/${w.id}`} className="hover:text-gold transition-colors">
                          {w.name}
                        </Link>
                        {i < uniqueWriters.length - 1 && ","}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <MediaActions
              mediaId={tv.id}
              mediaType="tv"
              title={tv.name}
              posterPath={tv.poster_path}
              backdropPath={tv.backdrop_path}
              releaseYear={releaseYear}
              genreIds={genreIds}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 lg:px-16 space-y-8 md:space-y-16 mt-4 md:mt-8">
        
        {/* Cast Section */}
        {cast.length > 0 && (
          <section>
            <h2 className="section-heading mb-4 md:mb-6">Top Cast</h2>
            <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-4">
              {cast.map((actor: any) => (
                <Link key={actor.id} href={`/person/${actor.id}`} className="w-20 md:w-32 flex-shrink-0 block group cursor-pointer">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/5 bg-navy-light mb-2 md:mb-3 relative transition-all duration-300 group-hover:border-gold/30 group-hover:shadow-gold-sm">
                    {actor.profile_path ? (
                      <Image
                        src={posterUrl(actor.profile_path, "w185")!}
                        alt={actor.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] md:text-xs text-silver-dark group-hover:text-gold transition-colors">No Image</div>
                    )}
                  </div>
                  <p className="text-[10px] md:text-sm font-medium text-silver-light truncate group-hover:text-gold transition-colors">{actor.name}</p>
                  <p className="text-[10px] md:text-xs text-silver-dark truncate">{actor.character}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trailers Section */}
        <TrailerSection videos={videos} />

        {/* Stream Player */}
        <section>
          <h2 className="section-heading mb-6">Watch Now</h2>
          <StreamPlayer tmdbId={tv.id} mediaType="tv" season={season} episode={episode} />
        </section>
        
        {/* Seasons & Episodes */}
        {tv.seasons && tv.seasons.length > 0 && (
          <SeasonSelector seasons={tv.seasons} currentSeason={season} />
        )}

      </div>
    </div>
  );
}
