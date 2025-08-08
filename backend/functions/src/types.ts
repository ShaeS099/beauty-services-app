import { DecodedIdToken } from 'firebase-admin/auth';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

// Provider interface
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
  createdAt: any; // Firestore Timestamp
}

// Service interface
export interface Service {
  name: string;
  price: number;
  category: string;
  durationMins: number;
}

// Availability interface
export interface Availability {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

// TimeSlot interface
export interface TimeSlot {
  start: string;
  end: string;
}

// Review interface
export interface Review {
  userId: string;
  rating: number;
  comment: string;
  date: Date;
}

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'provider';
  bookings: string[];
  favourites: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Booking interface
export interface Booking {
  id: string;
  providerId: string;
  userId: string;
  service: {
    name: string;
    price: number;
  };
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Request body interfaces
export interface CreateUserRequest {
  name: string;
  email: string;
  role?: 'client' | 'provider';
}

export interface UpdateUserRequest {
  name?: string;
  role?: 'client' | 'provider';
  favourites?: string[];
}

export interface CreateBookingRequest {
  providerId: string;
  service: {
    name: string;
    price: number;
  };
  date: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface FavouritesRequest {
  providerId: string;
  action: 'add' | 'remove';
} 