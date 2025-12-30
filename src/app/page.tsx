"use client";

import { ChatLayout, Chat } from "@/components/chat";

export default function Home() {
  return (
    <ChatLayout currentChatId={null}>
      <Chat chatId={null} />
    </ChatLayout>
  );
}
