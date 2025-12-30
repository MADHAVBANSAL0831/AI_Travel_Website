"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Chat, Message } from "@/lib/types/chat";
import { useAuth } from "@/lib/hooks/useAuth";

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const lastFetchRef = useRef<number>(0);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const fetchChats = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setChats([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/chats");
      if (response.status === 401) {
        // User not authenticated
        setChats([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch chats");
      const data = await response.json();
      setChats(data.chats || []);
      lastFetchRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchChats();
    }
  }, [fetchChats, authLoading, isAuthenticated]);

  // Refetch when pathname changes (e.g., navigating to a new chat)
  useEffect(() => {
    // Only refetch if it's been more than 500ms since last fetch and authenticated
    if (isAuthenticated && Date.now() - lastFetchRef.current > 500) {
      fetchChats();
    }
  }, [pathname, fetchChats, isAuthenticated]);

  const createChat = useCallback(async (title?: string): Promise<Chat | null> => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "New Chat" }),
      });
      if (!response.ok) throw new Error("Failed to create chat");
      const newChat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      return newChat;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete chat");
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update chat");
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  return {
    chats,
    isLoading,
    error,
    fetchChats,
    createChat,
    deleteChat,
    updateChatTitle,
  };
}

export function useChatMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    fetchMessages,
    addMessage,
    clearMessages,
  };
}

