"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Info } from "lucide-react";

export default function PlayerInstructions() {
  const [instruction, setInstruction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchInstruction = async () => {
      try {
        const { data, error } = await supabase
          .from("system_messages")
          .select("message_text, is_active")
          .eq("message_key", "player_instruction")
          .single();

        if (isMounted && data && data.is_active && data.message_text) {
          setInstruction(data.message_text);
        }
      } catch (err) {
        console.error("Failed to fetch player instructions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInstruction();

    const messageSubscription = supabase
      .channel('system_messages_changes_player')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_messages',
          filter: "message_key=eq.player_instruction"
        },
        (payload) => {
          if (isMounted && payload.new) {
            // Check if is_active is true. If false, clear instruction.
            if (payload.new.is_active === false) {
              setInstruction(null);
            } else if (payload.new.message_text !== undefined) {
              setInstruction(payload.new.message_text);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(messageSubscription);
    };
  }, []);

  if (loading || !instruction) {
    return null; // Return nothing while loading or if there's no instruction
  }

  return (
    <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-100 text-sm md:text-base flex items-start gap-3 animate-fade-in">
      <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-400" />
      <div className="flex-1 leading-relaxed whitespace-pre-wrap">
        {instruction}
      </div>
    </div>
  );
}
