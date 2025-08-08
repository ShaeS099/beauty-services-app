import { auth } from "./firebase";
import {
  User,
  Provider,
  Booking,
  ProviderFilters,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  FavouritesRequest,
  ApiResponse,
} from "../types";

const API_BASE_URL =
  "https://us-central1-beauty-booking-app-68f00.cloudfunctions.net/api";

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Merge headers properly
      if (options.headers) {
        if (
          typeof options.headers === "object" &&
          !Array.isArray(options.headers)
        ) {
          Object.assign(headers, options.headers);
        }
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "An error occurred",
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: "Network error occurred",
      };
    }
  }

  // User endpoints
  async createUserProfile(
    name: string,
    email: string,
    role: "client" | "provider" = "client"
  ): Promise<ApiResponse<User>> {
    return this.makeRequest<User>("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, role }),
    });
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.makeRequest<User>("/users/profile");
  }

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.makeRequest<User>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Provider endpoints
  async getProvidersByCategory(
    category: string,
    filters?: ProviderFilters
  ): Promise<ApiResponse<Provider[]>> {
    const params = new URLSearchParams();
    if (filters?.latitude)
      params.append("latitude", filters.latitude.toString());
    if (filters?.longitude)
      params.append("longitude", filters.longitude.toString());
    if (filters?.radius) params.append("radius", filters.radius.toString());
    if (filters?.minPrice)
      params.append("minPrice", filters.minPrice.toString());
    if (filters?.maxPrice)
      params.append("maxPrice", filters.maxPrice.toString());

    const queryString = params.toString();
    const url = `/providers/category/${encodeURIComponent(category)}${
      queryString ? `?${queryString}` : ""
    }`;

    return this.makeRequest<Provider[]>(url);
  }

  async getProvidersFiltered(
    filters: ProviderFilters
  ): Promise<ApiResponse<Provider[]>> {
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.minPrice)
      params.append("minPrice", filters.minPrice.toString());
    if (filters.maxPrice)
      params.append("maxPrice", filters.maxPrice.toString());
    if (filters.latitude)
      params.append("latitude", filters.latitude.toString());
    if (filters.longitude)
      params.append("longitude", filters.longitude.toString());
    if (filters.radius) params.append("radius", filters.radius.toString());

    const queryString = params.toString();
    const url = `/providers/filter${queryString ? `?${queryString}` : ""}`;

    return this.makeRequest<Provider[]>(url);
  }

  async getProviderDetails(providerId: string): Promise<ApiResponse<Provider>> {
    return this.makeRequest<Provider>(`/providers/${providerId}`);
  }

  // Booking endpoints
  async createBooking(
    bookingData: CreateBookingRequest
  ): Promise<ApiResponse<Booking>> {
    return this.makeRequest<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  }

  async updateBookingStatus(
    bookingId: string,
    status: UpdateBookingStatusRequest
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>(
      `/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(status),
      }
    );
  }

  async getUserBookings(status?: string): Promise<ApiResponse<Booking[]>> {
    const url = status ? `/bookings/user?status=${status}` : "/bookings/user";
    return this.makeRequest<Booking[]>(url);
  }

  async getProviderBookings(
    date?: string,
    status?: string
  ): Promise<ApiResponse<Booking[]>> {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (status) params.append("status", status);

    const queryString = params.toString();
    const url = `/bookings/provider${queryString ? `?${queryString}` : ""}`;

    return this.makeRequest<Booking[]>(url);
  }

  async getBookingDetails(bookingId: string): Promise<ApiResponse<Booking>> {
    return this.makeRequest<Booking>(`/bookings/${bookingId}`);
  }

  // Favourites endpoints
  async updateFavourites(
    favouritesData: FavouritesRequest
  ): Promise<ApiResponse<User>> {
    return this.makeRequest<User>("/users/favourites", {
      method: "POST",
      body: JSON.stringify(favouritesData),
    });
  }

  // Helper methods
  async addToFavourites(providerId: string): Promise<ApiResponse<User>> {
    return this.updateFavourites({ providerId, action: "add" });
  }

  async removeFromFavourites(providerId: string): Promise<ApiResponse<User>> {
    return this.updateFavourites({ providerId, action: "remove" });
  }

  // Distance calculation helper
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Format price helper
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  // Format date helper
  formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Format time helper
  formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export const apiService = new ApiService();
export default apiService;
