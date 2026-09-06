import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { AuthService } from "../services/authService";
import { Provider, Post, Review } from "../types";
import { RootStackParamList } from "../navigation/types";
import StarRating from "../components/StarRating";
import { hapticTap } from "../utils/haptics";
import { fonts, useTheme } from "../theme";

const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const HairdresserDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "HairdresserDetail">>();
  const { providerId } = route.params;
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
        error: {
          color: colors.danger,
          fontSize: 16,
        },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        name: {
          fontSize: 24,
          fontFamily: fonts.heading,
          color: colors.text,
        },
        verifiedBadge: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.primary,
          borderRadius: 20,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginLeft: 8,
        },
        verifiedBadgeText: {
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: "700",
          marginLeft: 3,
        },
        tagWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 8,
        },
        tag: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 4,
          marginRight: 6,
          marginBottom: 6,
        },
        tagText: {
          fontSize: 12,
          fontWeight: "600",
          color: colors.text,
        },
        location: {
          fontSize: 15,
          color: colors.subtext,
          marginTop: 4,
        },
        ratingRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 6,
        },
        ratingText: {
          marginLeft: 6,
          fontSize: 14,
          color: colors.text,
        },
        actionsColumn: {
          alignItems: "center",
        },
        favButton: {
          padding: 8,
        },
        followButton: {
          marginTop: 4,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        followButtonActive: {
          backgroundColor: colors.primary,
        },
        followButtonText: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.primary,
        },
        followButtonTextActive: {
          color: "#FFFFFF",
        },
        followerCountText: {
          marginLeft: 6,
          fontSize: 13,
          color: colors.subtext,
        },
        bio: {
          fontSize: 15,
          color: colors.text,
          lineHeight: 22,
          marginBottom: 24,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 12,
        },
        serviceRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        serviceName: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
        },
        serviceMeta: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 2,
        },
        servicePrice: {
          fontSize: 15,
          fontFamily: fonts.mono,
          color: colors.text,
          marginRight: 12,
        },
        bookButton: {
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 10,
        },
        bookButtonText: {
          color: "#FFFFFF",
          fontWeight: "600",
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
        empty: {
          color: colors.subtext,
          fontSize: 14,
        },
        reviewRow: {
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        reviewHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        reviewName: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
        },
        reviewText: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 4,
          lineHeight: 18,
        },
      }),
    [colors, insets.top]
  );

  const [provider, setProvider] = useState<Provider | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favourite, setFavourite] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const isOwnProfile = AuthService.getCurrentFirebaseUser()?.uid === providerId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [providerRes, userRes, postsRes, reviewsRes, followRes] = await Promise.all([
      apiService.getProvider(providerId),
      AuthService.getCurrentUser(),
      apiService.getProviderPosts(providerId),
      apiService.getProviderReviews(providerId),
      isOwnProfile ? Promise.resolve(null) : apiService.getFollowStatus(providerId),
    ]);
    setLoading(false);
    if (providerRes.success && providerRes.data) {
      setProvider(providerRes.data);
    } else {
      setError(providerRes.error || "Provider not found");
    }
    // The public "Portfolio" section is gallery photos only (mediaType "image" + category) —
    // feed videos this provider posts live in For You instead, not here.
    if (postsRes.success && postsRes.data)
      setPosts(postsRes.data.filter((p) => p.mediaType === "image" && !!p.category));
    if (reviewsRes.success && reviewsRes.data) setReviews(reviewsRes.data);
    setFavourite(!!userRes?.favourites?.includes(providerId));
    if (followRes && followRes.success && followRes.data) setFollowing(followRes.data.following);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavourite = async () => {
    setTogglingFav(true);
    const next = !favourite;
    setFavourite(next);
    const res = await apiService.updateFavourites({ providerId, action: next ? "add" : "remove" });
    setTogglingFav(false);
    if (!res.success) setFavourite(!next);
  };

  const toggleFollow = async () => {
    hapticTap();
    setTogglingFollow(true);
    const next = !following;
    setFollowing(next);
    setProvider((prev) =>
      prev ? { ...prev, followerCount: (prev.followerCount ?? 0) + (next ? 1 : -1) } : prev
    );
    const res = next ? await apiService.followProvider(providerId) : await apiService.unfollowProvider(providerId);
    setTogglingFollow(false);
    if (!res.success) {
      setFollowing(!next);
      setProvider((prev) =>
        prev ? { ...prev, followerCount: (prev.followerCount ?? 0) - (next ? 1 : -1) } : prev
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "Provider not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{provider.name}</Text>
            {provider.verificationStatus === "verified" ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.location}>{provider.location.city}</Text>
          <View style={styles.ratingRow}>
            {provider.ratings ? (
              <>
                <Ionicons name="star" size={16} color={colors.primary} />
                <Text style={styles.ratingText}>
                  {provider.ratings.average.toFixed(1)} ({provider.ratings.count} reviews)
                </Text>
              </>
            ) : null}
            <Text style={[styles.followerCountText, !provider.ratings && { marginLeft: 0 }]}>
              {provider.followerCount ?? 0} follower{provider.followerCount === 1 ? "" : "s"}
            </Text>
          </View>
          {provider.hairTypes && provider.hairTypes.length > 0 ? (
            <View style={styles.tagWrap}>
              {provider.hairTypes.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.actionsColumn}>
          <TouchableOpacity onPress={toggleFavourite} disabled={togglingFav} style={styles.favButton}>
            <Ionicons
              name={favourite ? "heart" : "heart-outline"}
              size={26}
              color={colors.primary}
            />
          </TouchableOpacity>
          {!isOwnProfile ? (
            <TouchableOpacity
              onPress={toggleFollow}
              disabled={togglingFollow}
              style={[styles.followButton, following && styles.followButtonActive]}
            >
              <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
                {following ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.bio}>{provider.bio}</Text>

      <Text style={styles.sectionTitle}>Services</Text>
      {provider.services.map((service, index) => (
        <View key={`${service.name}-${index}`} style={styles.serviceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceMeta}>
              {service.category} · {service.durationMins} min
            </Text>
          </View>
          <Text style={styles.servicePrice}>{apiService.formatPrice(service.price)}</Text>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => navigation.navigate("Booking", { provider, service })}
          >
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      ))}

      {posts.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Portfolio</Text>
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
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Reviews</Text>
      {reviews.length === 0 ? (
        <Text style={styles.empty}>No reviews yet.</Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.reviewRow}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewName}>{review.userName}</Text>
              <StarRating value={review.rating} readOnly size={14} />
            </View>
            {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default HairdresserDetailScreen;
