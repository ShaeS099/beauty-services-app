import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ViewToken,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { Post } from "../types";
import { RootStackParamList } from "../navigation/types";
import PostCard from "../components/PostCard";
import { hapticTap } from "../utils/haptics";
import { useTheme } from "../theme";

const ForYouScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: "#000",
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
          paddingHorizontal: 32,
        },
        errorText: {
          color: "#FFFFFF",
          fontSize: 15,
          textAlign: "center",
          marginBottom: 16,
        },
        retryButton: {
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        },
        retryButtonText: {
          color: "#FFFFFF",
          fontWeight: "700",
        },
      }),
    [colors]
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [authorRoles, setAuthorRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const res = await apiService.getFeed("foryou", 30);
    if (res.success && res.data) {
      setPosts(res.data);
      const uniqueIds = Array.from(new Set(res.data.map((p) => p.providerId)));
      const results = await Promise.all(uniqueIds.map((id) => apiService.getPublicUser(id)));
      const names: Record<string, string> = {};
      const roles: Record<string, string> = {};
      results.forEach((r, i) => {
        if (r.success && r.data) {
          names[uniqueIds[i]] = r.data.name;
          roles[uniqueIds[i]] = r.data.role;
        }
      });
      setAuthorNames(names);
      setAuthorRoles(roles);
    } else {
      setError(res.error || "Couldn't load your feed");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => load(true);

  const toggleLike = useCallback(async (post: Post) => {
    hapticTap();
    const next = !post.likedByMe;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedByMe: next, likeCount: p.likeCount + (next ? 1 : -1) } : p
      )
    );
    const res = next ? await apiService.likePost(post.id) : await apiService.unlikePost(post.id);
    if (!res.success) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likedByMe: !next, likeCount: p.likeCount + (next ? -1 : 1) } : p
        )
      );
    }
  }, []);

  const toggleSave = useCallback(async (post: Post) => {
    hapticTap();
    const next = !post.savedByMe;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, savedByMe: next, saveCount: p.saveCount + (next ? 1 : -1) } : p
      )
    );
    const res = next ? await apiService.savePost(post.id) : await apiService.unsavePost(post.id);
    if (!res.success) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, savedByMe: !next, saveCount: p.saveCount + (next ? -1 : 1) } : p
        )
      );
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {containerHeight > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={containerHeight}
          getItemLayout={(_, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
          }
          ListEmptyComponent={
            <View style={[styles.center, { height: containerHeight }]}>
              <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" style={{ marginBottom: 12 }} />
              <Text style={styles.errorText}>No posts yet. Check back soon!</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <PostCard
              post={item}
              height={containerHeight}
              providerName={authorNames[item.providerId]}
              liked={!!item.likedByMe}
              saved={!!item.savedByMe}
              active={isFocused && index === activeIndex}
              onToggleLike={() => toggleLike(item)}
              onToggleSave={() => toggleSave(item)}
              onOpenComments={() => navigation.navigate("Comments", { postId: item.id })}
              onOpenBusiness={() =>
                authorRoles[item.providerId] === "provider"
                  ? navigation.navigate("HairdresserDetail", { providerId: item.providerId })
                  : navigation.navigate("UserProfile", { userId: item.providerId })
              }
            />
          )}
        />
      )}
    </View>
  );
};

export default ForYouScreen;
