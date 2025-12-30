"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatSidebar } from "./ChatSidebar";
import { useChats } from "@/lib/hooks/use-chats";

interface ChatLayoutProps {
  children: React.ReactNode;
  currentChatId?: string | null;
}

export function ChatLayout({ children, currentChatId }: ChatLayoutProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { chats, isLoading, createChat, deleteChat } = useChats();

  const handleNewChat = useCallback(async () => {
    const newChat = await createChat();
    if (newChat) {
      router.push(`/chat/${newChat.id}`);
    }
  }, [createChat, router]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChat(chatId);
    // If we deleted the current chat, go to home
    if (chatId === currentChatId) {
      router.push("/");
    }
  }, [deleteChat, currentChatId, router]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] dark:bg-[var(--background)]">
      <ChatSidebar
        chats={chats}
        isLoading={isLoading}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950 dark:to-gray-900">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

