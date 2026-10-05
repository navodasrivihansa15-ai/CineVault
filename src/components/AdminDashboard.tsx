"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, UserX, Shield, Activity, Circle, ShieldAlert, Ban, UserCheck, ShieldPlus, ShieldMinus, Bell, Trash2, Edit, Tv, Plus, Loader2, Save, Info, MonitorPlay } from "lucide-react";
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
  
  const [activeTab, setActiveTab] = useState<"users" | "notices" | "tv" | "player">("users");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onClick={() => setActiveTab("player")} 
          className={`flex items-center gap-2 pb-2 whitespace-nowrap -mb-[1px] border-b-2 transition-colors ${activeTab === "player" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <MonitorPlay size={18} /> Player Instructions
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
                          {/* Role Actions (Admin and Founder) */}
                          {["admin", "founder"].includes(currentUser.role) && (
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
      ) : activeTab === "player" ? (
        <ManagePlayerInstructions />
      ) : null}
    </div>
  );
}

function ManagePlayerInstructions() {
  const [instruction, setInstruction] = useState("");
  const [savingInstruction, setSavingInstruction] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInstruction = async () => {
      const { data } = await supabase.from('system_messages').select('message_text').eq('message_key', 'player_instruction').single();
      if (isMounted && data) setInstruction(data.message_text || "");
    };

    fetchInstruction();

    const messageSubscription = supabase
      .channel('system_messages_changes_admin')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_messages',
          filter: "message_key=eq.player_instruction"
        },
        (payload) => {
          if (isMounted && payload.new && payload.new.message_text !== undefined) {
            setInstruction(payload.new.message_text);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(messageSubscription);
    };
  }, []);

  const handleSaveInstruction = async () => {
    setSavingInstruction(true);
    await supabase.from('system_messages')
      .update({ message_text: instruction, updated_at: new Date() })
      .eq('message_key', 'player_instruction');
    setSavingInstruction(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/[0.02] border border-blue-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <MonitorPlay size={100} className="text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Info size={18} className="text-blue-400" />
          Global Player Instructions
        </h3>
        <p className="text-sm text-silver-dark mb-4 max-w-2xl relative z-10">
          This message will be displayed prominently above the video player for all users. Use it to provide guidance on how to use the player, switch servers, or report broken links.
        </p>
        <div className="relative z-10 space-y-3">
          <textarea 
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="E.g., If the video doesn't load, please try switching servers..."
            rows={4}
            className="w-full bg-[#0B0C10] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 resize-none transition-colors"
          />
          <div className="flex justify-end">
            <button 
              onClick={handleSaveInstruction}
              disabled={savingInstruction}
              className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {savingInstruction ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingInstruction ? "Saving..." : "Save Instructions"}
            </button>
          </div>
        </div>
      </div>
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
