"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Heart, Archive, Trash2, Clapperboard, Star, Check, Camera, Loader2, Save, ShieldAlert, Crown, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { db, type WatchlistEntity, type WatchedMovieEntity } from "@/lib/db";
import { getFullImageUrl, removeFromWatchlist, moveToVault, removeFromVault } from "@/lib/sync";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";

export default function ProfilePage() {
  const { user, session, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>("settings");
  
  // Profile state
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarList, setAvatarList] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState("");

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
  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;
    try {
      setUploadingAvatar(true);
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

  const fetchAvatars = async () => {
    const { data, error } = await supabase.storage.from('avatars').list('', {
      limit: 50,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (data) {
      const urls = data.map((file) => {
        if (file.name === '.emptyFolderPlaceholder') return null;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(file.name);
        return publicUrl;
      }).filter(Boolean) as string[];
      setAvatarList(urls);
    }
  };

  useEffect(() => {
    if (isAvatarModalOpen && avatarList.length === 0) {
      fetchAvatars();
    }
  }, [isAvatarModalOpen, avatarList.length]);

  const handleSaveAvatarFromGallery = async () => {
    if (!user || !selectedAvatar) return;
    try {
      setUploadingAvatar(true);
      const { error } = await supabase.from('profiles').update({ avatar_url: selectedAvatar }).eq('id', user.id);
      if (error) throw error;
      
      setAvatarUrl(selectedAvatar);
      window.dispatchEvent(new Event("profile-updated"));
      setIsAvatarModalOpen(false);
    } catch (error: any) {
      alert("Error updating avatar: " + error.message);
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

  const linkGoogleAccount = async () => {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
    });
    if (error) {
      console.error('Error linking Google account:', error.message);
      alert('Failed to link Google account: ' + error.message);
    } else {
      alert('Google account successfully linked!');
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
    <div className="flex flex-col min-h-screen bg-oled pb-20 pt-16 md:pt-24">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8 md:mb-12 animate-fade-up">
          <div className="flex flex-col items-center gap-3">
            <div className="relative inline-block">
              <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-2 border-[#D4AF37] shadow-2xl overflow-hidden bg-navy-light flex items-center justify-center shrink-0">
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 md:mb-2">
              {profile?.full_name || username || "Loading..."}
            </h1>
            <p className="text-sm text-silver-dark font-medium">{profile?.email || "Your Personal Hub"}</p>
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
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(avatarUrl);
                          setIsAvatarModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-gold/10 text-gold hover:bg-gold hover:text-black border border-gold/30 hover:border-gold px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-inner-gold hover:shadow-gold-sm"
                      >
                        <Camera size={18} />
                        Choose Avatar from Gallery
                      </button>
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

                  <div className="pt-4 border-t border-white/5">
                    <label className="block text-sm font-medium text-silver-light mb-2">
                      Connected Accounts
                    </label>
                    <button
                      type="button"
                      onClick={linkGoogleAccount}
                      className="group flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-silver-light transition-all duration-300 hover:border-gold/20 hover:bg-white/[0.06] hover:text-white hover:shadow-gold-sm w-full md:w-auto"
                    >
                      <svg 
                        className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" 
                        viewBox="0 0 24 24"
                      >
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Link Google Account
                    </button>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to log out?")) {
                          signOut();
                        }
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-500 px-8 py-3 text-sm font-bold transition-all hover:bg-red-500/20 border border-red-500/20"
                    >
                      <LogOut size={18} />
                      Log Out
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed shadow-gold-md"
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

      {/* Avatar Gallery Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-oled/95 backdrop-blur-xl" onClick={() => setIsAvatarModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-[#0B0C10]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Camera className="text-[#D4AF37]" size={24} /> Select Avatar
              </h2>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-2 text-silver-dark hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <Trash2 size={18} className="hidden" /> {/* just to align imports, using X really */}
                <span className="font-bold text-xl leading-none">&times;</span>
              </button>
            </div>
            
            {avatarList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-silver-dark">
                <Loader2 size={32} className="animate-spin text-gold mb-4" />
                <p>Loading gallery...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto p-2 custom-scrollbar">
                {avatarList.map((url) => (
                  <div 
                    key={url} 
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-square ${
                      selectedAvatar === url 
                        ? 'border-[#D4AF37] scale-105 shadow-lg shadow-[#D4AF37]/20 z-10' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <Image alt="Avatar option" className="object-cover" fill src={url} unoptimized />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-6 py-2.5 text-sm font-medium text-silver-light hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAvatarFromGallery}
                disabled={uploadingAvatar || !selectedAvatar}
                className="flex items-center gap-2 rounded-xl bg-gold-shimmer px-6 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-gold-sm"
              >
                {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirm Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
