import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { Post } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import { useTheme } from "../theme";

const NUM_COLUMNS = 3;
const GAP = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

const SavedPostsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        heading: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        grid: {
          paddingHorizontal: GAP,
          paddingBottom: 24,
        },
        card: {
          width: ITEM_SIZE,
          height: ITEM_SIZE,
          margin: GAP / 2,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: colors.surface,
        },
        videoBadge: {
          position: "absolute",
          top: 4,
          right: 4,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: 10,
          padding: 3,
        },
      }),
    [colors, insets.top]
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    return apiService.getSavedPosts().then((res) => {
      if (res.success && res.data) setPosts(res.data);
      setLoading(false);
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Saved</Text>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="Nothing saved yet"
            subtitle="Tap the bookmark icon on a post to save it here."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
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
                <Ionicons name="play" size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default SavedPostsScreen;
