"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, Mic, Paperclip, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Tell me about your travel plans...",
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading || disabled) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-2">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200",
            "focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:shadow-xl"
          )}
        >
          {/* Attachment button (placeholder for future) */}
          <button
            type="button"
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl ml-1 transition-all duration-200 self-center"
            title="Attach file (coming soon)"
            disabled
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent py-3 px-2 text-base text-gray-900 dark:text-gray-100",
              "focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "max-h-[200px] overflow-y-auto"
            )}
          />

          {/* Voice input button (placeholder for future) */}
          <button
            type="button"
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 self-center"
            title="Voice input (coming soon)"
            disabled
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Send/Stop button */}
          <div className="p-2 self-center">
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="rounded-xl h-10 w-10"
                onClick={() => {
                  // TODO: Implement stop functionality
                }}
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                className={cn(
                  "rounded-xl h-10 w-10 transition-all duration-200",
                  inputValue.trim()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                )}
                disabled={!inputValue.trim() || disabled}
                onClick={handleSubmit}
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          TravelHub can make mistakes. Check important info before booking.
        </p>
      </div>
    </div>
  );
}

