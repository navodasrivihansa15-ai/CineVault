import { Metadata } from "next";
import StreamPlayer from "@/components/StreamPlayer";
import PlayerInstructions from "@/components/PlayerInstructions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchTVDetails } from "@/lib/tmdb";
import { notFound } from "next/navigation";

export async function generateMetadata({ params, searchParams }: { params: { id: string }, searchParams: { season?: string, episode?: string } }): Promise<Metadata> {
  const tv = await fetchTVDetails(Number(params.id));
  if (!tv) return { title: "Not Found" };
  
  const season = searchParams.season || "1";
  const episode = searchParams.episode || "1";

  return {
    title: `Watch ${tv.name} S${season} E${episode} - CineVault Premium`,
    description: `Stream ${tv.name} on CineVault.`,
  };
}

export default async function TvPlayPage({ params, searchParams }: { params: { id: string }, searchParams: { server?: string, season?: string, episode?: string } }) {
  const { id } = params;
  const tv = await fetchTVDetails(Number(id));

  if (!tv) {
    notFound();
  }

  const season = Number(searchParams.season) || 1;
  const episode = Number(searchParams.episode) || 1;

  return (
    <div className="min-h-screen bg-oled text-silver flex flex-col pt-24 pb-12">
      {/* Title & Back Button Container (Keeps padding) */}
      <div className="w-full max-w-[100vw] lg:max-w-6xl xl:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mb-6 flex flex-col gap-2">
        <Link href={`/tv/${id}`} className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors w-fit font-medium">
          <ArrowLeft size={18} />
          Back to Details
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Watching <span className="text-gold">{tv.name}</span>
          <span className="text-silver-dark ml-3 text-xl md:text-2xl font-semibold">S{season} E{episode}</span>
        </h1>
      </div>
      
      {/* Cinematic Player Container */}
      <div className="w-full max-w-[1400px] mx-auto px-0 md:px-8 lg:px-12 flex flex-col">
        <PlayerInstructions />
        
        <div className="w-full">
          <StreamPlayer 
            tmdbId={id} 
            mediaType="tv" 
            season={season}
            episode={episode}
          />
        </div>
      </div>
    </div>
  );
}
