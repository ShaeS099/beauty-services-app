import { auth } from "./firebase";
import {
  User,
  Provider,
  Booking,
  BookingStatus,
  UpdateUserRequest,
  UpsertProviderRequest,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  FavouritesRequest,
  ApiResponse,
  Post,
  PostComment,
  Review,
  CreateReviewRequest,
  CreatePostRequest,
  ChatMessage,
  SubmitVerificationRequest,
  UserStats,
  PublicUserProfile,
} from "../types";

export type FeedMode = "foryou" | "discover";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const REQUEST_TIMEOUT_MS = 15000;

export interface ProviderQuery {
  city?: string;
  category?: string;
  hairType?: string;
  limit?: number;
}

/** Rejects with a timeout error if `promise` doesn't settle within `ms` — neither
 * Firebase's `getIdToken()` nor `fetch()` time out on their own, and a single stalled
 * request must never be able to hang a screen's loading state forever. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return withTimeout(user.getIdToken(), REQUEST_TIMEOUT_MS, "Auth token refresh");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data?.error || `Request failed: ${response.status}` };
      }
      return { success: true, data: data as T };
    } catch (error) {
      console.error(`API request failed (${endpoint}):`, error);
      const message = error instanceof Error && error.name === "AbortError" ? "Request timed out" : "Network error occurred";
      return { success: false, error: message };
    }
  }

  // Health
  getHealth(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request("/health");
  }

  // Users
  getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me");
  }

  updateUserProfile(updates: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  updateFavourites(body: FavouritesRequest): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me/favourites", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Providers
  getProviders(query: ProviderQuery = {}): Promise<ApiResponse<Provider[]>> {
    const params = new URLSearchParams();
    if (query.city) params.append("city", query.city);
    if (query.category) params.append("category", query.category);
    if (query.hairType) params.append("hairType", query.hairType);
    if (query.limit) params.append("limit", String(query.limit));
    const qs = params.toString();
    return this.request<Provider[]>(`/providers${qs ? `?${qs}` : ""}`);
  }

  getProvider(id: string): Promise<ApiResponse<Provider>> {
    return this.request<Provider>(`/providers/${id}`);
  }

  upsertMyProviderProfile(body: UpsertProviderRequest): Promise<ApiResponse<Provider>> {
    return this.request<Provider>("/providers/me", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  submitVerification(body: SubmitVerificationRequest): Promise<ApiResponse<Provider>> {
    return this.request<Provider>("/providers/me/verification", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Admin
  getPendingVerifications(): Promise<ApiResponse<Provider[]>> {
    return this.request<Provider[]>("/admin/verifications");
  }

  reviewVerification(providerId: string, status: "verified" | "rejected"): Promise<ApiResponse<Provider>> {
    return this.request<Provider>(`/admin/providers/${providerId}/verification`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Bookings
  createBooking(body: CreateBookingRequest): Promise<ApiResponse<Booking>> {
    return this.request<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  getBookings(status?: BookingStatus): Promise<ApiResponse<Booking[]>> {
    return this.request<Booking[]>(`/bookings${status ? `?status=${status}` : ""}`);
  }

  updateBookingStatus(
    bookingId: string,
    body: UpdateBookingStatusRequest
  ): Promise<ApiResponse<Booking>> {
    return this.request<Booking>(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // Reviews
  submitReview(bookingId: string, body: CreateReviewRequest): Promise<ApiResponse<Review>> {
    return this.request<Review>(`/bookings/${bookingId}/review`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  getProviderReviews(providerId: string): Promise<ApiResponse<Review[]>> {
    return this.request<Review[]>(`/providers/${providerId}/reviews`);
  }

  // Follow
  getFollowStatus(providerId: string): Promise<ApiResponse<{ following: boolean }>> {
    return this.request<{ following: boolean }>(`/providers/${providerId}/follow-status`);
  }

  followProvider(providerId: string): Promise<ApiResponse<{ following: boolean }>> {
    return this.request<{ following: boolean }>(`/providers/${providerId}/follow`, { method: "POST" });
  }

  unfollowProvider(providerId: string): Promise<ApiResponse<{ following: boolean }>> {
    return this.request<{ following: boolean }>(`/providers/${providerId}/follow`, { method: "DELETE" });
  }

  getMyStats(): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>("/users/me/stats");
  }

  getPublicUser(id: string): Promise<ApiResponse<PublicUserProfile>> {
    return this.request<PublicUserProfile>(`/users/${id}`);
  }

  getUserStats(id: string): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>(`/users/${id}/stats`);
  }

  // Chat
  sendMessage(bookingId: string, text: string): Promise<ApiResponse<ChatMessage>> {
    return this.request<ChatMessage>(`/bookings/${bookingId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  // Posts / feed
  getFeed(mode: FeedMode, limit = 30): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>(`/posts/feed?mode=${mode}&limit=${limit}`);
  }

  getSavedPosts(): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>("/posts/saved");
  }

  getProviderPosts(providerId: string): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>(`/providers/${providerId}/posts`);
  }

  createPost(body: CreatePostRequest): Promise<ApiResponse<Post>> {
    return this.request<Post>("/posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  deletePost(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/posts/${id}`, { method: "DELETE" });
  }

  likePost(postId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return this.request(`/posts/${postId}/like`, { method: "POST" });
  }

  unlikePost(postId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return this.request(`/posts/${postId}/like`, { method: "DELETE" });
  }

  savePost(postId: string): Promise<ApiResponse<{ saved: boolean }>> {
    return this.request(`/posts/${postId}/save`, { method: "POST" });
  }

  unsavePost(postId: string): Promise<ApiResponse<{ saved: boolean }>> {
    return this.request(`/posts/${postId}/save`, { method: "DELETE" });
  }

  getComments(postId: string): Promise<ApiResponse<PostComment[]>> {
    return this.request<PostComment[]>(`/posts/${postId}/comments`);
  }

  addComment(postId: string, text: string): Promise<ApiResponse<PostComment>> {
    return this.request<PostComment>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  // Formatting helpers
  formatPrice(price: number): string {
    return `£${price.toFixed(2)}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

const apiService = new ApiService();
export default apiService;
