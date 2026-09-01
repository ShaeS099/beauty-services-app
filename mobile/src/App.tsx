import React, { useCallback, useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useFonts, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans";
import { DMMono_500Medium } from "@expo-google-fonts/dm-mono";
import * as SplashScreen from "expo-splash-screen";

import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import OnboardingQuizScreen from "./screens/OnboardingQuizScreen";
import DiscoverScreen from "./screens/DiscoverScreen";
import ForYouScreen from "./screens/ForYouScreen";
import SearchScreen from "./screens/SearchScreen";
import BookingScreen from "./screens/BookingScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HairdresserDetailScreen from "./screens/HairdresserDetailScreen";
import MyBookingsScreen from "./screens/MyBookingsScreen";
import ProviderProfileFormScreen from "./screens/ProviderProfileFormScreen";
import PostDetailScreen from "./screens/PostDetailScreen";
import CommentsScreen from "./screens/CommentsScreen";
import SavedPostsScreen from "./screens/SavedPostsScreen";
import ReviewFormScreen from "./screens/ReviewFormScreen";
import CreatePostScreen from "./screens/CreatePostScreen";
import MyPortfolioScreen from "./screens/MyPortfolioScreen";
import ChatScreen from "./screens/ChatScreen";
import AdminVerificationScreen from "./screens/AdminVerificationScreen";
import AccountMenuScreen from "./screens/AccountMenuScreen";
import FavouritesScreen from "./screens/FavouritesScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import { registerForPushNotificationsAsync } from "./services/notifications";

import { AuthService } from "./services/authService";
import { User } from "./types";
import { RootStackParamList, MainTabParamList } from "./navigation/types";
import { fonts, ThemeProvider, useTheme } from "./theme";

// Applies the DM Sans body font app-wide without needing every screen to set it individually.
// @ts-ignore — Text.defaultProps is a known, commonly-used RN pattern but isn't in the types.
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = [Text.defaultProps.style, { fontFamily: fonts.body }];

// Keeps the native splash screen up until fonts + auth state are ready, instead of handing off
// to a blank/unstyled frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Discover: "grid-outline",
  ForYou: "sparkles-outline",
  Profile: "person-outline",
};

const MainTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="ForYou"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1.5,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 56,
        },
        tabBarIcon: ({ color }: { color: string }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen
        name="ForYou"
        component={ForYouScreen}
        options={{
          // TikTok-style: the video feed shows through the tab bar instead of sitting on a
          // solid strip. Other tabs keep the normal opaque bar from screenOptions above. Icons
          // switch to white/translucent-white here too — the usual gold/subtext tones would be
          // unreadable against arbitrary video content.
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: 56,
          },
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppInner = () => {
  const { colors, isDark } = useTheme();
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold, DMSans_400Regular, DMMono_500Medium });
  const [user, setUser] = useState<User | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const profile = await AuthService.getCurrentUser();
    setUser(profile);
  }, []);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      setIsLoading(true);
      setIsSignedIn(!!firebaseUser);
      if (firebaseUser) {
        await refreshUser();
        registerForPushNotificationsAsync().catch((err) =>
          console.error("Push registration failed:", err)
        );
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [refreshUser]);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const needsOnboarding = isSignedIn && !!user && (!user.interests || user.interests.categories.length === 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isSignedIn ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
              </>
            ) : needsOnboarding ? (
              <Stack.Screen name="Onboarding">
                {() => <OnboardingQuizScreen onDone={refreshUser} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="HairdresserDetail" component={HairdresserDetailScreen} />
                <Stack.Screen name="Booking" component={BookingScreen} />
                <Stack.Screen name="ProviderProfileForm" component={ProviderProfileFormScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
                <Stack.Screen name="SavedPosts" component={SavedPostsScreen} />
                <Stack.Screen name="MyPortfolio" component={MyPortfolioScreen} />
                <Stack.Screen name="AdminVerifications" component={AdminVerificationScreen} />
                <Stack.Screen name="AccountMenu" component={AccountMenuScreen} />
                <Stack.Screen name="Favourites" component={FavouritesScreen} />
                <Stack.Screen name="UserProfile" component={UserProfileScreen} />
                <Stack.Screen name="EditPreferences">
                  {({ navigation: stackNav }) => (
                    <OnboardingQuizScreen
                      initialInterests={
                        user?.interests ?? { categories: [], subcategories: [], hairTypes: [] }
                      }
                      onDone={() => {
                        refreshUser();
                        stackNav.goBack();
                      }}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="CreatePost" component={CreatePostScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                <Stack.Screen
                  name="Comments"
                  component={CommentsScreen}
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen
                  name="Review"
                  component={ReviewFormScreen}
                  options={{ presentation: "modal" }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const App = () => (
  <ThemeProvider>
    <AppInner />
  </ThemeProvider>
);

export default App;
