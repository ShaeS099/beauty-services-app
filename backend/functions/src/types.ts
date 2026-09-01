/**
 * Shared types for the BeautyBooking backend.
 *
 * Keep this file purely type/interface definitions (no runtime code).
 * Express Request augmentation lives in `express.d.ts`.
 */

export type UserRole = 'client' | 'provider' | 'admin';

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

export const WEEKDAY_KEYS: (keyof Availability)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

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
  followerCount?: number; // denormalized count of `follows` docs targeting this provider
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
  interests?: UserInterests; // from onboarding quiz, drives feed personalization
  pushToken?: string; // Expo push token
  followingCount?: number; // denormalized count of providers this user follows
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** A user follows a provider — a public, social-facing relationship distinct from Favourites
 * (which is a private booking-oriented bookmark). Doc ID is `${followerId}_${providerId}`. */
export interface Follow {
  followerId: string;
  providerId: string;
  createdAt?: unknown;
}

/** Safe-to-expose subset of User, returned by the public `GET /users/:id`. */
export interface PublicUserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  role: UserRole;
}

export interface UserStats {
  followingCount: number;
  totalLikes: number;
  /** Only present when the profile being viewed is a provider. */
  followerCount?: number;
  rating?: RatingSummary;
}

export type PostMediaType = 'image' | 'video';

export interface Post {
  id: string;
  /** The posting user's uid. Named `providerId` for historical reasons (posts were originally
   * provider-portfolio-only); it now identifies the author regardless of role — an everyday post
   * from a client has a `providerId` that isn't necessarily an actual provider document. */
  providerId: string;
  mediaUrl: string;
  mediaType: PostMediaType;
  /** A generated still frame for video posts (grids can't thumbnail a raw video URL as an
   * image). Absent for image posts, which use mediaUrl directly. */
  thumbnailUrl?: string;
  caption?: string;
  /** Required for provider portfolio posts (drives Discover/search category filtering);
   * optional for everyday posts, which just won't get a category-match score boost in feeds. */
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

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  service: Service;
  date: string; // ISO string
  clientAddress: string;
  /** Best-effort geocoded coordinates for clientAddress, used to estimate a travel buffer
   * against the provider's adjacent bookings. Absent if geocoding failed or found no match. */
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

export interface ReviewVerificationRequest {
  status: 'verified' | 'rejected';
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
  interests?: UserInterests;
  pushToken?: string;
}

export interface CreateCommentRequest {
  text: string;
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
  action: 'add' | 'remove';
}
