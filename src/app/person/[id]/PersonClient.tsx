"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBPersonDetails } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import BackButton from "@/components/BackButton";
import { Clapperboard, MonitorPlay, LayoutGrid } from "lucide-react";

export default function PersonClient({ person }: { person: TMDBPersonDetails }) {
  const [roleFilter, setRoleFilter] = useState<"all" | "acting" | "directing" | "writing">("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv">("all");
  const [showFullBio, setShowFullBio] = useState(false);

  const filteredCredits = useMemo(() => {
    if (!person.combined_credits) return [];
    
    const { cast = [], crew = [] } = person.combined_credits;

    // 1. Acting
    const acting = cast;
    
    // 2. Directing
    const directing = crew.filter(c => 
      c.department === "Directing" || c.job === "Director"
    );
    
    // 3. Writing
    const writing = crew.filter(c => 
      c.department === "Writing" || 
      ["Screenplay", "Writer", "Story", "Teleplay", "Characters", "Author", "Novel", "Adaptation", "Scenario"].includes(c.job || "")
    );

    let baseCredits: any[] = [];
    
    if (roleFilter === "acting") baseCredits = acting;
    else if (roleFilter === "directing") baseCredits = directing;
    else if (roleFilter === "writing") baseCredits = writing;
    else {
      baseCredits = [...acting, ...directing, ...writing];
    }

    // Apply Media Type filter
    if (mediaFilter !== "all") {
      baseCredits = baseCredits.filter(c => c.media_type === mediaFilter);
    }

    // Robust Deduplication: A person might be a Director and Writer on the same movie
    const uniqueCredits = Array.from(
      new Map(baseCredits.map((item) => [item.id, item])).values()
    );

    // Sort by popularity descending (fallback to vote_count)
    return uniqueCredits.sort((a, b) => {
      const popA = a.popularity || 0;
      const popB = b.popularity || 0;
      if (popA !== popB) return popB - popA;
      return (b.vote_count || 0) - (a.vote_count || 0);
    });
  }, [person.combined_credits, roleFilter, mediaFilter]);

  // Determine best backdrop for the cinematic hero section
  const bestBackdrop = person.profile_path || person.combined_credits?.cast?.[0]?.backdrop_path;

  return (
    <div className="relative w-full min-h-screen -mt-14 md:-mt-20 overflow-hidden bg-oled pb-20">
      
      {/* Blurred Full-Screen Backdrop */}
      {bestBackdrop && (
        <div className="absolute inset-0 w-full h-[60vh] md:h-[80vh] pointer-events-none z-0">
          <Image
            src={posterUrl(bestBackdrop, "original") || ""}
            alt="Backdrop"
            fill
            className="object-cover blur-[100px] opacity-30 scale-125"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-oled via-oled/60 to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 pt-20 md:pt-32">
        <BackButton />
        
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 flex flex-col md:flex-row gap-6 md:gap-8 items-start mt-6 md:mt-8">
          
          {/* Profile Image & Mobile Name Row */}
          <div className="flex flex-row gap-4 md:block items-end md:items-start w-full md:w-auto">
            {/* Profile Image */}
            <div className="w-32 sm:w-40 md:w-56 aspect-[2/3] md:h-auto md:sticky md:top-32 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-cinematic z-20 relative bg-navy">
              {person.profile_path ? (
                <Image
                  src={posterUrl(person.profile_path, "h632")!}
                  alt={person.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-silver-dark text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Mobile Name (Hidden on Desktop) */}
            <div className="flex-1 animate-fade-up md:hidden pb-1">
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                {person.name}
              </h1>
              <div className="text-sm font-medium text-silver-light">
                {person.known_for_department}
              </div>
            </div>
          </div>

          {/* Info Container */}
          <div className="flex-1 animate-fade-up w-full">
            {/* Desktop Name (Hidden on Mobile) */}
            <h1 className="hidden md:block text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-4">
              {person.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-silver-light mb-6 border-b border-white/10 pb-4 md:pb-6">
              {person.birthday && (
                <div>
                  <span className="text-silver-dark block text-xs uppercase tracking-wider mb-1">Born</span>
                  <span>{person.birthday}</span>
                </div>
              )}
              {person.place_of_birth && (
                <div>
                  <span className="text-silver-dark block text-xs uppercase tracking-wider mb-1">Place of Birth</span>
                  <span>{person.place_of_birth}</span>
                </div>
              )}
              <div>
                <span className="text-silver-dark block text-xs uppercase tracking-wider mb-1">Known For</span>
                <span>{person.known_for_department}</span>
              </div>
            </div>

            <div className="max-w-4xl mt-2">
              <div className={`relative ${!showFullBio ? "overflow-hidden max-h-32" : ""}`}>
                <div className="text-sm leading-relaxed text-silver whitespace-pre-wrap transition-all duration-300">
                  {person.biography || "No biography available."}
                </div>
                {!showFullBio && person.biography && person.biography.length > 250 && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0B0C10] to-transparent pointer-events-none" />
                )}
              </div>
              {person.biography && person.biography.length > 250 && (
                <button 
                  onClick={() => setShowFullBio(!showFullBio)}
                  className="mt-2 text-gold hover:text-white text-sm font-semibold transition-colors relative z-10"
                >
                  {showFullBio ? "Show Less" : "Read More"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Filter Section */}
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16 mt-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/10 pb-6">
          <h2 className="text-2xl font-bold text-white border-l-4 border-gold pl-4">Filmography</h2>
          
          <div className="flex flex-wrap gap-4">
            {/* Role Filter */}
            <div className="flex bg-[#0B0C10] border border-white/10 rounded-xl overflow-hidden p-1 shadow-sm">
              {(["all", "acting", "directing", "writing"] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                    roleFilter === role ? "bg-gold text-oled shadow-md" : "text-silver hover:text-white"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Media Type Filter */}
            <div className="flex bg-[#0B0C10] border border-white/10 rounded-xl overflow-hidden p-1 shadow-sm">
              {(["all", "movie", "tv"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setMediaFilter(type)}
                  className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                    mediaFilter === type ? "bg-gold text-oled shadow-md" : "text-silver hover:text-white"
                  }`}
                >
                  {type === "all" && <LayoutGrid size={14} />}
                  {type === "movie" && <Clapperboard size={14} />}
                  {type === "tv" && <MonitorPlay size={14} />}
                  {type === "all" ? "All" : type === "movie" ? "Movies" : "TV"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16">
        {filteredCredits.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {filteredCredits.map((item) => {
              if (!item.poster_path) return null;
              const releaseYear = item.release_date 
                ? item.release_date.substring(0, 4) 
                : item.first_air_date 
                  ? item.first_air_date.substring(0, 4) 
                  : "";

              return (
                <Link key={`${item.media_type}-${item.id}`} href={`/${item.media_type}/${item.id}`} className="animate-fade-up block">
                  <MediaCard
                    id={item.id}
                    title={item.title || item.name || "Unknown"}
                    posterPath={item.poster_path}
                    rating={item.vote_average || 0}
                    year={releaseYear}
                    mediaType={item.media_type as "movie" | "tv"}
                    className="w-full h-full"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[#0B0C10] rounded-2xl border border-white/5 shadow-inner">
            <h2 className="text-2xl font-bold text-white mb-2">No credits found</h2>
            <p className="text-silver max-w-md">
              There are no matching credits for the selected role and media type combination.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
