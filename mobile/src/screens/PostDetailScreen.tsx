import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiService from "../services/api";
import { Post } from "../types";
import { RootStackParamList } from "../navigation/types";
import PostCard from "../components/PostCard";

const PostDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<Post>(route.params.post);
  const [authorName, setAuthorName] = useState<string | undefined>(undefined);
  const [authorRole, setAuthorRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    apiService.getPublicUser(post.providerId).then((res) => {
      if (res.success && res.data) {
        setAuthorName(res.data.name);
        setAuthorRole(res.data.role);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLike = async () => {
    const next = !post.likedByMe;
    setPost((p) => ({ ...p, likedByMe: next, likeCount: p.likeCount + (next ? 1 : -1) }));
    const res = next ? await apiService.likePost(post.id) : await apiService.unlikePost(post.id);
    if (!res.success) {
      setPost((p) => ({ ...p, likedByMe: !next, likeCount: p.likeCount + (next ? -1 : 1) }));
    }
  };

  const toggleSave = async () => {
    const next = !post.savedByMe;
    setPost((p) => ({ ...p, savedByMe: next, saveCount: p.saveCount + (next ? 1 : -1) }));
    const res = next ? await apiService.savePost(post.id) : await apiService.unsavePost(post.id);
    if (!res.success) {
      setPost((p) => ({ ...p, savedByMe: !next, saveCount: p.saveCount + (next ? -1 : 1) }));
    }
  };

  return (
    <View style={styles.container}>
      <PostCard
        post={post}
        providerName={authorName}
        liked={!!post.likedByMe}
        saved={!!post.savedByMe}
        active
        onToggleLike={toggleLike}
        onToggleSave={toggleSave}
        onOpenComments={() => navigation.navigate("Comments", { postId: post.id })}
        onOpenBusiness={() =>
          authorRole === "provider"
            ? navigation.navigate("HairdresserDetail", { providerId: post.providerId })
            : navigation.navigate("UserProfile", { userId: post.providerId })
        }
      />
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    left: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 6,
  },
});

export default PostDetailScreen;
