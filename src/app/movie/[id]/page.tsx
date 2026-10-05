import Image from "next/image";
import Link from "next/link";
import { fetchMovieDetails, backdropUrl, posterUrl } from "@/lib/tmdb";
import MediaActions from "@/components/MediaActions";
import StreamPlayer from "@/components/StreamPlayer";
import BackButton from "@/components/BackButton";
import TrailerSection from "@/components/TrailerSection";
import { Star, Clock, Calendar, Play } from "lucide-react";

export default async function MovieDetailsPage({ params }: { params: { id: string } }) {
  const movie = await fetchMovieDetails(Number(params.id));
  
  // Cast added properties from append_to_response
  const credits = (movie as any).credits;
  const videos = (movie as any).videos?.results?.filter((v: any) => v.site === "YouTube" && v.type === "Trailer") || [];
  const cast = credits?.cast?.slice(0, 10) || [];
  const crew = credits?.crew || [];
  const directors = crew.filter((c: any) => c.job === "Director");
  const writers = crew.filter((c: any) => ["Screenplay", "Writer", "Story", "Writing"].includes(c.job));
  const uniqueWriters = Array.from(new Map(writers.map((w: any) => [w.id, w])).values());

  const releaseYear = movie.release_date ? Number(movie.release_date.substring(0, 4)) : 0;
  const genreIds = movie.genres.map(g => g.id);

  return (
    <div className="flex flex-col min-h-screen bg-oled pb-20">
      <BackButton />
      {/* Parallax Header */}
      <section className="relative h-[40vh] md:h-[70vh] min-h-[300px] md:min-h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 fixed-bg pointer-events-none">
          {movie.backdrop_path ? (
            <Image
              src={backdropUrl(movie.backdrop_path, "original")!}
              alt={movie.title}
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
              {movie.poster_path ? (
                <Image
                  src={posterUrl(movie.poster_path, "w500")!}
                  alt={movie.title}
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
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-medium text-silver-light">
                <div className="flex items-center gap-1 rounded-lg border border-gold/20 bg-gold/[0.08] px-2 py-0.5">
                  <Star className="w-3 h-3 fill-gold text-gold" />
                  <span className="text-gold">{movie.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-silver-dark">
                  <Calendar className="w-3 h-3" />
                  <span>{releaseYear}</span>
                </div>
                {movie.runtime ? (
                  <div className="flex items-center gap-1 text-silver-dark">
                    <Clock className="w-3 h-3" />
                    <span>{movie.runtime}m</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Info Container */}
          <div className="flex-1 animate-fade-up md:pt-10">
            {/* Desktop Title & Meta (Hidden on Mobile) */}
            <div className="hidden md:block mb-6">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-silver-light">
                <div className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/[0.08] px-2.5 py-1">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="text-gold">{movie.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-silver-dark">
                  <Calendar className="w-4 h-4" />
                  <span>{movie.release_date}</span>
                </div>
                {movie.runtime ? (
                  <div className="flex items-center gap-1.5 text-silver-dark">
                    <Clock className="w-4 h-4" />
                    <span>{movie.runtime} min</span>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="max-w-3xl text-xs md:text-base leading-relaxed text-silver mb-4 md:mb-6 line-clamp-4 md:line-clamp-none">
              {movie.overview}
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
              mediaId={movie.id}
              mediaType="movie"
              title={movie.title}
              posterPath={movie.poster_path}
              backdropPath={movie.backdrop_path}
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
          <StreamPlayer tmdbId={movie.id} mediaType="movie" />
        </section>
        
      </div>
    </div>
  );
}
