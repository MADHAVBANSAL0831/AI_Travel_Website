"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatLayout, Chat } from "@/components/chat";

const LAST_CHAT_KEY = "travelhub_last_chat_id";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowNewChat, setShouldShowNewChat] = useState(false);

  useEffect(() => {
    const checkLastChat = async () => {
      try {
        // Check localStorage for last opened chat
        const lastChatId = localStorage.getItem(LAST_CHAT_KEY);

        if (lastChatId) {
          // Verify the chat still exists
          const response = await fetch(`/api/chats/${lastChatId}`);

          if (response.ok) {
            // Chat exists, redirect to it
            router.replace(`/chat/${lastChatId}`);
            return;
          } else {
            // Chat doesn't exist anymore, clear localStorage
            localStorage.removeItem(LAST_CHAT_KEY);
          }
        }

        // No last chat or it doesn't exist, show new chat
        setShouldShowNewChat(true);
      } catch (error) {
        console.error("Error checking last chat:", error);
        setShouldShowNewChat(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkLastChat();
  }, [router]);

  // Show loading while checking
  if (isChecking && !shouldShowNewChat) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950 dark:to-gray-900">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <ChatLayout currentChatId={null}>
      <Chat chatId={null} />
    </ChatLayout>
  );
}
