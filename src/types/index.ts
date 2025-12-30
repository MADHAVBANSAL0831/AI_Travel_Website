// ============================================
// FLIGHT TYPES
// ============================================
export interface FlightSearch {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  tripType: "one-way" | "round-trip";
}

export interface Flight {
  id: string;
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  cabinClass: string;
  seatsAvailable: number;
}

// ============================================
// HOTEL TYPES
// ============================================
export interface HotelSearch {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  pricePerNight: {
    amount: number;
    currency: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  size: number;
  amenities: string[];
  images: string[];
  pricePerNight: {
    amount: number;
    currency: string;
  };
  available: boolean;
}

// ============================================
// BOOKING TYPES
// ============================================
export interface Booking {
  id: string;
  reference: string;
  userId: string;
  type: "flight" | "hotel";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  totalAmount: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "refunded";
  details: FlightBookingDetails | HotelBookingDetails;
}

export interface FlightBookingDetails {
  flight: Flight;
  passengers: Passenger[];
}

export interface HotelBookingDetails {
  hotel: Hotel;
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: Guest[];
}

export interface Passenger {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passportNumber?: string;
}

export interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ============================================
// USER TYPES
// ============================================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: "user" | "admin";
  createdAt: string;
}

