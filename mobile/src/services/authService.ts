import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import apiService from "./api";
import { User } from "../types";

export class AuthService {
  /** Sign in with email and password, returns the backend user profile. */
  static async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        return { success: true, user: response.data };
      }
      return { success: false, error: response.error || "Failed to load profile" };
    } catch (error: any) {
      return { success: false, error: error.message || "Sign in failed" };
    }
  }

  /** Create a Firebase account and the matching backend profile. */
  static async signUp(
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      // GET /users/me auto-creates the profile using the ID token's claims.
      await apiService.getUserProfile();
      // Make sure the name is set correctly even if the token claim hasn't refreshed yet.
      const response = await apiService.updateUserProfile({ name });

      if (response.success && response.data) {
        return { success: true, user: response.data };
      }
      return { success: false, error: response.error || "Failed to create profile" };
    } catch (error: any) {
      return { success: false, error: error.message || "Sign up failed" };
    }
  }

  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Sign out failed" };
    }
  }

  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  static async getCurrentUser(): Promise<User | null> {
    const response = await apiService.getUserProfile();
    return response.success && response.data ? response.data : null;
  }

  static getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}

export default AuthService;
