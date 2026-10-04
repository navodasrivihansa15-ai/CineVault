"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, UserX, Shield, Activity, Circle, ShieldAlert, Ban, UserCheck, ShieldPlus, ShieldMinus } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 border-l-4 border-gold pl-4">
          <ShieldAlert className="text-gold" size={24} /> 
          Admin Control Center
        </h2>
      </div>

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
    </div>
  );
}
