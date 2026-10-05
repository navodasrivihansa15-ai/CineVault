"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Send, Users, MessageSquare, Crown, ShieldCheck, Loader2 } from "lucide-react";
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col w-full h-screen bg-[#0B0C10] pt-16 md:pt-28 pb-20 md:pb-6 px-2 md:px-4 max-w-5xl mx-auto overflow-hidden animate-fade-up">
      
      {/* Top Tabs */}
      <div className="flex justify-center gap-2 md:gap-4 mb-4 md:mb-6 shrink-0">
        <button
          onClick={() => setActiveMainTab("global")}
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
      <div className="flex flex-row flex-1 w-full h-full bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* DM Sidebar (Only visible in Direct tab) */}
        {activeMainTab === "dm" && (
          <div className="w-20 md:w-80 flex-shrink-0 border-r border-white/10 bg-black/30 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-center md:justify-start">
              <h3 className="hidden md:block text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">Direct Messages</h3>
              <MessageSquare className="md:hidden text-[#D4AF37]" size={20} />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {admins.filter(a => a.id !== user?.id).map((admin) => (
                <button
                  key={admin.id}
                  onClick={() => setActiveAdminId(admin.id)}
                  className={`w-full flex items-center justify-center md:justify-start gap-3 md:px-3 py-3 rounded-xl transition-colors ${
                    activeAdminId === admin.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full shrink-0 border border-white/10 overflow-hidden">
                    <UserAvatar src={admin.avatar_url} />
                  </div>
                  <div className="hidden md:flex text-left flex-1 flex-col truncate">
                    <div className="font-semibold text-sm flex items-center text-white">
                      <span className="truncate">{admin.full_name || admin.username}</span>
                      {renderBadge(admin.role)}
                    </div>
                    <div className="text-xs opacity-70 capitalize text-[#D4AF37]">{admin.role}</div>
                  </div>
                </button>
              ))}
              {admins.filter(a => a.id !== user?.id).length === 0 && (
                <div className="text-center p-4 text-gray-500 text-sm">No users available for messaging.</div>
              )}
            </div>
          </div>
        )}

        {/* Chat Window */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0B0C10]/50 backdrop-blur-sm w-full h-full">
          {/* Header */}
          <div className="h-14 md:h-16 border-b border-white/10 bg-black/40 flex items-center px-4 md:px-6 shrink-0 shadow-md z-10">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              {activeMainTab === "global" ? (
                <>
                  <Users className="text-[#D4AF37] w-5 h-5 md:w-6 md:h-6" /> Global Public Chat
                </>
              ) : activeAdminId ? (
                <>
                  <ShieldCheck className="text-blue-400 w-5 h-5 md:w-6 md:h-6" /> Private Support Thread
                </>
              ) : (
                "Select a conversation"
              )}
            </h2>
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
