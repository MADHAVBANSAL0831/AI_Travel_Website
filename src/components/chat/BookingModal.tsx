"use client";

import { X, Plane, ExternalLink, Clock, Calendar, Users, Sparkles, ArrowRight, Shield, Tag } from "lucide-react";
import { SearchResult } from "@/lib/types/chat";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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

// Airline-specific booking URLs with flight number support
const airlineBookingUrls: Record<string, (origin: string, dest: string, date: string, flightNum: string) => string> = {
  "AI": (o, d, dt, fn) => `https://www.airindia.com/in/en/book.html?origin=${o}&destination=${d}&departDate=${dt}&flightNumber=${fn}`,
  "6E": (o, d, dt) => `https://www.goindigo.in/flight-booking.html?origin=${o}&destination=${d}&departDate=${dt}&tripType=O&noOfAdults=1`,
  "UK": (o, d, dt) => `https://www.airvistara.com/in/en/book?type=flight&origin=${o}&destination=${d}&departDate=${dt}`,
  "SG": (o, d, dt) => `https://www.spicejet.com/flight-booking?origin=${o}&destination=${d}&departDate=${dt}`,
  "QP": (o, d, dt) => `https://www.akasaair.com/booking?origin=${o}&destination=${d}&date=${dt}`,
  "G8": (o, d, dt) => `https://www.goair.in/plan-my-trip/booking?origin=${o}&destination=${d}&date=${dt}`,
};

// Airline name to code mapping for filtering
const airlineNameToCode: Record<string, string> = {
  "Air India": "AI", "IndiGo": "6E", "Vistara": "UK", "SpiceJet": "SG",
  "GoAir": "G8", "Akasa Air": "QP", "Air India Express": "IX",
  "Emirates": "EK", "Qatar Airways": "QR", "Singapore Airlines": "SQ",
};

