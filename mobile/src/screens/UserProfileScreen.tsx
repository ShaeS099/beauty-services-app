import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { Post, PublicUserProfile, UserStats } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import { fonts, useTheme } from "../theme";

const AVATAR_SIZE = 96;
const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 16 * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const UserProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "UserProfile">>();
  const { userId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        error: {
          color: colors.danger,
          fontSize: 16,
        },
        identity: {
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 24,
        },
        avatar: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarInitials: {
          color: "#FFFFFF",
          fontSize: 32,
          fontFamily: fonts.heading,
        },
        name: {
          fontSize: 20,
          fontFamily: fonts.heading,
          color: colors.text,
          marginTop: 12,
        },
        statsRow: {
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 20,
          paddingBottom: 16,
        },
        statBlock: {
          alignItems: "center",
          paddingHorizontal: 18,
        },
        statValue: {
          fontSize: 17,
          fontFamily: fonts.mono,
          color: colors.text,
        },
        statLabel: {
          fontSize: 12,
          color: colors.subtext,
          marginTop: 2,
        },
        sectionHeader: {
          paddingHorizontal: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: 16 - GRID_GAP / 2,
          paddingTop: 12,
          paddingBottom: 24,
        },
        gridItem: {
          width: GRID_ITEM_SIZE,
          height: GRID_ITEM_SIZE,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: colors.surface,
          margin: GRID_GAP / 2,
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

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiService.getPublicUser(userId),
      apiService.getUserStats(userId),
      apiService.getProviderPosts(userId),
    ]).then(([profileRes, statsRes, postsRes]) => {
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      } else {
        setError(profileRes.error || "User not found");
      }
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (postsRes.success && postsRes.data) setPosts(postsRes.data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "User not found"}</Text>
      </View>
    );
  }

  const initials = (profile.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.identity}>
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {profile.name}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats?.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats?.totalLikes ?? 0}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Posts</Text>
      </View>

      {posts.length === 0 ? (
        <EmptyState icon="grid-outline" title="No posts yet" />
      ) : (
        <View style={styles.grid}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.gridItem}
              onPress={() => navigation.navigate("PostDetail", { post })}
              activeOpacity={0.85}
            >
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
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default UserProfileScreen;
