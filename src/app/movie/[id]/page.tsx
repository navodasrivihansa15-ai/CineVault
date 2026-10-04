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
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-oled via-oled/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 sm:px-8 md:px-12 lg:px-16 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end">
          {/* Poster */}
          <div className="hidden md:block w-48 lg:w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-cinematic">
            {movie.poster_path ? (
              <Image
                src={posterUrl(movie.poster_path, "w500")!}
                alt={movie.title}
                width={300}
                height={450}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-navy" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 animate-fade-up">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-4">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-silver-light mb-6">
              <div className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/[0.08] px-2.5 py-1">
                <Star size={16} className="fill-gold text-gold" />
                <span className="text-gold">{movie.vote_average.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-silver-dark">
                <Calendar size={16} />
                <span>{movie.release_date}</span>
              </div>
              {movie.runtime ? (
                <div className="flex items-center gap-1.5 text-silver-dark">
                  <Clock size={16} />
                  <span>{movie.runtime} min</span>
                </div>
              ) : null}
            </div>

            <p className="max-w-3xl text-base leading-relaxed text-silver mb-6">
              {movie.overview}
            </p>

            <div className="flex flex-col gap-2 mb-8 text-sm">
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

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16 space-y-16 mt-8">
        
        {/* Trailers Section */}
        <TrailerSection videos={videos} />

        {/* Stream Player */}
        <section>
          <h2 className="section-heading mb-6">Watch Now</h2>
          <StreamPlayer tmdbId={movie.id} mediaType="movie" />
        </section>
        
        {/* Cast Section */}
        {cast.length > 0 && (
          <section>
            <h2 className="section-heading mb-6">Top Cast</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
              {cast.map((actor: any) => (
                <Link key={actor.id} href={`/person/${actor.id}`} className="w-32 flex-shrink-0 block group cursor-pointer">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/5 bg-navy-light mb-3 relative transition-all duration-300 group-hover:border-gold/30 group-hover:shadow-gold-sm">
                    {actor.profile_path ? (
                      <Image
                        src={posterUrl(actor.profile_path, "w185")!}
                        alt={actor.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-silver-dark group-hover:text-gold transition-colors">No Image</div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-silver-light truncate group-hover:text-gold transition-colors">{actor.name}</p>
                  <p className="text-xs text-silver-dark truncate">{actor.character}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
