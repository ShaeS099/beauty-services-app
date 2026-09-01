import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { Post, SERVICE_CATEGORIES } from "../types";
import { HAIR_TYPES } from "../taxonomy";
import { RootStackParamList } from "../navigation/types";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { fonts, useTheme } from "../theme";

const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_WIDTH = (SCREEN_WIDTH - COLUMN_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const HEIGHT_VARIANTS = [200, 240, 280];

const DiscoverScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
        },
        heading: {
          fontSize: 26,
          fontFamily: fonts.heading,
          color: colors.text,
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        chipRow: {
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        grid: {
          paddingHorizontal: COLUMN_GAP,
          paddingBottom: 24,
        },
        card: {
          width: COLUMN_WIDTH,
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: COLUMN_GAP,
          backgroundColor: colors.surface,
        },
        videoBadge: {
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: 12,
          padding: 4,
        },
        skeletonGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: COLUMN_GAP,
        },
      }),
    [colors, insets.top]
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [hairType, setHairType] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await apiService.getFeed("discover", 50);
    if (res.success && res.data) {
      setPosts(res.data);
    } else {
      setError(res.error || "Failed to load Discover");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = category ? posts.filter((p) => p.category === category) : posts;
    if (hairType) result = result.filter((p) => p.hairTypes?.includes(hairType));
    return result;
  }, [posts, category, hairType]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Discover</Text>
        <View style={styles.skeletonGrid}>
          {HEIGHT_VARIANTS.concat(HEIGHT_VARIANTS).map((height, index) => (
            <Skeleton
              key={index}
              width={COLUMN_WIDTH}
              height={height}
              borderRadius={14}
              style={{
                marginBottom: COLUMN_GAP,
                marginRight: index % NUM_COLUMNS === 0 ? COLUMN_GAP / 2 : 0,
                marginLeft: index % NUM_COLUMNS === 0 ? 0 : COLUMN_GAP / 2,
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Discover</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {SERVICE_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={category === c}
            onPress={() => {
              setCategory((prev) => (prev === c ? undefined : c));
              setHairType(undefined);
            }}
          />
        ))}
      </ScrollView>

      {category === "Hair" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {HAIR_TYPES.map((h) => (
            <Chip
              key={h}
              label={h}
              selected={hairType === h}
              onPress={() => setHairType((prev) => (prev === h ? undefined : h))}
            />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? "alert-circle-outline" : "images-outline"}
            title={error ? "Couldn't load Discover" : "Nothing to discover yet"}
            subtitle={error || undefined}
          />
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { height: HEIGHT_VARIANTS[index % HEIGHT_VARIANTS.length] },
              index % NUM_COLUMNS === 0 ? { marginRight: COLUMN_GAP / 2 } : { marginLeft: COLUMN_GAP / 2 },
            ]}
            onPress={() => navigation.navigate("PostDetail", { post: item })}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: item.thumbnailUrl ?? item.mediaUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {item.mediaType === "video" ? (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={14} color="#FFFFFF" />
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default DiscoverScreen;
