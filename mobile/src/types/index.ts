// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "client" | "provider";
  bookings: string[];
  favourites: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// Provider types
export interface Provider {
  id: string;
  name: string;
  photoUrl: string;
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  bio: string;
  categories: string[];
  services: Service[];
  availability: Availability;
  ratings: number;
  reviews: Review[];
  createdAt: Date;
}

export interface Service {
  name: string;
  price: number;
  category: string;
  durationMins: number;
}

export interface Availability {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

export interface TimeSlot {
  start: string; // Format: "HH:MM"
  end: string; // Format: "HH:MM"
}

export interface Review {
  userId: string;
  rating: number;
  comment: string;
  date: Date;
}

// Booking types
export interface Booking {
  id: string;
  providerId: string;
  userId: string;
  service: {
    name: string;
    price: number;
  };
  date: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Filter types
export interface ProviderFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

// Booking request types
export interface CreateBookingRequest {
  providerId: string;
  service: {
    name: string;
    price: number;
  };
  date: string; // ISO date string
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

// Favourites types
export interface FavouritesRequest {
  providerId: string;
  action: "add" | "remove";
}

// Service categories
export const SERVICE_CATEGORIES = [
  "Hair",
  "Nails",
  "Makeup",
  "Barber",
  "Esthetics",
  "Styling",
  "Nail Art",
  "Bridal",
  "Beard",
  "Waxing",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// Booking status
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
