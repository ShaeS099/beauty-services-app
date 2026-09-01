import React, { useEffect, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Post } from "../types";
import { fonts, useTheme } from "../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PostVideoProps {
  uri: string;
  active: boolean;
}

const PostVideo = ({ uri, active }: PostVideoProps) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    player.muted = !active;
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
  );
};

interface Props {
  post: Post;
  providerName?: string;
  liked: boolean;
  saved: boolean;
  active: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpenComments: () => void;
  onOpenBusiness: () => void;
  height?: number;
}

const PostCard = ({
  post,
  providerName,
  liked,
  saved,
  active,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onOpenBusiness,
  height = SCREEN_HEIGHT,
}: Props) => {
  const { colors } = useTheme();
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!liked) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, friction: 3, tension: 300 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 300 }),
    ]).start();
  }, [liked, heartScale]);

  return (
    <View style={[styles.container, { height, width: SCREEN_WIDTH }]}>
      {post.mediaType === "video" ? (
        <PostVideo uri={post.mediaUrl} active={active} />
      ) : (
        <Image
          source={{ uri: post.mediaUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.bottomInfo}>
          <TouchableOpacity onPress={onOpenBusiness}>
            <Text style={styles.businessName}>{providerName || "Business"}</Text>
          </TouchableOpacity>
          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
          {post.category ? (
            <Text style={styles.category}>
              {post.category}
              {post.subcategory ? ` · ${post.subcategory}` : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onToggleLike}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={30}
                color={liked ? colors.danger : "#FFFFFF"}
              />
            </Animated.View>
            <Text style={styles.actionLabel}>{post.likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onOpenComments}>
            <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onToggleSave}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={28} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{post.saveCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onOpenBusiness}>
            <Ionicons name="storefront-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    flexDirection: "row",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  bottomInfo: {
    flex: 1,
    justifyContent: "flex-end",
    paddingRight: 12,
  },
  businessName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 6,
  },
  category: {
    color: "#F0F0F0",
    fontSize: 12,
    marginTop: 6,
    opacity: 0.85,
  },
  actions: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: 18,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});

export default PostCard;
