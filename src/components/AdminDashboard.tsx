"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, UserX, Shield, Activity, Circle, ShieldAlert, Ban, UserCheck, ShieldPlus, ShieldMinus, Bell, Trash2, Edit, Tv, Plus, Loader2, Save } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  role: "founder" | "admin" | "user";
  is_suspended: boolean;
  last_seen: string;
  created_at?: string;
};

export default function AdminDashboard({ currentUser }: { currentUser: Profile }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"users" | "notices" | "tv">("users");

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineNow: 0,
    totalAdmins: 0,
    suspended: 0
  });

  const fetchProfiles = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        setFetchError(error.message || JSON.stringify(error));
      } else {
        setProfiles(data || []);
        calculateStats(data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch profiles", err);
      setFetchError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Profile[]) => {
    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - 5 * 60000); // 5 mins ago

    setStats({
      totalUsers: data.length,
      onlineNow: data.filter(p => new Date(p.last_seen) >= onlineThreshold && !p.is_suspended).length,
      totalAdmins: data.filter(p => p.role === "admin" || p.role === "founder").length,
      suspended: data.filter(p => p.is_suspended).length
    });
  };

  useEffect(() => {
    fetchProfiles();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("realtime_profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          console.log("Realtime payload received:", payload);
          setProfiles((prev) => {
            const updated = prev.map((p) => (p.id === payload.new.id ? (payload.new as Profile) : p));
            calculateStats(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      console.error("Failed to update role:", error);
      alert("Error updating role: " + error.message);
    }
  };

  const handleSuspend = async (userId: string, isSuspended: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: isSuspended }).eq('id', userId);
    if (error) {
      console.error("Failed to update suspension status:", error);
      alert("Error updating status: " + error.message);
    }
  };

  // Check if online
  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    return (new Date().getTime() - new Date(lastSeen).getTime()) < 300000;
  };

  if (currentUser?.role !== "admin" && currentUser?.role !== "founder") {
    return (
      <div className="py-20 text-center text-red-500 font-medium bg-red-500/10 border border-red-500/20 rounded-2xl">
        Not Authorized. You do not have permission to view this page.
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-20 text-center text-red-500 font-medium bg-red-500/10 border border-red-500/20 rounded-2xl">
        <p className="mb-2">Error loading dashboard data.</p>
        <p className="text-sm opacity-80">{fetchError}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-20 text-center text-gold animate-pulse font-medium">Loading Dashboard Data...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 border-l-4 border-gold pl-4">
          <ShieldAlert className="text-gold" size={24} /> 
          Admin Control Center
        </h2>
      </div>

      <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar pb-2">
        <button 
          onClick={() => setActiveTab("users")} 
          className={`flex items-center gap-2 pb-2 whitespace-nowrap -mb-[1px] border-b-2 transition-colors ${activeTab === "users" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <Users size={18} /> User Management
        </button>
        <button 
          onClick={() => setActiveTab("notices")} 
          className={`flex items-center gap-2 pb-2 whitespace-nowrap -mb-[1px] border-b-2 transition-colors ${activeTab === "notices" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <Bell size={18} /> Manage Notices
        </button>
        <button 
          onClick={() => setActiveTab("tv")} 
          className={`flex items-center gap-2 pb-2 whitespace-nowrap -mb-[1px] border-b-2 transition-colors ${activeTab === "tv" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <Tv size={18} /> TV Show Ingestion
        </button>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
            <Users size={64} className="text-white" />
          </div>
          <span className="text-silver-dark font-medium text-sm">Total Users</span>
          <span className="text-3xl font-bold text-white">{stats.totalUsers}</span>
        </div>
        
        <div className="bg-gold/[0.05] border border-gold/20 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
            <Activity size={64} className="text-gold" />
          </div>
          <span className="text-gold font-medium text-sm">Online Now</span>
          <span className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            {stats.onlineNow}
          </span>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
            <Shield size={64} className="text-blue-400" />
          </div>
          <span className="text-silver-dark font-medium text-sm">Total Admins</span>
          <span className="text-3xl font-bold text-white">{stats.totalAdmins}</span>
        </div>

        <div className="bg-red-500/[0.05] border border-red-500/20 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
            <UserX size={64} className="text-red-500" />
          </div>
          <span className="text-red-400 font-medium text-sm">Suspended</span>
          <span className="text-3xl font-bold text-white">{stats.suspended}</span>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-silver">
            <thead className="bg-black/40 text-xs uppercase text-silver-dark">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-navy">
                        <UserAvatar src={profile.avatar_url} fallbackSize={16} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{profile.username || "Unknown User"}</div>
                        <div className="text-xs text-silver-dark">{profile.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-silver">
                    {profile.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    {profile.is_suspended ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-500/20">
                        <Ban size={12} /> Suspended
                      </span>
                    ) : isOnline(profile.last_seen) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500 border border-green-500/20">
                        <Circle size={10} className="fill-green-500" /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-silver-dark border border-white/10">
                        <Circle size={10} className="fill-silver-dark" /> Offline
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {profile.role === "founder" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-2 py-1 text-xs font-bold text-gold border border-gold/30">
                        <ShieldAlert size={12} /> Founder
                      </span>
                    ) : profile.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-silver border border-white/10">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* STRICT UI GUARD */}
                      {profile.role === "founder" ? (
                        <span className="text-xs font-medium text-gold/50 italic">Protected</span>
                      ) : currentUser.role === "admin" && profile.role === "admin" ? (
                        <span className="text-xs font-medium text-silver-dark italic">No Access</span>
                      ) : (
                        <>
                          {/* Role Actions (Founder Only) */}
                          {currentUser.role === "founder" && (
                            <>
                              {profile.role === "user" ? (
                                <button 
                                  onClick={() => handleUpdateRole(profile.id, "admin")}
                                  className="p-1.5 text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 rounded-md transition-colors"
                                  title="Promote to Admin"
                                >
                                  <ShieldPlus size={18} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleUpdateRole(profile.id, "user")}
                                  className="p-1.5 text-orange-400 hover:bg-orange-400/10 hover:text-orange-300 rounded-md transition-colors"
                                  title="Revoke Admin"
                                >
                                  <ShieldMinus size={18} />
                                </button>
                              )}
                            </>
                          )}
                          
                          {/* Suspension Actions */}
                          {profile.is_suspended ? (
                            <button 
                              onClick={() => handleSuspend(profile.id, false)}
                              className="p-1.5 text-green-500 hover:bg-green-500/10 hover:text-green-400 rounded-md transition-colors"
                              title="Unsuspend User"
                            >
                              <UserCheck size={18} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleSuspend(profile.id, true)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
                              title="Suspend User"
                            >
                              <Ban size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <div className="text-center py-10 text-silver-dark text-sm">
              No users found.
            </div>
          )}
        </div>
      </div>
        </>
      ) : activeTab === "notices" ? (
        <ManageNotices />
      ) : (
        <ManageTVShows />
      )}
    </div>
  );
}

function ManageNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("Info");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (data) setNotices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('notices').update({ title, message, type }).eq('id', editingId);
    } else {
      await supabase.from('notices').insert([{ title, message, type }]);
    }
    setTitle("");
    setMessage("");
    setType("Info");
    setEditingId(null);
    fetchNotices();
  };

  const handleEdit = (notice: any) => {
    setTitle(notice.title);
    setMessage(notice.message);
    setType(notice.type);
    setEditingId(notice.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      await supabase.from('notices').delete().eq('id', id);
      fetchNotices();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{editingId ? "Edit Notice" : "Create New Notice"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type (Color)</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold transition-colors">
                <option value="Info">Info (Blue)</option>
                <option value="Warning">Warning (Red)</option>
                <option value="Success">Success (Green)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Message</label>
            <textarea required value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold resize-none transition-colors" />
          </div>
          <div className="flex justify-end gap-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setTitle(""); setMessage(""); setType("Info"); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            )}
            <button type="submit" className="bg-gold hover:bg-[#F3E5AB] text-black font-bold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-gold/20">
              {editingId ? "Update Notice" : "Post Global Notice"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No notices found. Create one above!</div>
        ) : (
          <div className="divide-y divide-white/10">
            {notices.map(notice => (
              <div key={notice.id} className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-white/[0.01] transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${notice.type === 'Warning' ? 'bg-red-500/20 text-red-400' : notice.type === 'Success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{notice.type}</span>
                    <h4 className="font-bold text-white text-sm">{notice.title}</h4>
                  </div>
                  <p className="text-sm text-gray-400">{notice.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500 mr-2">{new Date(notice.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleEdit(notice)} className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors bg-white/5 hover:bg-white/10 rounded-md"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 rounded-md"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManageTVShows() {
  const [tmdbId, setTmdbId] = useState("");
  const [stagingEpisodes, setStagingEpisodes] = useState<any[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [baseSeason, setBaseSeason] = useState(1);
  const [epCount, setEpCount] = useState(10);
  const [saving, setSaving] = useState(false);

  // Generate stagingEpisodes from playlist/base URL
  const handleParsePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl) return;
    const newEps = Array.from({ length: epCount }).map((_, i) => {
      const epNum = i + 1;
      let genUrl = playlistUrl;
      // Auto-replace {ep} with the episode number
      if (playlistUrl.includes("{ep}")) {
        genUrl = playlistUrl.replace(/{ep}/g, epNum.toString());
      }
      return {
        id: Date.now() + i + Math.random(), // staging id
        season_number: baseSeason,
        season_name: `Season ${baseSeason}`,
        episode_number: epNum,
        episode_name: `Episode ${epNum}`,
        stream_url: genUrl,
        is_playlist: false
      };
    });
    setStagingEpisodes([...stagingEpisodes, ...newEps]);
  };

  const handleManualAdd = () => {
    const sNum = stagingEpisodes.length > 0 ? stagingEpisodes[stagingEpisodes.length - 1].season_number : 1;
    const sName = stagingEpisodes.length > 0 ? stagingEpisodes[stagingEpisodes.length - 1].season_name : "Season 1";
    const lastEp = stagingEpisodes.length > 0 ? stagingEpisodes[stagingEpisodes.length - 1].episode_number : 0;
    
    setStagingEpisodes([
      ...stagingEpisodes,
      {
        id: Date.now() + Math.random(),
        season_number: sNum,
        season_name: sName,
        episode_number: lastEp + 1,
        episode_name: `Episode ${lastEp + 1}`,
        stream_url: "",
        is_playlist: false
      }
    ]);
  };

  const handleEpisodeEdit = (id: number, field: string, value: string | number) => {
    setStagingEpisodes(stagingEpisodes.map(ep => ep.id === id ? { ...ep, [field]: value } : ep));
  };

  const removeEpisode = (id: number) => {
    setStagingEpisodes(stagingEpisodes.filter(ep => ep.id !== id));
  };

  const handleSyncSupabase = async () => {
    if (!tmdbId) return alert("TMDB ID is required to sync to database.");
    setSaving(true);
    try {
      const payload = stagingEpisodes.map(ep => ({
        tmdb_id: tmdbId,
        media_type: "tv",
        season_number: Number(ep.season_number),
        season_name: String(ep.season_name),
        episode_number: Number(ep.episode_number),
        episode_name: String(ep.episode_name),
        stream_url: String(ep.stream_url),
        is_playlist: false
      }));

      // Direct insert (Assumes duplicates are handled by constraint or admin deletes manually)
      const { error } = await supabase.from('global_links').upsert(payload, { onConflict: 'tmdb_id,season_name,episode_number' });
      if (error) throw error;
      alert("Successfully synced all stagingEpisodes to Supabase!");
      setStagingEpisodes([]);
      setTmdbId("");
    } catch (err: any) {
      alert("Error syncing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Tv className="text-gold" size={20}/> TV Show Episode Ingestion</h3>
        
        <div className="mb-8">
          <label className="block text-xs text-gold font-bold mb-1">Target TMDB ID (Required)</label>
          <input type="number" required value={tmdbId} onChange={e => setTmdbId(e.target.value)} placeholder="e.g. 1399 (Game of Thrones)" className="w-full md:w-1/3 bg-[#0B0C10] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-gold transition-colors font-mono" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/10 pt-6">
          {/* Playlist / Batch Generator */}
          <div className="bg-black/40 rounded-xl p-5 border border-white/5">
            <h4 className="text-sm font-bold text-white mb-3">Add via Playlist / Auto-Generate</h4>
            <form onSubmit={handleParsePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Base URL (Use {'{ep}'} for episode number)</label>
                <input type="text" required value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://cdn.com/show/s1/e{ep}.mp4" className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold transition-colors font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Season Num</label>
                  <input type="number" required value={baseSeason} onChange={e => setBaseSeason(Number(e.target.value))} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Episodes to Generate</label>
                  <input type="number" required value={epCount} onChange={e => setEpCount(Number(e.target.value))} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-gold" />
                </div>
              </div>
              <button type="submit" className="w-full bg-white/10 hover:bg-gold hover:text-black text-white font-semibold py-2 rounded-lg transition-colors border border-white/10 hover:border-gold text-sm">
                Generate Episodes
              </button>
            </form>
          </div>
          
          {/* Manual Controls */}
          <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col justify-center items-center gap-4">
            <h4 className="text-sm font-bold text-white mb-2">Manual Addition</h4>
            <p className="text-xs text-silver-dark text-center mb-2">Need to add a special episode or build manually from scratch?</p>
            <button onClick={handleManualAdd} className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2 rounded-lg transition-colors border border-white/10 text-sm flex items-center gap-2">
              <Plus size={16} /> Add Single Episode Blank
            </button>
          </div>
        </div>
      </div>

      {/* Staging Grid */}
      {stagingEpisodes.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Staging Area ({stagingEpisodes.length} Episodes)</h3>
            <button onClick={handleSyncSupabase} disabled={saving || !tmdbId} className="bg-gold hover:bg-[#F3E5AB] text-black font-bold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Sync to Supabase
            </button>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-silver-dark uppercase tracking-wider">
                  <th className="pb-3 pr-2 w-16">S.Num</th>
                  <th className="pb-3 pr-2 w-32">S.Name</th>
                  <th className="pb-3 pr-2 w-16">E.Num</th>
                  <th className="pb-3 pr-2 w-48">E.Name</th>
                  <th className="pb-3 pr-2">Stream URL</th>
                  <th className="pb-3 w-10">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stagingEpisodes.map(ep => (
                  <tr key={ep.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-2">
                      <input type="number" value={ep.season_number} onChange={e => handleEpisodeEdit(ep.id, 'season_number', e.target.value)} className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-gold outline-none" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" value={ep.season_name} onChange={e => handleEpisodeEdit(ep.id, 'season_name', e.target.value)} className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-gold outline-none" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" value={ep.episode_number} onChange={e => handleEpisodeEdit(ep.id, 'episode_number', e.target.value)} className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-gold outline-none" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" value={ep.episode_name} onChange={e => handleEpisodeEdit(ep.id, 'episode_name', e.target.value)} className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-gold outline-none" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" value={ep.stream_url} onChange={e => handleEpisodeEdit(ep.id, 'stream_url', e.target.value)} className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-silver font-mono text-xs focus:border-gold outline-none" />
                    </td>
                    <td className="py-2">
                      <button onClick={() => removeEpisode(ep.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
