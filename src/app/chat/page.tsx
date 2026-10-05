"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Send, Users, MessageSquare, Crown, ShieldCheck, Loader2, ChevronDown, Search, Smile, Pin } from "lucide-react";
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
  is_pinned?: boolean;
  reactions?: Record<string, string[]>;
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<"user" | "admin" | "founder">("user");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];
  const ALL_EMOJIS = ["😀","😂","🥰","😎","🤔","😢","😡","👍","❤️","🔥","🎉","✨"];
  
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

  // Authentication Check for Loading State
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", currentSession.user.id).single();
          if (myProfile) setCurrentUserRole(myProfile.role);
        }
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Authentication Guard
  useEffect(() => {
    if (!isAuthLoading && !session && !user) {
      alert("You must be logged in to access the Chat Hub.");
      router.push("/");
    }
  }, [user, session, router, isAuthLoading]);

  // Fetch Admins & Initial Messages
  useEffect(() => {
    if (isAuthLoading || !user) return;

    const fetchData = async () => {
      setIsLoadingMessages(true);
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
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (globalMsgs) setGlobalMessages(globalMsgs.reverse() as any);
      setIsLoadingMessages(false);
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
              setGlobalMessages((prev) => {
                // Check if updating an existing message (e.g., reaction)
                const exists = prev.find(m => m.id === newMsg.id);
                if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
                return [...prev, newMsg];
              });
            } else {
              setDirectMessages((prev) => {
                const exists = prev.find(m => m.id === newMsg.id);
                if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
                return [...prev, newMsg];
              });
            }
            scrollToBottom();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
           // Handle reaction/pinned updates
           const updated = payload.new as UnifiedMessage;
           if (!updated.is_private) {
              setGlobalMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions, is_pinned: updated.is_pinned } : m));
           } else {
              setDirectMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions } : m));
           }
        }
      )
      .subscribe();

    // Cleanup: Memory Management
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [user, isAuthLoading]);

  // Fetch Direct Messages when selecting an admin
  useEffect(() => {
    if (isAuthLoading || !user || !activeAdminId || activeMainTab !== "dm") return;

    const fetchDMs = async () => {
      setIsLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url, role)
        `)
        .eq("is_private", true)
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${activeAdminId}),and(user_id.eq.${activeAdminId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (data) setDirectMessages(data.reverse() as any);
      scrollToBottom();
      setIsLoadingMessages(false);
    };

    fetchDMs();
  }, [activeAdminId, activeMainTab, user, isAuthLoading]);

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

    let finalContent = newMessage.trim();
    let isPinned = false;
    
    if (finalContent.startsWith('#') && activeMainTab === 'global' && (currentUserRole === 'admin' || currentUserRole === 'founder')) {
      isPinned = true;
      finalContent = finalContent.substring(1).trim();
      if (!finalContent) return; // Don't send empty pinned messages
    }

    const messagePayload = {
      content: finalContent,
      user_id: currentUser.id,
      is_private: activeMainTab === 'dm', // true if in DM tab, false if global
      recipient_id: activeMainTab === 'dm' ? activeAdminId : null,
      is_pinned: isPinned
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

  const parseMentions = (content: string) => {
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('@') && part.length > 1) {
        return <span key={i} className="text-[#D4AF37] font-semibold">{part}</span>;
      }
      return part;
    });
  };

  const handleTouchStart = (msgId: string) => {
    pressTimer.current = setTimeout(() => {
      setActiveReactionMessageId(msgId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    setActiveReactionMessageId(msgId);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    setActiveReactionMessageId(null);
    if (!user) return;
    
    // Optimistic update
    const updateMsg = (msgs: UnifiedMessage[]) => msgs.map(m => {
      if (m.id === msgId) {
        const reactions = m.reactions || {};
        const users = reactions[emoji] || [];
        if (!users.includes(user.id)) {
          return { ...m, reactions: { ...reactions, [emoji]: [...users, user.id] } };
        } else {
           const newUsers = users.filter(uid => uid !== user.id);
           const newReactions = { ...reactions, [emoji]: newUsers };
           if (newUsers.length === 0) delete newReactions[emoji];
           return { ...m, reactions: newReactions };
        }
      }
      return m;
    });
    setGlobalMessages(updateMsg);
    setDirectMessages(updateMsg);

    const { data } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
    if (data) {
       const existingReactions = data.reactions || {};
       const users = existingReactions[emoji] || [];
       if (!users.includes(user.id)) {
         existingReactions[emoji] = [...users, user.id];
       } else {
         existingReactions[emoji] = users.filter((uid: string) => uid !== user.id);
         if (existingReactions[emoji].length === 0) delete existingReactions[emoji];
       }
       await supabase.from('messages').update({ reactions: existingReactions }).eq('id', msgId);
    }
  };

  const renderMessage = (msg: UnifiedMessage) => {
    const isMe = msg.user_id === user?.id;
    return (
      <div 
        key={msg.id} 
        className={`flex gap-4 relative ${isMe ? "flex-row-reverse" : ""}`}
        onTouchStart={() => handleTouchStart(msg.id)}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => handleContextMenu(e, msg.id)}
      >
        <div className="relative w-10 h-10 rounded-full shrink-0 border border-white/10 overflow-hidden bg-[#0B0C10]">
          <UserAvatar src={msg.profiles?.avatar_url} />
        </div>
        <div className={`max-w-[70%] flex flex-col relative ${isMe ? "items-end" : "items-start"}`}>
          {activeReactionMessageId === msg.id && (
            <div className={`absolute -top-12 z-50 bg-[#12141D] border border-white/10 rounded-full px-2 py-1 shadow-2xl flex gap-1 animate-in fade-in zoom-in duration-200 ${isMe ? "right-0" : "left-0"}`}>
               {EMOJIS.map(emoji => (
                 <button 
                   key={emoji} 
                   className="hover:scale-125 hover:bg-white/10 transition-all p-1.5 rounded-full text-lg"
                   onClick={() => handleReaction(msg.id, emoji)}
                 >
                   {emoji}
                 </button>
               ))}
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-bold text-white flex items-center shadow-black drop-shadow-md">
              {msg.profiles?.full_name || msg.profiles?.username || "Unknown"}
              {renderBadge(msg.profiles?.role)}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-xl ${isMe ? (msg.is_private ? "bg-blue-600 text-white rounded-tr-none font-medium" : "bg-gradient-to-br from-[#D4AF37] to-[#B3932F] text-[#0B0C10] rounded-tr-none font-medium") : "bg-white/10 border border-white/5 text-white rounded-tl-none"}`}>
            {parseMentions(msg.content)}
          </div>
          
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <button key={emoji} className={`bg-black/50 border ${users.includes(user?.id || '') ? 'border-[#D4AF37]' : 'border-white/10'} rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-1 cursor-pointer`} onClick={() => handleReaction(msg.id, emoji)}>
                  {emoji} <span className="text-[10px] opacity-70">{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0C10]">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4AF37] blur-xl opacity-20 rounded-full" />
            <Loader2 className="relative animate-spin text-[#D4AF37] w-12 h-12" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-[#D4AF37] font-bold tracking-widest uppercase text-sm">CineVault Secure</h2>
            <p className="text-gray-500 text-xs tracking-wider">Establishing Connection...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter direct messages for the currently selected admin conversation to avoid cross-talk if a payload arrives
  const currentDirectMessages = directMessages.filter(msg => 
    (msg.user_id === user?.id && msg.recipient_id === activeAdminId) ||
    (msg.user_id === activeAdminId && msg.recipient_id === user?.id)
  );

  const pinnedMessage = globalMessages.slice().reverse().find(m => m.is_pinned);

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

        {/* Pinned Message */}
        {activeMainTab === "global" && pinnedMessage && (
          <div className="flex items-center gap-3 p-3 bg-[#12141D]/90 backdrop-blur-md border-b border-[#D4AF37]/50 text-white/80 cursor-pointer shadow-md w-full flex-shrink-0 z-10 border-l-4 border-l-[#D4AF37]">
            <Pin size={18} className="text-[#D4AF37] shrink-0" />
            <div className="flex-1 truncate text-sm">
              <span className="font-bold text-[#D4AF37] mr-2">{pinnedMessage.profiles?.full_name || pinnedMessage.profiles?.username}:</span>
              {parseMentions(pinnedMessage.content)}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar">
            {isLoadingMessages ? (
              <div className="flex flex-col gap-6 animate-pulse p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`flex items-end gap-3 ${i % 2 === 0 ? "self-end flex-row-reverse" : "self-start"}`}>
                    <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <div className={`h-3 w-16 bg-white/5 rounded ${i % 2 === 0 ? "ml-auto" : ""}`} />
                      <div className={`h-12 w-48 sm:w-64 bg-white/10 rounded-2xl ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeMainTab === "global" ? (
              globalMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">Welcome to the Global Community! Be the first to say hello.</div>
              ) : (
                globalMessages.map(renderMessage)
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
                currentDirectMessages.map(renderMessage)
              )
            )}
            <div ref={messagesEndRef} className="shrink-0" />
          </div>

          {/* Input */}
          {(activeMainTab === "global" || (activeMainTab === "dm" && activeAdminId)) && (
            <div className="p-3 md:p-4 border-t border-white/10 bg-[#0B0C10] flex-shrink-0 w-full z-10">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                <div className="relative shrink-0 flex items-center justify-center">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 md:p-3 text-gray-400 hover:text-[#D4AF37] transition-colors"
                  >
                    <Smile className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 bg-[#12141D] border border-white/10 rounded-xl p-3 shadow-2xl z-50 grid grid-cols-4 gap-2 w-48">
                      {ALL_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className="hover:bg-white/10 p-1.5 rounded text-xl"
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
