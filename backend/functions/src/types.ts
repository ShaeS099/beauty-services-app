/**
 * Shared types for the BeautyBooking backend.
 *
 * Keep this file purely type/interface definitions (no runtime code).
 * Express Request augmentation lives in `express.d.ts`.
 */

export type UserRole = 'client' | 'provider';

export interface GeoLocation {
  city: string;
  lat: number;
  lng: number;
}

export interface RatingSummary {
  average: number; // 0-5
  count: number;   // number of ratings
}

export interface Service {
  name: string;
  price: number;        // numeric currency amount (e.g. GBP)
  category: string;     // e.g. "Hair", "Nails"
  durationMins: number; // e.g. 30
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface Availability {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface Provider {
  id: string;
  name: string;
  photoUrl?: string;
  location: GeoLocation;
  bio: string;
  categories: string[];
  services: Service[];
  availability?: Availability;
  ratings?: RatingSummary;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  favourites?: string[]; // providerIds
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  service: Service;
  date: string; // ISO string
  notes?: string;
  status: BookingStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Requests */

export interface CreateUserRequest {
  name: string;
  email: string;
  role?: UserRole;
  photoUrl?: string;
}

export interface UpdateUserRequest {
  name?: string;
  photoUrl?: string;
}

export interface UpsertProviderRequest {
  name: string;
  photoUrl?: string;
  location: GeoLocation;
  bio: string;
  categories: string[];
  services: Service[];
  availability?: Availability;
}

export interface CreateBookingRequest {
  providerId: string;
  service: Service;
  date: string; // ISO string
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}

export interface FavouritesRequest {
  providerId: string;
  action: 'add' | 'remove';
}