function getBookingUrl(platform: string, flight: SearchResult): string {
  const details = flight.details;
  const origin = details.originCode || "";
  const destination = details.destinationCode || "";
  const date = details.date || ""; // Format: YYYY-MM-DD
  const airlineCode = details.airlineCode || "";
  const airlineName = details.airlineName || "";
  const departureCity = details.departureCity || "";
  const arrivalCity = details.arrivalCity || "";
  const flightNumber = details.flightNumber || "";
  const departureTime = details.departure || "";

  // Parse date components
  const dateParts = date.split("-"); // [YYYY, MM, DD]
  const year = dateParts[0] || "";
  const month = dateParts[1] || "";
  const day = dateParts[2] || "";

  // Format: DD/MM/YYYY for some sites
  const dateSlash = `${day}/${month}/${year}`;
  // Format: DDMMYYYY
  const dateCompact = `${day}${month}${year}`;
  // Format: YYMMDD for skyscanner
  const skyscannerDate = date.replace(/-/g, "").slice(2);

  switch (platform) {
    case "google":
      // Google Flights with airline filter - search for specific airline
      return `https://www.google.com/travel/flights?q=flights%20from%20${encodeURIComponent(departureCity)}%20to%20${encodeURIComponent(arrivalCity)}%20on%20${date}%20${encodeURIComponent(airlineName)}`;

    case "skyscanner":
      // Skyscanner with airline filter parameter
      return `https://www.skyscanner.co.in/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${skyscannerDate}/?adultsv2=1&cabinclass=economy&childrenv2=&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false&carrier=${airlineCode}`;

    case "makemytrip":
      // MakeMyTrip - add airline preference in search
      return `https://www.makemytrip.com/flight/search?itinerary=${origin}-${destination}-${dateSlash}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E&ccde=IN&lang=eng&airlines=${airlineCode}`;

    case "cleartrip":
      // Cleartrip with airline filter
      return `https://www.cleartrip.com/flights/results?from=${origin}&to=${destination}&depart_date=${date}&adults=1&childs=0&infants=0&class=Economy&airline=${airlineCode}&sd=${departureTime}`;

    case "ixigo":
      // ixigo with airline code filter
      return `https://www.ixigo.com/search/result/flight?from=${origin}&to=${destination}&date=${dateCompact}&adults=1&children=0&infants=0&class=e&airlines=${airlineCode}`;

    case "airline":
      // Direct airline website with specific route and date
      const airlineBookingFn = airlineBookingUrls[airlineCode];
      if (airlineBookingFn) {
        return airlineBookingFn(origin, destination, date, flightNumber.split(" ")[1] || "");
      }
      // Fallback: Google search for specific flight
      return `https://www.google.com/search?q=${encodeURIComponent(`${airlineName} ${flightNumber} ${departureCity} to ${arrivalCity} ${date} book`)}`;

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
      icon: <Plane className="h-5 w-5 text-white" />,
      iconBg: "bg-white/20",
      gradient: "bg-gradient-to-r from-blue-600 to-blue-700",
      desc: "Best for frequent flyers",
      badge: "Direct"
    },
    {
      id: "makemytrip",
      name: "MakeMyTrip",
      icon: <Image src="/icons/makemytrip.ico" alt="MakeMyTrip" width={28} height={28} className="rounded object-contain" unoptimized />,
      iconBg: "bg-white",
      gradient: "bg-gradient-to-r from-red-500 to-rose-600",
      desc: "Most trusted in India",
      badge: "Popular"
    },
    {
      id: "ixigo",
      name: "ixigo",
      icon: <Image src="/icons/ixigo.ico" alt="ixigo" width={28} height={28} className="rounded object-contain" unoptimized />,
      iconBg: "bg-white",
      gradient: "bg-gradient-to-r from-orange-500 to-amber-600",
      desc: "Price match guarantee",
      badge: null
    },
    {
      id: "google",
      name: "Google Flights",
      icon: <Image src="/icons/google.png" alt="Google Flights" width={28} height={28} className="rounded object-contain" />,
      iconBg: "bg-white",
      gradient: "bg-gradient-to-r from-blue-500 to-blue-700",
      desc: "Compare all options",
      badge: null
    },
    {
      id: "skyscanner",
      name: "Skyscanner",
      icon: <Image src="/icons/skyscanner.ico" alt="Skyscanner" width={28} height={28} className="rounded object-contain" unoptimized />,
      iconBg: "bg-white",
      gradient: "bg-gradient-to-r from-cyan-500 to-teal-600",
      desc: "Global flight search",
      badge: null
    },
    {
      id: "cleartrip",
      name: "Cleartrip",
      icon: <Image src="/icons/cleartrip.ico" alt="Cleartrip" width={28} height={28} className="rounded object-contain" unoptimized />,
      iconBg: "bg-white",
      gradient: "bg-gradient-to-r from-orange-500 to-red-600",
      desc: "Quick & easy booking",
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4"
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-2xl max-w-md w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden border border-transparent dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero Header with Gradient */}
              <div className={`${airlineGradient} p-4 md:p-6 relative overflow-hidden`}>
                {/* Background decoration - z-0 to stay behind */}
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 z-0 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none" />

                {/* Close button - z-20 to stay on top */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="absolute top-3 right-3 md:top-4 md:right-4 z-20 p-1.5 md:p-2 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </button>

                {/* Airline & Flight Info */}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="font-bold text-gray-800 text-sm md:text-base">{airlineCode}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-white font-bold text-base md:text-lg truncate">{details.airlineName}</h2>
                      <p className="text-white/80 text-xs md:text-sm truncate">{details.flightNumber} • {details.class}</p>
                    </div>
                  </div>

                  {/* Route Display */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-center flex-shrink-0">
                        <p className="text-2xl md:text-3xl font-bold text-white">{details.departure}</p>
                        <p className="text-white font-medium text-xs md:text-sm">{details.originCode}</p>
                        <p className="text-white/70 text-[10px] md:text-xs mt-0.5 md:mt-1 truncate max-w-[60px] md:max-w-none">{details.departureCity}</p>
                      </div>

                      <div className="flex-1 px-2 md:px-4 min-w-0">
                        <div className="flex items-center justify-center gap-1 md:gap-2 mb-1 md:mb-2">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-white/80 flex-shrink-0" />
                          <span className="text-xs md:text-sm text-white/80 font-medium truncate">{details.duration}</span>
                        </div>
                        <div className="relative flex items-center">
                          <div className="flex-1 h-[2px] bg-white/30" />
                          <div className="absolute left-0 w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                          <Plane className="mx-1 md:mx-2 h-4 w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
                          <div className="absolute right-0 w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                          <div className="flex-1 h-[2px] bg-white/30" />
                        </div>
                        <p className="text-[10px] md:text-xs text-white/70 text-center mt-1 md:mt-2 truncate">{details.stops}</p>
                      </div>

                      <div className="text-center flex-shrink-0">
                        <p className="text-2xl md:text-3xl font-bold text-white">{details.arrival}</p>
                        <p className="text-white font-medium text-xs md:text-sm">{details.destinationCode}</p>
                        <p className="text-white/70 text-[10px] md:text-xs mt-0.5 md:mt-1 truncate max-w-[60px] md:max-w-none">{details.arrivalCity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flight Meta & Price */}
              <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 md:gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium truncate">{formatDate(details.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium">1 Adult</span>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    ₹{(flight.price || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">per person</p>
                </div>
              </div>

              {/* Booking Platforms */}
              <div className="p-4 md:p-6 max-h-[350px] md:max-h-[300px] overflow-y-auto scrollbar-modal">
                <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                  <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Book on your preferred platform</p>
                </div>

                <div className="space-y-2 md:space-y-3">
                  {platforms.map((platform, index) => (
                    <motion.a
                      key={platform.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      href={getBookingUrl(platform.id, flight)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between w-full p-3 md:p-4 rounded-xl md:rounded-2xl text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${platform.gradient}`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 md:w-10 md:h-10 ${platform.iconBg} rounded-lg md:rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0`}>
                          {platform.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="font-semibold text-sm md:text-base truncate">{platform.name}</span>
                            {platform.badge && (
                              <span className="px-1.5 md:px-2 py-0.5 bg-white/20 rounded-full text-[9px] md:text-[10px] font-medium flex-shrink-0">
                                {platform.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] md:text-xs text-white/80 truncate block">{platform.desc}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0">
                        <span className="text-xs md:text-sm font-medium hidden sm:inline">Book</span>
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                    </motion.a>
                  ))}
                </div>

                {/* Trust badges */}
                <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-4 md:gap-6 text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="text-[11px] md:text-xs">Secure Booking</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Tag className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="text-[11px] md:text-xs">Best Price</span>
                    </div>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 mt-2 md:mt-3 text-center px-2">
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

