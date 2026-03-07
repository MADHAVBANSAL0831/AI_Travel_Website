"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { ChatSidebar } from "./ChatSidebar";
import { useChats } from "@/lib/hooks/use-chats";
import { Button } from "@/components/ui/button";

interface ChatLayoutProps {
  children: React.ReactNode;
  currentChatId?: string | null;
}

const LAST_CHAT_KEY = "travelhub_last_chat_id";

export function ChatLayout({ children, currentChatId }: ChatLayoutProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { chats, isLoading, createChat, deleteChat } = useChats();

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = useCallback(async () => {
    const newChat = await createChat();
    if (newChat) {
      // Save as last opened chat
      localStorage.setItem(LAST_CHAT_KEY, newChat.id);
      router.push(`/chat/${newChat.id}`);
    }
  }, [createChat, router]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChat(chatId);

    // Clear from localStorage if this was the last chat
    const lastChatId = localStorage.getItem(LAST_CHAT_KEY);
    if (lastChatId === chatId) {
      localStorage.removeItem(LAST_CHAT_KEY);
    }

    // If we deleted the current chat, go to home
    if (chatId === currentChatId) {
      router.push("/");
    }
  }, [deleteChat, currentChatId, router]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] dark:bg-[var(--background)]">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <ChatSidebar
          chats={chats}
          isLoading={isLoading}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobile={false}
          isMobileMenuOpen={false}
          onCloseMobileMenu={handleCloseMobileMenu}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className="md:hidden">
        <ChatSidebar
          chats={chats}
          isLoading={isLoading}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isCollapsed={false}
          onToggleCollapse={handleToggleCollapse}
          isMobile={true}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={handleCloseMobileMenu}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950 dark:to-gray-900">
        {/* Mobile Hamburger Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleMobileMenu}
          className="md:hidden fixed top-2.5 left-2.5 z-30 bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl h-10 w-10"
          title="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </Button>

        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

