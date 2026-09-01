import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "../services/authService";
import { User } from "../types";
import { RootStackParamList } from "../navigation/types";
import { fonts, useTheme } from "../theme";

const AccountMenuScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    AuthService.getCurrentUser().then(setUser);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: insets.top + 16,
        },
        heading: {
          fontSize: 24,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 16,
        },
        menu: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        menuRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        menuLabel: {
          flex: 1,
          marginLeft: 12,
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
        },
        providerButton: {
          marginTop: 24,
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
        },
        providerButtonText: {
          color: colors.primary,
          fontWeight: "700",
        },
        signOutButton: {
          marginTop: 32,
          alignItems: "center",
        },
        signOutText: {
          color: colors.danger,
          fontWeight: "700",
          fontSize: 16,
        },
      }),
    [colors, insets.top]
  );

  const handleSignOut = async () => {
    await AuthService.signOut();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.heading}>Menu</Text>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Search")}>
          <Ionicons name="search-outline" size={20} color={colors.text} />
          <Text style={styles.menuLabel}>Search</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MyBookings")}>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={styles.menuLabel}>My Bookings</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("SavedPosts")}>
          <Ionicons name="bookmark-outline" size={20} color={colors.text} />
          <Text style={styles.menuLabel}>Saved</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Favourites")}>
          <Ionicons name="heart-outline" size={20} color={colors.text} />
          <Text style={styles.menuLabel}>Favourites</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("EditPreferences")}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
          <Text style={styles.menuLabel}>Preferences</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
        {user?.role === "provider" ? (
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MyPortfolio")}>
            <Ionicons name="images-outline" size={20} color={colors.text} />
            <Text style={styles.menuLabel}>My Portfolio</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        ) : null}
        {user?.role === "admin" ? (
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("AdminVerifications")}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
            <Text style={styles.menuLabel}>Verification queue</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.providerButton}
        onPress={() => navigation.navigate("ProviderProfileForm")}
      >
        <Text style={styles.providerButtonText}>
          {user?.role === "provider" ? "Edit your provider profile" : "Become a service provider"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AccountMenuScreen;
