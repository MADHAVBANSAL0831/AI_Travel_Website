"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Plus,
  Trash2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Plane,
  Pencil,
  Share,
  Archive,
  Settings,
  LogOut,
  LogIn,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chat, GroupedChats } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface ChatSidebarProps {
  chats: Chat[];
  isLoading: boolean;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function groupChatsByDate(chats: Chat[]): GroupedChats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.created_at);
      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat);
      } else if (chatDate >= lastMonth) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }
      return groups;
    },
    { today: [], yesterday: [], lastWeek: [], lastMonth: [], older: [] } as GroupedChats
  );
}

export function ChatSidebar({
  chats,
  isLoading,
  onNewChat,
  onDeleteChat,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const pathname = usePathname();
  const currentChatId = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;
  const groupedChats = groupChatsByDate(chats);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-gray-900 text-white transition-all duration-300",
        isCollapsed ? "w-16" : "w-72"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center p-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {isCollapsed ? (
          // Collapsed: Show logo that changes to expand icon on hover
          <button
            onClick={onToggleCollapse}
            className="group/logo flex items-center justify-center"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover/logo:shadow-blue-500/30 group-hover/logo:bg-gray-800 group-hover/logo:from-gray-800 group-hover/logo:to-gray-800 group-hover/logo:shadow-none transition-all">
              <Plane className="h-4 w-4 text-white group-hover/logo:hidden" />
              <PanelLeft className="h-4 w-4 text-gray-400 group-hover/logo:text-white hidden group-hover/logo:block" />
            </div>
          </button>
        ) : (
          // Expanded: Show logo and collapse button
          <>
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all">
                <Plane className="h-4 w-4 text-white" />
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* New Chat Button */}
      <div className={cn("p-3", isCollapsed && "flex justify-center")}>
        <button
          onClick={onNewChat}
          className={cn(
            "flex items-center gap-2.5 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-gray-800 text-gray-300 hover:text-white",
            isCollapsed ? "p-2" : "w-full"
          )}
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span className="text-sm">New Chat</span>}
        </button>
      </div>

      {/* Chat List - only show when expanded */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 scrollbar-sidebar">
          {isLoading ? (
            <ChatListSkeleton isCollapsed={isCollapsed} />
          ) : chats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">Start a new chat to plan your trip!</p>
            </div>
          ) : (
            <ChatGroups
              groupedChats={groupedChats}
              currentChatId={currentChatId}
              onDeleteChat={onDeleteChat}
              isCollapsed={isCollapsed}
            />
          )}
        </div>
      )}

      {/* Spacer when collapsed to push user menu to bottom */}
      {isCollapsed && <div className="flex-1" />}

      {/* Footer */}
      <UserMenu isCollapsed={isCollapsed} />
    </aside>
  );
}

function ChatGroups({
  groupedChats, currentChatId, onDeleteChat, isCollapsed
}: {
  groupedChats: GroupedChats;
  currentChatId: string | null;
  onDeleteChat: (id: string) => void;
  isCollapsed: boolean;
}) {
  const sections = [
    { label: "Today", chats: groupedChats.today },
    { label: "Yesterday", chats: groupedChats.yesterday },
    { label: "Last 7 days", chats: groupedChats.lastWeek },
    { label: "Last 30 days", chats: groupedChats.lastMonth },
    { label: "Older", chats: groupedChats.older },
  ];

  return (
    <div className="space-y-4 py-2">
      {sections.map(({ label, chats }) =>
        chats.length > 0 && (
          <ChatSection
            key={label}
            label={label}
            chats={chats}
            currentChatId={currentChatId}
            onDeleteChat={onDeleteChat}
            isCollapsed={isCollapsed}
          />
        )
      )}
    </div>
  );
}

function ChatSection({
  label, chats, currentChatId, onDeleteChat
}: {
  label: string;
  chats: Chat[];
  currentChatId: string | null;
  onDeleteChat: (id: string) => void;
  isCollapsed: boolean;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
          <div className="h-px flex-1 bg-gradient-to-l from-gray-700 to-transparent" />
        </div>
      )}
      <div className="space-y-1">
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === currentChatId}
            onDelete={() => onDeleteChat(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ChatItem({
  chat, isActive, onDelete
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div className="relative group">
      <Link href={`/chat/${chat.id}`}>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
            isActive
              ? "bg-gradient-to-r from-gray-700/80 to-gray-700/40 shadow-lg shadow-black/10"
              : "hover:bg-gray-800/60"
          )}
        >
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm truncate block transition-colors leading-tight",
              isActive ? "text-white font-medium" : "text-gray-300"
            )}>
              {chat.title}
            </span>
            <span className="text-[10px] text-gray-500 truncate block mt-0.5">
              {new Date(chat.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Three dots menu button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200 flex-shrink-0",
              isActive
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
              showMenu ? "bg-gray-600" : "hover:bg-gray-600"
            )}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </Link>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
              // TODO: Implement rename
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span>Rename</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
              // TODO: Implement share
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Share className="h-4 w-4" />
            <span>Share</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
              // TODO: Implement archive
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Archive className="h-4 w-4" />
            <span>Archive</span>
          </button>
          <div className="border-t border-gray-700" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
              onDelete();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ChatListSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="space-y-2 py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          {!isCollapsed && (
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 bg-gray-800 rounded animate-pulse"
                style={{ width: `${70 + i * 10}%` }}
              />
              <div
                className="h-2.5 bg-gray-800/50 rounded animate-pulse"
                style={{ width: "50%" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="p-2">
      <p className="text-xs text-gray-500 px-1 mb-2">Theme</p>
      <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
              theme === value
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const router = useRouter();
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
    router.refresh();
  };

  // Get user initials and display name
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = user?.user_metadata?.avatar_url;

  if (loading) {
    return (
      <div className={cn(
        "border-t border-gray-800 p-3",
        isCollapsed && "flex justify-center border-t-0"
      )}>
        <div className={cn(
          "flex items-center gap-3 p-2",
          isCollapsed && "p-0"
        )}>
          <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
          {!isCollapsed && <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />}
        </div>
      </div>
    );
  }

  // Not authenticated - show Sign In button
  if (!isAuthenticated) {
    return (
      <div className={cn(
        "border-t border-gray-800 p-3",
        isCollapsed && "flex justify-center border-t-0"
      )}>
        <Link
          href="/login"
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity",
            isCollapsed ? "p-2" : "w-full"
          )}
          title="Sign In"
        >
          <LogIn className="h-4 w-4" />
          {!isCollapsed && <span className="text-sm">Sign In</span>}
        </Link>
      </div>
    );
  }

  // Authenticated - show user menu
  return (
    <div className={cn(
      "border-t border-gray-800 relative",
      isCollapsed && "border-t-0"
    )} ref={menuRef}>
      {/* User Menu Dropdown */}
      {showMenu && (
        <div className={cn(
          "absolute bottom-full mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200",
          isCollapsed ? "left-full ml-2 bottom-0 mb-0 w-48" : "left-2 right-2"
        )}>
          <div className="p-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>

          {/* Theme Selector */}
          <ThemeSelector />

          <div className="border-t border-gray-700" />

          <Link
            href="/admin"
            onClick={() => setShowMenu(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Admin Portal</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* User Button */}
      <div className={cn("p-3", isCollapsed && "flex justify-center")}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors",
            showMenu && "bg-gray-800",
            !isCollapsed && "w-full"
          )}
          title={displayName}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {initials}
            </div>
          )}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
              </div>
              <ChevronUp className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                showMenu && "rotate-180"
              )} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
