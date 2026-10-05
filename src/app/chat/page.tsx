"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Send, Users, MessageSquare, Crown, ShieldCheck, Loader2, ChevronDown, Search } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: "founder" | "admin" | "user";
};

type UnifiedMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_private: boolean;
  recipient_id: string | null;
  profiles: Profile;
};

export default function ChatPage() {
  const { user, session } = useAuth();
  const router = useRouter();

  // State
  const [activeMainTab, setActiveMainTab] = useState<"global" | "dm">("global");
  const [activeAdminId, setActiveAdminId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [globalMessages, setGlobalMessages] = useState<UnifiedMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<UnifiedMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Prevent scroll jumping on focus
  useEffect(() => {
    if (isUserMenuOpen) {
      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
    } else if (activeMainTab === "global" || (activeMainTab === "dm" && activeAdminId)) {
      setTimeout(() => messageInputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [activeMainTab, isUserMenuOpen, activeAdminId]);

  // Authentication Guard
  useEffect(() => {
    if (!session && !user) {
      alert("You must be logged in to access the Chat Hub.");
      router.push("/");
    }
  }, [user, session, router]);

  // Fetch Admins & Initial Messages
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      // 1. Fetch current user's profile to determine role
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      const myRole = myProfile?.role || 'user';

      // 2. Fetch recipients based on role
      let query = supabase.from('profiles').select('*').neq('id', user.id);
      
      if (myRole === 'user') {
        query = query.in('role', ['admin', 'founder']);
      }

      const { data: adminData } = await query;
      
      if (adminData) setAdmins(adminData as Profile[]);

      // Fetch Global Messages
      const { data: globalMsgs } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url, role)
        `)
        .eq("is_private", false)
        .order("created_at", { ascending: true })
        .limit(100);
      
      if (globalMsgs) setGlobalMessages(globalMsgs as any);
      setLoading(false);
      scrollToBottom();
    };

    fetchData();

    // Supabase Realtime Subscription: All Messages
    const chatChannel = supabase.channel("realtime_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, role")
            .eq("id", payload.new.user_id)
            .single();

          if (profile) {
            const newMsg = { ...payload.new, profiles: profile } as UnifiedMessage;
            
            if (!newMsg.is_private) {
              // It's a global message
              setGlobalMessages((prev) => [...prev, newMsg]);
            } else {
              // It's a DM, add it to DM state (we will filter it during render if needed, or check if it belongs to current DM)
              setDirectMessages((prev) => [...prev, newMsg]);
            }
            scrollToBottom();
          }
        }
      )
      .subscribe();

    // Cleanup: Memory Management
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  // Fetch Direct Messages when selecting an admin
  useEffect(() => {
    if (!user || !activeAdminId || activeMainTab !== "dm") return;

    const fetchDMs = async () => {
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url, role)
        `)
        .eq("is_private", true)
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${activeAdminId}),and(user_id.eq.${activeAdminId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
        
      if (data) setDirectMessages(data as any);
      scrollToBottom();
    };

    fetchDMs();
  }, [activeAdminId, activeMainTab, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      alert("You must be logged in to send messages.");
      return;
    }

    const messagePayload = {
      content: newMessage.trim(),
      user_id: currentUser.id,
      is_private: activeMainTab === 'dm', // true if in DM tab, false if global
      recipient_id: activeMainTab === 'dm' ? activeAdminId : null
    };

    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from('messages').insert([messagePayload]);
    
    if (error) {
      console.error("Error sending message:", error.message);
      alert("Failed to send message: " + error.message);
    }
  };

  const renderBadge = (role: string) => {
    if (role === "founder") return <Crown size={14} className="text-[#D4AF37] ml-1" />;
    if (role === "admin") return <ShieldCheck size={14} className="text-blue-400 ml-1" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0C10] pb-20 pt-24">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  // Filter direct messages for the currently selected admin conversation to avoid cross-talk if a payload arrives
  const currentDirectMessages = directMessages.filter(msg => 
    (msg.user_id === user?.id && msg.recipient_id === activeAdminId) ||
    (msg.user_id === activeAdminId && msg.recipient_id === user?.id)
  );

  return (
    <div className="fixed inset-0 z-0 flex flex-col pt-14 md:pt-24 pb-16 md:pb-0 bg-[#0B0C10] overflow-hidden">
      <div className="flex flex-col w-full h-full max-w-5xl mx-auto px-2 md:px-4 animate-fade-up pt-4 pb-4">
      
      {/* Top Tabs */}
      <div className="flex justify-center gap-2 md:gap-4 mb-4 shrink-0">
        <button
          onClick={() => {
            setActiveMainTab("global");
            setIsUserMenuOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-bold transition-all shadow-lg ${
            activeMainTab === "global" 
              ? "bg-[#D4AF37] text-[#0B0C10] ring-2 ring-[#D4AF37]/50" 
              : "bg-white/[0.05] text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          <Users size={18} /> <span className="hidden sm:inline">Global Community</span><span className="sm:hidden">Global</span>
        </button>
        <button
          onClick={() => {
            setActiveMainTab("dm");
            setIsUserMenuOpen(false);
            if (!activeAdminId && admins.length > 0) setActiveAdminId(admins[0].id);
          }}
          className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-bold transition-all shadow-lg ${
            activeMainTab === "dm" 
              ? "bg-[#D4AF37] text-[#0B0C10] ring-2 ring-[#D4AF37]/50" 
              : "bg-white/[0.05] text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          <MessageSquare size={18} /> <span className="hidden sm:inline">Direct Messages</span><span className="sm:hidden">DMs</span>
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-col flex-1 w-full bg-[#0B0C10]/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header (Unified for Global & DM) */}
        <div className="h-14 md:h-16 border-b border-white/10 bg-black/40 flex items-center shrink-0 shadow-md z-20 relative">
          {activeMainTab === "global" ? (
            <div className="px-4 md:px-6 w-full h-full flex items-center">
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-[#D4AF37] w-5 h-5 md:w-6 md:h-6" /> Global Public Chat
              </h2>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                className="w-full h-full flex justify-between items-center px-4 md:px-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />
                  <div className="flex flex-col items-start">
                    <h2 className="text-sm md:text-base font-bold text-white">
                      {activeAdminId ? admins.find(a => a.id === activeAdminId)?.full_name || admins.find(a => a.id === activeAdminId)?.username : "Select User to Message"}
                    </h2>
                    {activeAdminId && (
                       <span className="text-xs text-gray-400 capitalize flex items-center gap-1">
                         {admins.find(a => a.id === activeAdminId)?.role}
                         {renderBadge(admins.find(a => a.id === activeAdminId)?.role || "")}
                       </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute top-full left-0 w-full max-h-[50vh] bg-[#12141D] border-b border-white/10 shadow-2xl z-50 flex flex-col">
                  <div className="p-3 border-b border-white/10 flex items-center gap-2 sticky top-0 bg-[#12141D] z-10">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)} 
                      placeholder="Search users..."
                      className="w-full bg-transparent border-none text-white text-sm outline-none placeholder:text-gray-500" 
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {admins
                      .filter(a => a.id !== user?.id)
                      .filter(a => (a.full_name || a.username).toLowerCase().includes(userSearch.toLowerCase()))
                      .map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => {
                            setActiveAdminId(admin.id);
                            setIsUserMenuOpen(false);
                            setUserSearch("");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors ${
                            activeAdminId === admin.id ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="relative w-8 h-8 rounded-full shrink-0 border border-white/10 overflow-hidden">
                            <UserAvatar src={admin.avatar_url} />
                          </div>
                          <div className="text-left flex-1 truncate flex flex-col">
                            <div className="font-semibold text-sm flex items-center text-white">
                              <span className="truncate">{admin.full_name || admin.username}</span>
                              {renderBadge(admin.role)}
                            </div>
                            <div className="text-xs opacity-70 capitalize text-[#D4AF37]">{admin.role}</div>
                          </div>
                        </button>
                      ))}
                      {admins.filter(a => a.id !== user?.id && (a.full_name || a.username).toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">No users found.</div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar">
            {activeMainTab === "global" ? (
              globalMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">Welcome to the Global Community! Be the first to say hello.</div>
              ) : (
                globalMessages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-4 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className="relative w-10 h-10 rounded-full shrink-0 border border-white/10 overflow-hidden bg-[#0B0C10]">
                        <UserAvatar src={msg.profiles?.avatar_url} />
                      </div>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-white flex items-center shadow-black drop-shadow-md">
                            {msg.profiles?.full_name || msg.profiles?.username || "Unknown"}
                            {renderBadge(msg.profiles?.role)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-xl ${isMe ? "bg-gradient-to-br from-[#D4AF37] to-[#B3932F] text-[#0B0C10] rounded-tr-none font-medium" : "bg-white/10 border border-white/5 text-white rounded-tl-none"}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              !activeAdminId ? (
                <div className="text-center flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p>Select a user to start a secure direct message.</p>
                </div>
              ) : currentDirectMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">No messages yet. Send a message to start the private thread.</div>
              ) : (
                currentDirectMessages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-4 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className="relative w-10 h-10 rounded-full shrink-0 border border-white/10 overflow-hidden bg-[#0B0C10]">
                        <UserAvatar src={msg.profiles?.avatar_url} />
                      </div>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-white flex items-center shadow-black drop-shadow-md">
                            {msg.profiles?.full_name || msg.profiles?.username || "Unknown"}
                            {renderBadge(msg.profiles?.role)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-xl ${isMe ? "bg-blue-600 text-white rounded-tr-none font-medium" : "bg-white/10 border border-white/5 text-white rounded-tl-none"}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
            <div ref={messagesEndRef} className="shrink-0" />
          </div>

          {/* Input */}
          {(activeMainTab === "global" || (activeMainTab === "dm" && activeAdminId)) && (
            <div className="p-3 md:p-4 border-t border-white/10 bg-[#0B0C10] flex-shrink-0 w-full z-10">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={activeMainTab === "global" ? "Message the community..." : "Send a secure direct message..."}
                  className="flex-1 bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2 md:py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] resize-none h-10 md:h-12 max-h-32 scrollbar-hide shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-[#D4AF37] hover:bg-[#F3E5AB] text-[#0B0C10] p-2.5 md:p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-[#D4AF37]/20"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
            </div>
          )}
      </div>
      </div>
    </div>
  );
}
