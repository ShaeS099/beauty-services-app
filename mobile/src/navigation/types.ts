import { Provider, Service, Post } from "../types";

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Login: undefined;
  SignUp: undefined;
  HairdresserDetail: { providerId: string };
  Booking: { provider: Provider; service: Service };
  ProviderProfileForm: undefined;
  Search: undefined;
  MyBookings: undefined;
  SavedPosts: undefined;
  PostDetail: { post: Post };
  Comments: { postId: string };
  Review: { bookingId: string; providerName: string; serviceName: string };
  CreatePost: { destination?: "gallery" | "feed" } | undefined;
  MyPortfolio: undefined;
  Chat: { bookingId: string; otherPartyName: string };
  AdminVerifications: undefined;
  EditPreferences: undefined;
  AccountMenu: undefined;
  Favourites: undefined;
  UserProfile: { userId: string };
};

export type MainTabParamList = {
  Discover: undefined;
  ForYou: undefined;
  Profile: undefined;
};
