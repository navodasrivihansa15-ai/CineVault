"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Heart, Archive, Trash2, Clapperboard, Star, Check, Camera, Loader2, Save, ShieldAlert, Crown, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { db, type WatchlistEntity, type WatchedMovieEntity } from "@/lib/db";
import { getFullImageUrl, removeFromWatchlist, moveToVault, removeFromVault } from "@/lib/sync";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";

export default function ProfilePage() {
  const { user, session } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>("settings");
  
  // Profile state
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistEntity[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  // Vault state
  const [vault, setVault] = useState<WatchedMovieEntity[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*, role")
            .eq("id", user.id)
            .single();
            
          const unifiedProfile = {
            ...profileData,
            email: user.email,
            full_name: profileData?.username || profileData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Unknown User",
            avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
            role: profileData?.role || "user"
          };
          
          setProfile(unifiedProfile);
          setUsername(unifiedProfile.full_name);
          setAvatarUrl(unifiedProfile.avatar_url);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  // Fetch Watchlist
  const fetchWatchlist = async () => {
    try {
      const items = await db.watchlist.orderBy("addedAt").reverse().toArray();
      setWatchlist(items);
    } catch (error) {
      console.error("Failed to fetch watchlist:", error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Fetch Vault
  const fetchVault = async () => {
    try {
      const items = await db.watchedMovies.orderBy("createdAt").reverse().toArray();
      setVault(items);
    } catch (error) {
      console.error("Failed to fetch vault:", error);
    } finally {
      setVaultLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "watchlist") fetchWatchlist();
    if (activeTab === "vault") fetchVault();
  }, [activeTab]);

  // Actions
  const getSupabaseFilePath = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
    return match ? match[1] : null;
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;
    try {
      setUploadingAvatar(true);
      const oldPath = getSupabaseFilePath(avatarUrl);
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
      
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (error) throw error;
      
      setAvatarUrl("");
      window.dispatchEvent(new Event("profile-updated"));
      alert("Profile picture removed");
    } catch (error: any) {
      alert("Error removing avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!user) return;
      
      setUploadingAvatar(true);

      const oldPath = getSupabaseFilePath(avatarUrl);
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert("Error uploading avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      alert("Profile updated successfully!");
      // Dispatch a custom event to notify Navbar to re-fetch
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      console.error("Failed to update profile", err);
      alert("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveFromWatchlist = async (e: React.MouseEvent, tmdbId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tmdbId) return;
    
    const success = await removeFromWatchlist(tmdbId);
    if (success) {
      fetchWatchlist();
    }
  };

  const handleMoveToVault = async (e: React.MouseEvent, item: WatchlistEntity) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await moveToVault(item);
    if (success) {
      fetchWatchlist();
    }
  };

  const handleRemoveFromVault = async (e: React.MouseEvent, tmdbId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tmdbId) return;
    
    const success = await removeFromVault(tmdbId);
    if (success) {
      fetchVault();
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oled pb-20">
        <div className="text-center animate-fade-up">
          <User size={48} className="mx-auto mb-4 text-gold/50" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign in Required</h2>
          <p className="text-silver-dark mb-6">Please sign in to access your profile hub.</p>
          <button 
            onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
            className="rounded-xl bg-gold-shimmer px-8 py-3 font-semibold text-oled transition-all hover:brightness-110 shadow-gold-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-oled pb-20 pt-24">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8 md:mb-12 animate-fade-up">
          <div className="flex flex-col items-center gap-3">
            <div className="relative inline-block">
              <div className="relative h-20 w-20 md:h-32 md:w-32 rounded-full border-2 border-[#D4AF37] shadow-2xl overflow-hidden bg-navy-light flex items-center justify-center shrink-0">
                <UserAvatar 
                  src={profile?.avatar_url || avatarUrl} 
                  className="object-cover w-full h-full" 
                  fallbackSize={40} 
                  fallbackClassName="text-silver-dark" 
                />
              </div>
              
              {profile?.role === 'founder' && (
                <div className="absolute bottom-0 right-0 bg-[#D4AF37] text-[#0B0C10] p-1.5 rounded-full shadow-xl border-2 border-[#0B0C10]" title="Founder">
                  <Crown className="w-4 h-4 fill-[#0B0C10]"/>
                </div>
              )}

              {profile?.role === 'admin' && (
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-xl border-2 border-[#0B0C10]" title="Admin">
                  <ShieldCheck className="w-4 h-4 fill-white/20"/>
                </div>
              )}
            </div>
            {(profile?.avatar_url || avatarUrl) && (
              <button 
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="flex items-center gap-1.5 text-xs font-semibold text-silver-dark hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white mb-1 md:mb-2">
              {profile?.full_name || username || "Loading..."}
            </h1>
            <p className="text-xs md:text-sm text-silver-dark font-medium">{profile?.email || "Your Personal Hub"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 md:flex md:flex-row md:overflow-x-auto scrollbar-hide gap-2 md:gap-4 border-b border-white/10 pb-4 mb-8 w-full">
          {(() => {
            const availableTabs = [
              { id: 'settings', label: 'Profile Settings', icon: User },
              { id: 'watchlist', label: 'My Watchlist', icon: Heart },
              { id: 'vault', label: 'The Vault', icon: Archive }
            ];
            
            if (profile?.role === 'admin' || profile?.role === 'founder') {
              availableTabs.push({ id: 'dashboard', label: 'Admin Dashboard', icon: ShieldAlert });
            }

            return availableTabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-2 p-3 md:px-5 md:py-2.5 bg-white/5 md:bg-transparent hover:bg-white/10 md:hover:bg-white/[0.04] border border-white/10 md:border-transparent rounded-xl transition-all text-center md:text-left whitespace-nowrap ${
                  activeTab === tab.id ? "bg-gold/20 md:bg-gold/10 text-gold border-gold/50 shadow-inner-gold" : "text-silver hover:text-white"
                }`}
              >
                <tab.icon className={`w-5 h-5 md:w-5 md:h-5 ${activeTab === tab.id ? 'text-gold' : 'text-[#D4AF37] md:text-current'}`} /> 
                <span className="text-xs md:text-base font-medium">{tab.label}</span>
              </button>
            ));
          })()}
        </div>

        {/* Content */}
        <div className="animate-fade-up">
          {activeTab === "settings" && (
            <div className="max-w-2xl bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
              
              {profileLoading ? (
                <div className="flex items-center gap-2 text-silver-dark">
                  <Loader2 size={16} className="animate-spin" /> Loading profile...
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-silver-light mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter a username..."
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-silver-dark outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-silver-light mb-2">
                      Avatar URL
                    </label>
                    <div className="flex flex-col gap-3">
                      <div className="relative flex-1">
                        <Camera size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-dark" />
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full rounded-xl border border-white/10 bg-black/50 pl-11 pr-4 py-3 text-white placeholder-silver-dark outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-silver-dark">Or upload a new image:</span>
                        <label className="cursor-pointer bg-gold/10 text-gold hover:bg-gold hover:text-black border border-gold/30 hover:border-gold px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-inner-gold hover:shadow-gold-sm">
                          {uploadingAvatar ? "Uploading..." : "Choose File"}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarUpload} 
                            disabled={uploadingAvatar}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                    {avatarUrl && (
                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-xs text-silver-dark uppercase tracking-wider font-semibold">Preview</span>
                        <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10 relative">
                          <Image src={avatarUrl} alt="Preview" fill className="object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed shadow-gold-md"
                    >
                      {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Save Profile
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "watchlist" && (
            <div>
              {watchlistLoading ? (
                <div className="text-gold animate-pulse text-sm font-medium py-8">Loading Watchlist...</div>
              ) : watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.02] border border-white/5 mb-6">
                    <Heart size={40} className="text-silver-dark" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Your watchlist is empty</h2>
                  <p className="text-silver-dark max-w-md mb-8">
                    Start exploring our vast collection and save the movies and shows you don't want to miss!
                  </p>
                  <Link href="/" className="rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-semibold text-oled transition-all hover:brightness-110 shadow-gold-sm">
                    Start Exploring
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {watchlist.map((item) => (
                    <Link key={item.id} href={`/movie/${item.tmdbId}`} className="group relative flex flex-col gap-3">
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.06] transition-all duration-400 group-hover:border-gold/30 group-hover:shadow-gold-md group-hover:scale-[1.03]">
                        {item.posterPath ? (
                          <Image src={getFullImageUrl(item.posterPath, "w500") || ""} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-navy-light text-silver-dark text-xs">No Poster</div>
                        )}
                        <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/40">
                          <div className="flex justify-end gap-2">
                            <button onClick={(e) => handleMoveToVault(e, item)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-gold/20 hover:text-gold hover:border hover:border-gold/50" title="Mark as Watched"><Check size={14} /></button>
                            <button onClick={(e) => handleRemoveFromWatchlist(e, item.tmdbId)} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-red-500" title="Remove from Watchlist"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                      <div className="px-1">
                        <p className="text-sm font-medium text-silver-light line-clamp-1 group-hover:text-gold transition-colors">{item.title}</p>
                        <p className="text-2xs text-silver-dark mt-0.5">{item.releaseYear || "Unknown Year"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "vault" && (
            <div>
              {vaultLoading ? (
                <div className="text-gold animate-pulse text-sm font-medium py-8">Unlocking Vault...</div>
              ) : vault.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.02] border border-white/5 mb-6">
                    <Archive size={40} className="text-silver-dark" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Your vault is empty</h2>
                  <p className="text-silver-dark max-w-md mb-8">
                    Log your first cinematic memory! Keep track of everything you watch right here.
                  </p>
                  <Link href="/" className="rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-semibold text-oled transition-all hover:brightness-110 shadow-gold-sm">
                    Discover Movies
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {vault.map((item) => (
                    <Link key={item.id} href={`/movie/${item.tmdbId}`} className="group relative flex flex-col gap-3">
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.06] transition-all duration-400 group-hover:border-gold/30 group-hover:shadow-gold-md group-hover:scale-[1.03]">
                        {item.posterPath ? (
                          <Image src={getFullImageUrl(item.posterPath, "w500") || ""} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-navy-light text-silver-dark text-xs">No Poster</div>
                        )}
                        <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/50">
                          <div className="flex justify-end">
                            <button onClick={(e) => handleRemoveFromVault(e, item.tmdbId)} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-red-500" title="Delete Record"><Trash2 size={14} /></button>
                          </div>
                          {item.userRating !== null && (
                            <div className="flex items-center gap-1.5 self-start rounded-full bg-black/60 px-2 py-1 backdrop-blur-md">
                              <Star size={12} className="fill-gold text-gold" />
                              <span className="text-xs font-bold text-gold">{item.userRating}/10</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-1">
                        <p className="text-sm font-medium text-silver-light line-clamp-1 group-hover:text-gold transition-colors">{item.title}</p>
                        <p className="text-2xs text-silver-dark mt-0.5">{item.releaseYear || "Unknown Year"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "dashboard" && (profile?.role === "admin" || profile?.role === "founder") && profile && (
            <AdminDashboard currentUser={profile} />
          )}

        </div>
      </div>
    </div>
  );
}
