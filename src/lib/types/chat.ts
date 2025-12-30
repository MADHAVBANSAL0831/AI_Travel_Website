export interface Chat {
  id: string;
  user_id: string | null;
  title: string;
  visibility: "public" | "private";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  search_results?: SearchResult[];
  created_at: string;
}

export interface SearchResult {
  type: "flight" | "hotel" | "info";
  id: string;
  title: string;
  subtitle: string;
  price?: number;
  details: Record<string, string>;
  image?: string;
  url?: string;
}

export interface ChatHistory {
  chats: Chat[];
  hasMore: boolean;
}

export type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

