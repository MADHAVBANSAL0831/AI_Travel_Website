"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Greeting } from "./Greeting";
import { Messages } from "./Messages";
import { ChatInput } from "./ChatInput";
import { Message } from "@/lib/types/chat";
import {
  Share2,
  MoreHorizontal,
  Trash2,
  Download,
  RefreshCw
} from "lucide-react";

interface ChatProps {
  chatId?: string | null;
  initialMessages?: Message[];
}

export function Chat({ chatId, initialMessages = [] }: ChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const previousChatIdRef = useRef<string | null>(null);

  // Load messages when chatId changes or on mount
  useEffect(() => {
    const loadMessages = async (id: string) => {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/chats/${id}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    // If chatId changed
    if (chatId !== previousChatIdRef.current) {
      previousChatIdRef.current = chatId || null;

      if (chatId) {
        // Load messages for the chat
        loadMessages(chatId);
      } else {
        // Clear messages for new chat
        setMessages([]);
      }
    }
  }, [chatId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    let activeChatId = chatId;

    // Create a new chat if we don't have one
    if (!activeChatId) {
      try {
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.slice(0, 50) }),
        });
        if (response.ok) {
          const newChat = await response.json();
          activeChatId = newChat.id;
          // Navigate to the new chat URL
          router.push(`/chat/${activeChatId}`);
        }
      } catch (error) {
        console.error("Failed to create chat:", error);
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      chat_id: activeChatId!,
      role: "user",
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: content.trim() }),
      });

      // Get AI response using v2 API (LLM-based intent classification)
      const response = await fetch("/api/chat/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: activeChatId,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: uuidv4(),
        chat_id: activeChatId!,
        role: "assistant",
        content: data.message || "I'm here to help you plan your travel.",
        search_results: data.searchResults,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: assistantMessage.content,
          search_results: data.searchResults,
        }),
      });

      // Update chat title if it's the first message
      if (messages.length === 0) {
        await fetch(`/api/chats/${activeChatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.slice(0, 50) }),
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: uuidv4(),
        chat_id: activeChatId!,
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isLoading, messages, router]);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "TravelHub Chat",
        text: "Check out my travel conversation!",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Could add toast notification here
    }
  };

  const handleRefresh = () => {
    if (chatId) {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {/* Left: Platform Name */}
        <div className="flex items-center">
          <h1 className="font-semibold text-gray-900 dark:text-white">TravelHub</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Refresh chat"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Share chat"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </>
          )}

          {/* More Options */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    // Export chat functionality
                    const chatData = JSON.stringify(messages, null, 2);
                    const blob = new Blob([chatData], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `travelhub-chat-${chatId || "new"}.json`;
                    a.click();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Chat</span>
                </button>
                {chatId && (
                  <button
                    onClick={() => {
                      // This would need to call the delete API
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Chat</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Content */}
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto scrollbar-chat">
          <Greeting onSuggestionClick={handleSendMessage} />
        </div>
      ) : (
        <Messages messages={messages} isLoading={isLoading} />
      )}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

