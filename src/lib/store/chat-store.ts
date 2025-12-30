// Shared in-memory store for chats and messages
// This ensures data persists across API route calls during development
// In production, this should be replaced with Supabase

export interface StoredChat {
  id: string;
  user_id: string | null;
  title: string;
  visibility: "public" | "private";
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  search_results?: unknown[];
  created_at: string;
}

// Global stores - these persist across API calls in the same Node.js process
const globalForStore = globalThis as unknown as {
  chatsStore: Map<string, StoredChat> | undefined;
  messagesStore: Map<string, StoredMessage[]> | undefined;
};

export const chatsStore = globalForStore.chatsStore ?? new Map<string, StoredChat>();
export const messagesStore = globalForStore.messagesStore ?? new Map<string, StoredMessage[]>();

// Preserve stores across hot reloads in development
if (process.env.NODE_ENV !== "production") {
  globalForStore.chatsStore = chatsStore;
  globalForStore.messagesStore = messagesStore;
}

// Helper functions
export function getChat(chatId: string): StoredChat | undefined {
  return chatsStore.get(chatId);
}

export function getAllChats(): StoredChat[] {
  return Array.from(chatsStore.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function createChat(chat: StoredChat): StoredChat {
  chatsStore.set(chat.id, chat);
  return chat;
}

export function updateChat(chatId: string, updates: Partial<StoredChat>): StoredChat | null {
  const chat = chatsStore.get(chatId);
  if (!chat) return null;
  
  const updatedChat = { ...chat, ...updates, updated_at: new Date().toISOString() };
  chatsStore.set(chatId, updatedChat);
  return updatedChat;
}

export function deleteChat(chatId: string): boolean {
  messagesStore.delete(chatId); // Also delete messages
  return chatsStore.delete(chatId);
}

export function getMessages(chatId: string): StoredMessage[] {
  return (messagesStore.get(chatId) || []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function addMessage(message: StoredMessage): StoredMessage {
  const chatMessages = messagesStore.get(message.chat_id) || [];
  chatMessages.push(message);
  messagesStore.set(message.chat_id, chatMessages);
  return message;
}

export function clearMessages(chatId: string): void {
  messagesStore.delete(chatId);
}

