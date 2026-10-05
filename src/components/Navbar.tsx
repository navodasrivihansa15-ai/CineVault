"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  LogOut,
  Menu,
  X,
  Film,
  Crown,
  ChevronDown,
  Search,
  MessageSquare,
  Home,
  Compass,
  User
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import UserAvatar from "@/components/UserAvatar";
import SearchBar from "@/components/SearchBar";
import { LANGUAGES } from "@/lib/languages";

/* ──────────────────────────────────────────────────────────
   Universal Command Center Navbar
   ────────────────────────────────────────────────────────── */

const MEDIA_TYPES = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
];

const GENRES = [
  { value: "", label: "All Genres" },
  { value: "28", label: "Action" },
  { value: "12", label: "Adventure" },
  { value: "16", label: "Animation" },
  { value: "35", label: "Comedy" },
  { value: "80", label: "Crime" },
  { value: "99", label: "Documentary" },
  { value: "18", label: "Drama" },
  { value: "10751", label: "Family" },
  { value: "14", label: "Fantasy" },
  { value: "36", label: "History" },
  { value: "27", label: "Horror" },
  { value: "10402", label: "Music" },
  { value: "9648", label: "Mystery" },
  { value: "10749", label: "Romance" },
  { value: "878", label: "Science Fiction" },
  { value: "10770", label: "TV Movie" },
  { value: "53", label: "Thriller" },
  { value: "10752", label: "War" },
  { value: "37", label: "Western" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => currentYear - i);

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{username: string, avatar_url: string} | null>(null);
  
  const [genreSearch, setGenreSearch] = useState("");
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const genreRef = useRef<HTMLDivElement>(null);
  
  const [languageSearch, setLanguageSearch] = useState("");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setIsGenreDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter State
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [lang, setLang] = useState(searchParams.get("lang") || "");

  // Update URL on filter change
  const handleFilterChange = (key: string, value: string) => {
    let newType = type;
    let newGenre = genre;
    let newYear = year;
    let newLang = lang;

    if (key === "type") { newType = value; setType(value); }
    if (key === "genre") { newGenre = value; setGenre(value); }
    if (key === "year") { newYear = value; setYear(value); }
    if (key === "lang") { newLang = value; setLang(value); }

    const params = new URLSearchParams();
    if (newType) params.set("type", newType);
    if (newGenre) params.set("genre", newGenre);
    if (newYear) params.set("year", newYear);
    if (newLang) params.set("lang", newLang);

    router.push(`/explore?${params.toString()}`);
  };

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single();
        if (data && !error) {
          setProfile(data);
        }
      } catch {
        // Ignored
      }
    };
    
    fetchProfile();
    
    const handleProfileUpdated = () => fetchProfile();
    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOpenAuth = () => setAuthModalOpen(true);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuth);
  }, []);

  // Global Suspension Guard & Heartbeat
  useEffect(() => {
    if (!user) return;
    
    // 1. Initial Load Suspension Check & Heartbeat
    const checkSuspensionAndHeartbeat = async () => {
      try {
        // Fetch profile to check suspension status
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_suspended")
          .eq("id", user.id)
          .single();
          
        if (profile?.is_suspended === true) {
          await supabase.auth.signOut();
          alert("Your account has been suspended by an Administrator. You have been logged out.");
          window.location.href = '/';
          return;
        }

        // If not suspended, send heartbeat
        const { error } = await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", user.id);
          
        if (error) {
          console.error("Heartbeat failed:", error);
        } else {
          console.log("Heartbeat successfully sent at", new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Heartbeat exception:", err);
      }
    };
    
    // Run immediately on mount
    checkSuspensionAndHeartbeat();
    
    // Ping every 3 minutes (180000 ms)
    const interval = setInterval(checkSuspensionAndHeartbeat, 180000);

    // 2. Instant Realtime Kick-Out
    const guardChannel = supabase.channel('suspension_guard')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${user.id}` 
      }, async (payload) => {
        if (payload.new.is_suspended === true) {
          await supabase.auth.signOut();
          alert("Your account has been suspended by an Administrator. You are being logged out immediately.");
          window.location.href = '/';
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(guardChannel);
    };
  }, [user]);

  const handleNavigate = (mediaType: "movie" | "tv" | "person", id: number) => {
    router.push(`/${mediaType}/${id}`);
    setMobileOpen(false);
  };

  const isAdmin = user?.email === "navodasrivihansa15@gmail.com";

  return (
    <>
      <header
        className="fixed top-0 w-full z-50 h-14 md:h-24 bg-[#0B0C10]/40 backdrop-blur-2xl border-b border-[#D4AF37]/20 shadow-lg transition-all duration-300"
      >
        <nav className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* ── Brand (Left) ──────────────────────── */}
          <Link href="/" className="group flex items-center gap-3 mr-4 shrink-0">
            <div className="relative flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-xl bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/20 transition-all group-hover:bg-[#D4AF37]/20 group-hover:ring-[#D4AF37]/40">
              <Film size={18} className="text-[#D4AF37] transition-transform duration-300 group-hover:scale-110 md:hidden" />
              <Film size={26} className="text-[#D4AF37] transition-transform duration-300 group-hover:scale-110 hidden md:block" />
            </div>
            <span className="text-2xl font-bold tracking-tight hidden lg:block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Cine</span>
              <span className="text-gray-300">Vault</span>
            </span>
          </Link>

          {/* ── Universal Filter Bar (Center) ─────── */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-4 max-w-4xl">
            {/* Type */}
            <div className="relative flex-1">
              <select
                value={type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-10 text-lg font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
              >
                {MEDIA_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
            </div>

            {/* Genre */}
            <div className="relative flex-1" ref={genreRef}>
              <button
                type="button"
                onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-3 text-lg font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
              >
                <span className="truncate">{GENRES.find((g) => g.value === genre)?.label || "All Genres"}</span>
                <ChevronDown size={18} className="text-[#D4AF37] shrink-0 ml-2" />
              </button>

              {isGenreDropdownOpen && (
                <div className="absolute top-full mt-2 w-full min-w-[200px] z-50 rounded-xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur-xl shadow-lg overflow-hidden flex flex-col max-h-[300px]">
                  <div className="p-2 border-b border-[#D4AF37]/50 sticky top-0 bg-[#0B0C10]/95 flex items-center gap-2">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search genre..."
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {GENRES.filter((g) => g.label.toLowerCase().includes(genreSearch.toLowerCase())).map((g) => (
                      <button
                        key={g.value}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${genre === g.value ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                        onClick={() => {
                          handleFilterChange("genre", g.value);
                          setIsGenreDropdownOpen(false);
                          setGenreSearch("");
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                    {GENRES.filter((g) => g.label.toLowerCase().includes(genreSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">No genres found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Year */}
            <div className="relative flex-1">
              <select
                value={year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-10 text-lg font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
              >
                <option value="">Any Year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
            </div>

            {/* Language */}
            <div className="relative flex-1" ref={langRef}>
              <button
                type="button"
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-3 text-lg font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
              >
                <span className="truncate">{LANGUAGES.find((l) => l.code === lang)?.name || "All Languages"}</span>
                <ChevronDown size={18} className="text-[#D4AF37] shrink-0 ml-2" />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute top-full mt-2 w-full min-w-[200px] z-50 rounded-xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur-xl shadow-lg overflow-hidden flex flex-col max-h-[300px]">
                  <div className="p-2 border-b border-[#D4AF37]/50 sticky top-0 bg-[#0B0C10]/95 flex items-center gap-2">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search language..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {LANGUAGES.filter((l) => l.name.toLowerCase().includes(languageSearch.toLowerCase())).map((l) => (
                      <button
                        key={l.code}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${lang === l.code ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                        onClick={() => {
                          handleFilterChange("lang", l.code);
                          setIsLanguageDropdownOpen(false);
                          setLanguageSearch("");
                        }}
                      >
                        {l.name}
                      </button>
                    ))}
                    {LANGUAGES.filter((l) => l.name.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">No languages found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Auth & Search (Right) ─────────────── */}
          <div className="flex items-center justify-end gap-2 md:gap-5 shrink-0 ml-6">
            <div className="hidden lg:block w-64">
              <SearchBar />
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  href="/chat" 
                  className="hidden md:flex text-gray-400 hover:text-[#D4AF37] transition-colors p-2 rounded-full hover:bg-[#D4AF37]/10"
                  title="Chat Hub"
                >
                  <MessageSquare size={22} />
                </Link>
                <Link href="/profile" className="relative group">
                  <UserAvatar
                    src={profile?.avatar_url || null}
                    alt={profile?.username || "Profile"}
                    className="h-8 w-8 md:h-12 md:w-12 rounded-full border-2 border-white/10 group-hover:border-[#D4AF37] transition-colors"
                  />
                  {isAdmin && (
                    <div className="absolute -bottom-1 -right-1 bg-[#0B0C10] rounded-full p-[3px] border border-[#D4AF37] hidden md:block">
                      <Crown size={14} className="text-[#D4AF37] fill-[#D4AF37]" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to log out?")) {
                      signOut();
                    }
                  }}
                  className="hidden md:block text-gray-400 hover:text-[#D4AF37] transition-colors p-2"
                  title="Log Out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden md:block text-gray-400 hover:text-[#D4AF37] transition-colors p-1"
                title="Log In"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out -rotate-90 transition-transform duration-300"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              </button>
            )}

            {/* Mobile Menu Toggle (Hidden in app-like mode) */}
            <button
              className="hidden text-gray-400 hover:text-[#D4AF37] transition-colors shrink-0 ml-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Navigation Drawer ──────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0B0C10]/95 backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between p-6">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Cine</span>
              <span className="text-gray-300">Vault</span>
            </span>
            <button
              className="text-gray-400 hover:text-[#D4AF37] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <X size={28} />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-6">
            <SearchBar onResultClick={(res) => handleNavigate(res.media_type, res.id)} />
            
            {/* Mobile Filters */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Filters</span>
              
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-3 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none focus:border-[#D4AF37]"
                >
                  {MEDIA_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={genre}
                  onChange={(e) => handleFilterChange("genre", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-3 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none focus:border-[#D4AF37]"
                >
                  {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => handleFilterChange("year", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-3 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Any Year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => handleFilterChange("lang", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-3 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none focus:border-[#D4AF37]"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* ── Mobile Bottom Navigation ──────────────── */}
      <div className="fixed bottom-0 w-full z-50 bg-[#0B0C10]/80 backdrop-blur-xl border-t border-white/10 md:hidden pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-[#D4AF37]' : 'text-white/50 hover:text-white/80'}`}>
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/explore" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/explore') ? 'text-[#D4AF37]' : 'text-white/50 hover:text-white/80'}`}>
            <Compass size={22} />
            <span className="text-[10px] font-medium">Explore</span>
          </Link>
          <Link href="/search" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/search' ? 'text-[#D4AF37]' : 'text-white/50 hover:text-white/80'}`}>
            <Search size={22} />
            <span className="text-[10px] font-medium">Search</span>
          </Link>
          <Link href="/chat" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/chat' ? 'text-[#D4AF37]' : 'text-white/50 hover:text-white/80'}`}>
            <MessageSquare size={22} />
            <span className="text-[10px] font-medium">Chat</span>
          </Link>
          <Link href="/profile" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/profile' ? 'text-[#D4AF37]' : 'text-white/50 hover:text-white/80'}`}>
            <User size={22} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<div className="h-16 w-full fixed top-0 bg-[#0B0C10]/80 border-b border-[#D4AF37]/20 z-50"></div>}>
      <NavbarContent />
    </Suspense>
  );
}
