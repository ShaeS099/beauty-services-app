import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { AuthService } from "../services/authService";
import { Post } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import UndoToast from "../components/UndoToast";
import { hapticImpact } from "../utils/haptics";
import { useTheme } from "../theme";

const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const MyPortfolioScreen = () => {
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
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        },
        heading: {
          fontSize: 24,
          fontWeight: "700",
          color: colors.text,
        },
        addButton: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.primary,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
        },
        addButtonText: {
          color: "#FFFFFF",
          fontWeight: "600",
          marginLeft: 4,
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: GRID_GAP,
        },
        gridItem: {
          width: GRID_ITEM_SIZE,
          height: GRID_ITEM_SIZE,
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
        deleteButton: {
          position: "absolute",
          bottom: 4,
          right: 4,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 10,
          padding: 5,
        },
      }),
    [colors, insets.top]
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  const load = useCallback(async () => {
    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    if (!uid) return;
    const res = await apiService.getProviderPosts(uid);
    // Portfolio = categorized (service) posts only; everyday/personal posts (no category) show
    // on the main Profile page instead — see ProfileScreen's posts grid.
    if (res.success && res.data) setPosts(res.data.filter((p) => !!p.category));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  /** Optimistically removes the post and offers a few seconds to undo, rather than blocking
   * with a confirm dialog up front. The actual delete only hits the API once the undo window
   * expires (see UndoToast's onDismiss below). */
  const requestDelete = (post: Post) => {
    hapticImpact();
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setPendingDelete(post);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    setPosts((prev) => [pendingDelete, ...prev]);
    setPendingDelete(null);
  };

  const commitDelete = async () => {
    const post = pendingDelete;
    if (!post) return;
    setPendingDelete(null);
    const res = await apiService.deletePost(post.id);
    if (!res.success) {
      setPosts((prev) => [post, ...prev]);
      Alert.alert("Error", res.error || "Failed to delete post");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heading}>My Portfolio</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("CreatePost")}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add post</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <EmptyState
            icon="images-outline"
            title="No posts yet"
            subtitle="Add a post with a category to start building your portfolio."
            actionLabel="Add post"
            onAction={() => navigation.navigate("CreatePost")}
          />
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => (
              <View key={post.id} style={styles.gridItem}>
                <Image
                  source={{ uri: post.thumbnailUrl ?? post.mediaUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                {post.mediaType === "video" ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
                <TouchableOpacity style={styles.deleteButton} onPress={() => requestDelete(post)}>
                  <Ionicons name="trash" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <UndoToast
        visible={!!pendingDelete}
        message="Post deleted"
        onUndo={undoDelete}
        onDismiss={commitDelete}
      />
    </View>
  );
};

export default MyPortfolioScreen;
