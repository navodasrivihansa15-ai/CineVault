import { Metadata } from "next";
import StreamPlayer from "@/components/StreamPlayer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchMovieDetails } from "@/lib/tmdb";
import { notFound } from "next/navigation";

import PlayerInstructions from "@/components/PlayerInstructions";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const movie = await fetchMovieDetails(Number(params.id));
  if (!movie) return { title: "Not Found" };
  
  return {
    title: `Watch ${movie.title} - CineVault Premium`,
    description: `Stream ${movie.title} on CineVault.`,
  };
}

export default async function MoviePlayPage({ params, searchParams }: { params: { id: string }, searchParams: { server?: string } }) {
  const { id } = params;
  const movie = await fetchMovieDetails(Number(id));

  if (!movie) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-oled text-silver flex flex-col pt-24 pb-12">
      {/* Title & Back Button Container (Keeps padding) */}
      <div className="w-full max-w-[100vw] lg:max-w-6xl xl:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mb-6 flex flex-col gap-2">
        <Link href={`/movie/${id}`} className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors w-fit font-medium">
          <ArrowLeft size={18} />
          Back to Details
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Watching <span className="text-gold">{movie.title}</span>
        </h1>
      </div>
      
      {/* Cinematic Player Container */}
      <div className="w-full max-w-[1400px] mx-auto px-0 md:px-8 lg:px-12">
        <PlayerInstructions />
        <StreamPlayer 
          tmdbId={id} 
          mediaType="movie" 
        />
      </div>
    </div>
  );
}
