import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { apiService } from "./api";
import { User } from "../types";

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const _firebaseUser = userCredential.user;

      // Get user profile from API
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        return {
          success: true,
          user: response.data,
        };
      } else {
        return {
          success: false,
          error: response.error || "Failed to get user profile",
        };
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: error.message || "Sign in failed",
      };
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUp(
    email: string,
    password: string,
    name: string,
    role: "client" | "provider" = "client"
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const _firebaseUser = userCredential.user;

      // Create user profile in backend
      const response = await apiService.createUserProfile(name, email, role);
      if (response.success && response.data) {
        return {
          success: true,
          user: response.data,
        };
      } else {
        // If profile creation fails, we should delete the Firebase user
        await _firebaseUser.delete();
        return {
          success: false,
          error: response.error || "Failed to create user profile",
        };
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      return {
        success: false,
        error: error.message || "Sign up failed",
      };
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error("Sign out error:", error);
      return {
        success: false,
        error: error.message || "Sign out failed",
      };
    }
  }

  /**
   * Listen for authentication state changes
   */
  static onAuthStateChanged(
    callback: (user: FirebaseUser | null) => void
  ): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Get current Firebase user
   */
  static getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Get current user's ID token
   */
  static async getIdToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  }
}

export default AuthService;
