"use client";

import { X, Plane, ExternalLink, Clock, Calendar, Users, Sparkles, ArrowRight, Shield, Tag } from "lucide-react";
import { SearchResult } from "@/lib/types/chat";
import { motion, AnimatePresence } from "framer-motion";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: SearchResult | null;
}

// Airline logos (using placeholder colors/initials for demo)
const airlineColors: Record<string, string> = {
  "AI": "bg-gradient-to-br from-orange-500 to-red-600",
  "6E": "bg-gradient-to-br from-indigo-600 to-blue-700",
  "UK": "bg-gradient-to-br from-purple-600 to-indigo-700",
  "SG": "bg-gradient-to-br from-yellow-500 to-orange-600",
  "G8": "bg-gradient-to-br from-green-500 to-emerald-600",
  "I5": "bg-gradient-to-br from-red-500 to-pink-600",
  "QP": "bg-gradient-to-br from-orange-400 to-amber-600",
  "EK": "bg-gradient-to-br from-red-600 to-red-800",
  "BA": "bg-gradient-to-br from-blue-800 to-blue-900",
  "LH": "bg-gradient-to-br from-yellow-400 to-blue-600",
  "QR": "bg-gradient-to-br from-purple-700 to-purple-900",
  "SQ": "bg-gradient-to-br from-yellow-500 to-yellow-700",
};

// Airline website mappings
const airlineWebsites: Record<string, string> = {
  "AI": "https://www.airindia.com",
  "6E": "https://www.goindigo.in",
  "UK": "https://www.airvistara.com",
  "SG": "https://www.flyspicejet.com",
  "G8": "https://www.goair.in",
  "I5": "https://www.airasiaindia.com",
  "QP": "https://www.akasaair.com",
  "EK": "https://www.emirates.com",
  "BA": "https://www.britishairways.com",
  "LH": "https://www.lufthansa.com",
  "QR": "https://www.qatarairways.com",
  "SQ": "https://www.singaporeair.com",
  "TG": "https://www.thaiairways.com",
};

function getBookingUrl(platform: string, flight: SearchResult): string {
  const details = flight.details;
  const origin = details.originCode || "";
  const destination = details.destinationCode || "";
  const date = details.date || ""; // Format: YYYY-MM-DD
  const airlineCode = details.airlineCode || "";
  const departureCity = details.departureCity || "";
  const arrivalCity = details.arrivalCity || "";

  // Parse date components
  const dateParts = date.split("-"); // [YYYY, MM, DD]
  const year = dateParts[0] || "";
  const month = dateParts[1] || "";
  const day = dateParts[2] || "";

  // Format: DD/MM/YYYY for some sites
  const dateSlash = `${day}/${month}/${year}`;
  // Format: DDMMYYYY
  const dateCompact = `${day}${month}${year}`;

  switch (platform) {
    case "google":
      // Google Flights format
      return `https://www.google.com/travel/flights/search?tfs=CBwQAhojEgoyMDI2LTAxLTE1agcIARIDJHtvcmn4AXIHCAESAyR7ZGVzdH0aIxIKMjAyNi0wMS0yMGoHCAESAyR7ZGVzdH1yBwgBEgMke29yaWd9&hl=en`.replace('${origin}', origin).replace('${dest}', destination)
        || `https://www.google.com/search?q=flights+from+${encodeURIComponent(departureCity)}+to+${encodeURIComponent(arrivalCity)}+on+${date}`;
    case "skyscanner":
      // Skyscanner: /transport/flights/{from}/{to}/{date}/ - date format: YYMMDD
      const skyscannerDate = date.replace(/-/g, "").slice(2); // YYMMDD
      return `https://www.skyscanner.co.in/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${skyscannerDate}/`;
    case "makemytrip":
      // MakeMyTrip format: itinerary=DEL-BOM-15/01/2026
      return `https://www.makemytrip.com/flight/search?itinerary=${origin}-${destination}-${dateSlash}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;
    case "cleartrip":
      // Cleartrip uses a different URL structure - let's use their search
      return `https://www.cleartrip.com/flights/${departureCity.toLowerCase().replace(/\s+/g, '-')}-${origin.toLowerCase()}-to-${arrivalCity.toLowerCase().replace(/\s+/g, '-')}-${destination.toLowerCase()}-${dateSlash.replace(/\//g, '-')}`;
    case "ixigo":
      // Ixigo format
      return `https://www.ixigo.com/search/result/flight?from=${origin}&to=${destination}&date=${dateCompact}&adults=1&children=0&infants=0&class=e&source=Search%20Form`;
    case "airline":
      const airlineUrl = airlineWebsites[airlineCode] || `https://www.google.com/search?q=${encodeURIComponent(details.airlineName + " book flight " + departureCity + " to " + arrivalCity)}`;
      return airlineUrl;
    default:
      return "#";
  }
}

