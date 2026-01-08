"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Plane, Hotel, ArrowRight, Loader2, Copy, Check, ThumbsUp, ThumbsDown, ExternalLink, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, SearchResult } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { BookingModal } from "./BookingModal";
import ReactMarkdown from "react-markdown";

type SortOption = "recommended" | "price_low" | "price_high" | "duration";

interface MessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function Messages({ messages, isLoading }: MessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFlight, setSelectedFlight] = useState<SearchResult | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleBookFlight = (flight: SearchResult) => {
    setSelectedFlight(flight);
    setIsBookingModalOpen(true);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-chat">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} onBookFlight={handleBookFlight} />
            ))}
          </AnimatePresence>
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        flight={selectedFlight}
      />
    </>
  );
}

function MessageBubble({ message, index, onBookFlight }: { message: Message; index: number; onBookFlight: (flight: SearchResult) => void }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      layout={false}
      className={cn("flex gap-4 group", isUser ? "justify-end" : "justify-start")}
    >
      {/* Assistant Avatar - only for non-user messages */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={cn(isUser ? "max-w-[60%]" : "max-w-[75%]", isUser && "text-right")}>
        {/* User message styling */}
        {isUser ? (
          <div className="inline-block">
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1 px-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ) : (
          /* Assistant message styling with markdown */
          <div className="inline-block">
            <div className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed markdown-content">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="font-bold mt-2 mb-1">{children}</h3>,
                  code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{children}</a>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">{children}</blockquote>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {/* Action buttons - visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                  title="Copy message"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                  title="Good response"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                  title="Bad response"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results with Filtering and Load More */}
        {message.search_results && message.search_results.length > 0 && (
          <SearchResultsContainer results={message.search_results} onBook={onBookFlight} />
        )}
      </div>

      {/* User Avatar - only for user messages */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  );
}

function SearchResultsContainer({ results, onBook }: { results: SearchResult[]; onBook: (flight: SearchResult) => void }) {
  const [sortBy, setSortBy] = useState<SortOption>("price_low"); // Default to lowest price
  const [currentPage, setCurrentPage] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const ITEMS_PER_PAGE = 5;

  // Separate flights/hotels from info cards
  const bookableResults = results.filter(r => r.type === "flight" || r.type === "hotel");
  const infoResults = results.filter(r => r.type === "info");

  // Sort the bookable results
  const sortedResults = useMemo(() => {
    const sorted = [...bookableResults];
    switch (sortBy) {
      case "price_low":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price_high":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "duration":
        return sorted.sort((a, b) => {
          const durationA = a.details?.duration || "99H";
          const durationB = b.details?.duration || "99H";
          return durationA.localeCompare(durationB);
        });
      case "recommended":
      default:
        return sorted;
    }
  }, [bookableResults, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visibleResults = sortedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "price_low", label: "Lowest Price" },
    { value: "price_high", label: "Highest Price" },
    { value: "duration", label: "Shortest Duration" },
    { value: "recommended", label: "Recommended" },
  ];

  return (
    <div className="mt-4 space-y-3">
      {/* Filter/Sort Dropdown - only show if there are bookable results */}
      {bookableResults.length > 1 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {bookableResults.length} {bookableResults[0]?.type === "flight" ? "flights" : "hotels"} found
          </span>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {sortOptions.find(o => o.value === sortBy)?.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px] overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setCurrentPage(0); // Reset to first page on sort change
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                      sortBy === option.value && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bookable Results (Flights/Hotels) with pagination */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {visibleResults.map((result, index) => (
            <SearchResultCard key={result.id} result={result} onBook={onBook} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {/* Previous Button */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "p-2 rounded-lg transition-all",
              currentPage === 0
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Page Indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentPage === i
                    ? "bg-blue-600 dark:bg-blue-500 w-6"
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                )}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className={cn(
              "p-2 rounded-lg transition-all",
              currentPage === totalPages - 1
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Page number text */}
      {totalPages > 1 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Page {currentPage + 1} of {totalPages}
        </p>
      )}

      {/* Info Results (Web Search) - Always show all */}
      {infoResults.length > 0 && (
        <div className="mt-4 space-y-3">
          {infoResults.map((result) => (
            <SearchResultCard key={result.id} result={result} onBook={onBook} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ result, onBook }: { result: SearchResult; onBook: (flight: SearchResult) => void }) {
  const isFlight = result.type === "flight";
  const isInfo = result.type === "info";
  const departure = result.details?.departure;
  const arrival = result.details?.arrival;
  const duration = result.details?.duration;
  const stops = result.details?.stops;
  const flightNumber = result.details?.flightNumber;

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlight) {
      onBook(result);
    } else if (isInfo && result.url) {
      // For info cards, open the source URL
      window.open(result.url, "_blank");
    } else {
      // For hotels, open a Google search for now
      const hotelName = encodeURIComponent(result.title);
      const location = encodeURIComponent(result.subtitle);
      window.open(`https://www.google.com/travel/hotels?q=${hotelName}+${location}`, "_blank");
    }
  };

  // Info Card (from web search)
  if (isInfo) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 cursor-pointer"
        onClick={handleBookClick}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex-shrink-0">
            <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{result.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{result.subtitle}</p>
            {result.details?.source && (
              <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">{result.details.source}</p>
            )}
          </div>
          <Button size="sm" variant="outline" className="rounded-lg text-xs px-3 flex-shrink-0" onClick={handleBookClick}>
            Read <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
      onClick={handleBookClick}
    >
      {isFlight ? (
        // Compact Flight Card with prominent timings
        <div className="flex items-center gap-4">
          {/* Airline Icon */}
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
            <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Flight Times - Prominent */}
          <div className="flex items-center gap-3 flex-1">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{departure || "N/A"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{result.title.split("→")[0]?.trim()}</p>
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[100px]">
              <p className="text-xs text-gray-400 dark:text-gray-500">{duration}</p>
              <div className="relative w-full h-px bg-gray-300 dark:bg-gray-600 my-1">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{stops}</p>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{arrival || "N/A"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{result.title.split("→")[1]?.trim()}</p>
            </div>
          </div>

          {/* Airline & Flight */}
          <div className="text-center flex-shrink-0 hidden sm:block">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.subtitle}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{flightNumber}</p>
          </div>

          {/* Price & Book */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{result.price?.toLocaleString() || "N/A"}</p>
            </div>
            <Button size="sm" className="rounded-lg text-xs px-3" onClick={handleBookClick}>
              Book <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        // Hotel Card (compact design)
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex-shrink-0">
            <Hotel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{result.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{result.price?.toLocaleString() || "N/A"}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">per night</p>
            </div>
            <Button size="sm" className="rounded-lg text-xs px-3" onClick={handleBookClick}>
              Book <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center py-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </motion.div>
  );
}

