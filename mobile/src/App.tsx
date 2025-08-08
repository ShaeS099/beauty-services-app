import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Import screens
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import BookingScreen from "./screens/BookingScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HairdresserDetailScreen from "./screens/HairdresserDetailScreen";
import MyBookingsScreen from "./screens/MyBookingsScreen";

// Import services
import { AuthService } from "./services/authService";
import { User } from "./types";
import { User as FirebaseUser } from "firebase/auth";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab bar icon renderers defined outside of components to avoid nested component warnings
type TabIconProps = { color: string; size: number };
const renderHomeIcon = ({ color, size }: TabIconProps) => (
  <Icon name="home" size={size} color={color} />
);
const renderSearchIcon = ({ color, size }: TabIconProps) => (
  <Icon name="search" size={size} color={color} />
);
const renderBookingsIcon = ({ color, size }: TabIconProps) => (
  <Icon name="calendar" size={size} color={color} />
);
const renderProfileIcon = ({ color, size }: TabIconProps) => (
  <Icon name="person" size={size} color={color} />
);

// Main tab navigator for authenticated users
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#FF6B9D",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5EA",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: renderSearchIcon,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: "Bookings",
          tabBarIcon: renderBookingsIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};

// Main App component
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = AuthService.onAuthStateChanged(
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const userProfile = await AuthService.getCurrentUser();
            setUser(userProfile);
          } catch (error) {
            console.error("Error getting user profile:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (isLoading) {
    // You can add a splash screen here
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {user ? (
            // Authenticated user screens
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="HairdresserDetail"
                component={HairdresserDetailScreen}
              />
              <Stack.Screen name="Booking" component={BookingScreen} />
            </>
          ) : (
            // Authentication screens
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Simple Icon component (you can replace with react-native-vector-icons)
const Icon = ({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) => {
  return null; // Placeholder - replace with actual icon component
};

export default App;
