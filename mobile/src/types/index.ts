/**
 * Client-side mirror of backend/functions/src/types.ts.
 * Keep these in sync with the backend contract.
 */

export type UserRole = "client" | "provider" | "admin";

export interface GeoLocation {
  city: string;
  lat: number;
  lng: number;
}

export interface RatingSummary {
  average: number; // 0-5
  count: number;
}

export interface Service {
  name: string;
  price: number;
  category: string;
  durationMins: number;
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
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

export const WEEKDAY_KEYS: (keyof Availability)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

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
  hairTypes?: string[]; // specializations, e.g. ['4A','4B','Braids']
  verificationStatus?: VerificationStatus; // absent/undefined treated as 'unverified'
  verificationDocUrl?: string; // private Storage URL — never exposed publicly
  verificationSubmittedAt?: unknown;
  followerCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserInterests {
  categories: string[];
  subcategories: string[];
  hairTypes: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  favourites?: string[]; // providerIds
  interests?: UserInterests;
  pushToken?: string; // Expo push token
  followingCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserStats {
  followingCount: number;
  totalLikes: number;
  /** Only present when the profile being viewed is a provider. */
  followerCount?: number;
  rating?: RatingSummary;
}

/** Safe-to-expose subset of User, returned by the public GET /users/:id. */
export interface PublicUserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  role: UserRole;
}

export type PostMediaType = "image" | "video";

export interface Post {
  id: string;
  /** The posting user's uid — named `providerId` for historical reasons; it now identifies the
   * author regardless of role. A category-less post is an "everyday" post; a categorized one is
   * a provider portfolio piece (see ProfileScreen/MyPortfolioScreen for how these are split). */
  providerId: string;
  mediaUrl: string;
  mediaType: PostMediaType;
  /** A generated still frame for video posts — grids can't thumbnail a raw video URL as an
   * image. Absent for image posts, which use mediaUrl directly. */
  thumbnailUrl?: string;
  caption?: string;
  category?: string;
  subcategory?: string;
  hairTypes?: string[];
  likeCount: number;
  saveCount: number;
  commentCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Derived per-request for the calling user; not stored on the document. */
  likedByMe?: boolean;
  savedByMe?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt?: unknown;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  service: Service;
  date: string; // ISO string
  clientAddress: string;
  /** Best-effort geocoded coordinates for clientAddress, set server-side; used for the
   * distance-aware travel buffer between a provider's adjacent bookings. */
  clientLat?: number;
  clientLng?: number;
  notes?: string;
  status: BookingStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Derived per-request for the calling client user; not stored on the document. */
  hasReview?: boolean;
  /** Derived per-request for a calling provider user (the client's display name); not stored on the document. */
  userName?: string;
  /** Reminder idempotency flags — set once the corresponding reminder push has been sent. */
  remindedAt24h?: boolean;
  remindedAt1h?: boolean;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: unknown;
}

export interface SendMessageRequest {
  text: string;
}

export interface Review {
  id: string; // === bookingId
  bookingId: string;
  userId: string;
  userName: string;
  providerId: string;
  rating: number; // integer 1-5
  text?: string;
  createdAt?: unknown;
}

export interface CreateReviewRequest {
  rating: number;
  text?: string;
}

export interface CreatePostRequest {
  mediaUrl: string;
  mediaType: PostMediaType;
  thumbnailUrl?: string;
  category?: string;
  subcategory?: string;
  hairTypes?: string[];
  caption?: string;
}

export interface SubmitVerificationRequest {
  documentUrl: string;
}

/** Requests */

export interface UpdateUserRequest {
  name?: string;
  photoUrl?: string;
  interests?: UserInterests;
  pushToken?: string;
}

export interface UpsertProviderRequest {
  name: string;
  photoUrl?: string;
  location: GeoLocation;
  bio: string;
  categories: string[];
  services: Service[];
  availability?: Availability;
  hairTypes?: string[];
}

export interface CreateBookingRequest {
  providerId: string;
  service: Service;
  date: string; // ISO string
  clientAddress: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}

export interface FavouritesRequest {
  providerId: string;
  action: "add" | "remove";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const SERVICE_CATEGORIES = [
  "Hair",
  "Nails",
  "Makeup",
  "Barber",
  "Esthetics",
  "Styling",
  "Bridal",
  "Waxing",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;
