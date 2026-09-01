import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import apiService from "../services/api";
import { AuthService } from "../services/authService";
import { Provider } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import { fonts, useTheme } from "../theme";

const FavouritesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        heading: {
          fontSize: 24,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 16,
        },
        favRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        favName: {
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
        },
        favLocation: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 2,
        },
        removeText: {
          color: colors.danger,
          fontWeight: "600",
        },
      }),
    [colors, insets.top]
  );
  const [favourites, setFavourites] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const profile = await AuthService.getCurrentUser();
    const favIds = profile?.favourites || [];
    if (favIds.length > 0) {
      const results = await Promise.all(favIds.map((id) => apiService.getProvider(id)));
      setFavourites(results.filter((r) => r.success && r.data).map((r) => r.data as Provider));
    } else {
      setFavourites([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const removeFavourite = async (providerId: string) => {
    setFavourites((prev) => prev.filter((p) => p.id !== providerId));
    await apiService.updateFavourites({ providerId, action: "remove" });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Favourites</Text>
      <FlatList
        data={favourites}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState icon="heart-outline" title="No favourites yet" subtitle="Bookmark a provider to see it here." />
        }
        renderItem={({ item: provider }) => (
          <View style={styles.favRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("HairdresserDetail", { providerId: provider.id })}
            >
              <Text style={styles.favName}>{provider.name}</Text>
              <Text style={styles.favLocation}>{provider.location.city}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeFavourite(provider.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

export default FavouritesScreen;
