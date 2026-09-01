import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import apiService from "../services/api";
import { Provider, SERVICE_CATEGORIES } from "../types";
import { HAIR_TYPES } from "../taxonomy";
import { RootStackParamList } from "../navigation/types";
import ProviderCard from "../components/ProviderCard";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import { fonts, useTheme } from "../theme";

const SearchScreen = () => {
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
          paddingTop: insets.top + 8,
        },
        heading: {
          fontSize: 26,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 16,
        },
        input: {
          height: 48,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 16,
          backgroundColor: colors.surface,
          marginBottom: 12,
        },
        chipRow: {
          marginBottom: 16,
        },
        listContent: {
          paddingBottom: 24,
        },
      }),
    [colors, insets.top]
  );

  const [city, setCity] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [hairType, setHairType] = useState<string | undefined>(undefined);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (
      opts: { city: string; category: string | undefined; hairType: string | undefined },
      isRefresh = false
    ) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await apiService.getProviders({
        city: opts.city.trim() || undefined,
        category: opts.category,
        hairType: opts.hairType,
        limit: 30,
      });
      setLoading(false);
      setRefreshing(false);
      setSearched(true);
      if (res.success && res.data) {
        setProviders(res.data);
      } else {
        setError(res.error || "Search failed");
      }
    },
    []
  );

  useEffect(() => {
    runSearch({ city, category, hairType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (value: string) => {
    const nextCategory = category === value ? undefined : value;
    setCategory(nextCategory);
    setHairType(undefined);
    runSearch({ city, category: nextCategory, hairType: undefined });
  };

  const toggleHairType = (value: string) => {
    const nextHairType = hairType === value ? undefined : value;
    setHairType(nextHairType);
    runSearch({ city, category, hairType: nextHairType });
  };

  const submitCitySearch = () => runSearch({ city, category, hairType });
  const onRefresh = () => runSearch({ city, category, hairType }, true);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Search</Text>

      <TextInput
        style={styles.input}
        placeholder="City (e.g. London)"
        value={city}
        onChangeText={setCity}
        onSubmitEditing={submitCitySearch}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {SERVICE_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => toggleCategory(c)} />
        ))}
      </ScrollView>

      {category === "Hair" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {HAIR_TYPES.map((h) => (
            <Chip key={h} label={h} selected={hairType === h} onPress={() => toggleHairType(h)} />
          ))}
        </ScrollView>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => navigation.navigate("HairdresserDetail", { providerId: item.id })}
            />
          )}
          ListEmptyComponent={
            searched ? (
              <EmptyState
                icon={error ? "alert-circle-outline" : "search-outline"}
                title={error ? "Search failed" : "No providers found"}
                subtitle={error || "Try a different city, category, or hair type."}
              />
            ) : null
          }
        />
      )}
    </View>
  );
};

export default SearchScreen;