export function BookingModal({ isOpen, onClose, flight }: BookingModalProps) {
  if (!flight) return null;

  const details = flight.details;
  const airlineCode = details.airlineCode || "AI";
  const airlineGradient = airlineColors[airlineCode] || "bg-gradient-to-br from-blue-600 to-indigo-700";

  const platforms = [
    {
      id: "airline",
      name: details.airlineName || "Airline Website",
      icon: <Plane className="h-5 w-5" />,
      gradient: "bg-gradient-to-r from-blue-600 to-blue-700",
      desc: "Best for frequent flyers",
      badge: "Direct"
    },
    {
      id: "makemytrip",
      name: "MakeMyTrip",
      icon: <span className="text-lg">🧳</span>,
      gradient: "bg-gradient-to-r from-red-500 to-rose-600",
      desc: "Most trusted in India",
      badge: "Popular"
    },
    {
      id: "ixigo",
      name: "ixigo",
      icon: <span className="text-lg">🎯</span>,
      gradient: "bg-gradient-to-r from-orange-500 to-amber-600",
      desc: "Price match guarantee",
      badge: null
    },
    {
      id: "google",
      name: "Google Flights",
      icon: <span className="text-lg">🔍</span>,
      gradient: "bg-gradient-to-r from-gray-700 to-gray-900",
      desc: "Compare all options",
      badge: null
    },
    {
      id: "skyscanner",
      name: "Skyscanner",
      icon: <span className="text-lg">🌐</span>,
      gradient: "bg-gradient-to-r from-cyan-600 to-teal-700",
      desc: "Global flight search",
      badge: null
    },
  ];

  // Format date nicely
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-transparent dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero Header with Gradient */}
              <div className={`${airlineGradient} p-6 relative overflow-hidden`}>
                {/* Background decoration - z-0 to stay behind */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 z-0 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none" />

                {/* Close button - z-20 to stay on top */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="absolute top-4 right-4 z-20 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-white" />
                </button>

                {/* Airline & Flight Info */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-gray-800">{airlineCode}</span>
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg">{details.airlineName}</h2>
                      <p className="text-white/80 text-sm">{details.flightNumber} • {details.class}</p>
                    </div>
                  </div>

                  {/* Route Display */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{details.departure}</p>
                        <p className="text-white font-medium">{details.originCode}</p>
                        <p className="text-white/70 text-xs mt-1">{details.departureCity}</p>
                      </div>

                      <div className="flex-1 px-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-white/80" />
                          <span className="text-sm text-white/80 font-medium">{details.duration}</span>
                        </div>
                        <div className="relative flex items-center">
                          <div className="flex-1 h-[2px] bg-white/30" />
                          <div className="absolute left-0 w-2 h-2 bg-white rounded-full" />
                          <Plane className="mx-2 h-5 w-5 text-white" />
                          <div className="absolute right-0 w-2 h-2 bg-white rounded-full" />
                          <div className="flex-1 h-[2px] bg-white/30" />
                        </div>
                        <p className="text-xs text-white/70 text-center mt-2">{details.stops}</p>
                      </div>

                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{details.arrival}</p>
                        <p className="text-white font-medium">{details.destinationCode}</p>
                        <p className="text-white/70 text-xs mt-1">{details.arrivalCity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flight Meta & Price */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{formatDate(details.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">1 Adult</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    ₹{flight.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">per person</p>
                </div>
              </div>

              {/* Booking Platforms */}
              <div className="p-6 max-h-[300px] overflow-y-auto scrollbar-modal">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Book on your preferred platform</p>
                </div>

                <div className="space-y-3">
                  {platforms.map((platform, index) => (
                    <motion.a
                      key={platform.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      href={getBookingUrl(platform.id, flight)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between w-full p-4 rounded-2xl text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${platform.gradient}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          {platform.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{platform.name}</span>
                            {platform.badge && (
                              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium">
                                {platform.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-white/80">{platform.desc}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <span className="text-sm font-medium">Book</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </motion.a>
                  ))}
                </div>

                {/* Trust badges */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-6 text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs">Secure Booking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4" />
                      <span className="text-xs">Best Price</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 text-center">
                    Prices shown are indicative. Final price may vary on the booking platform.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

