import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { AuthService } from "../services/authService";
import { storage } from "../services/firebase";
import { Post, User, UserStats } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import UndoToast from "../components/UndoToast";
import { hapticTap, hapticImpact } from "../utils/haptics";
import { fonts, useTheme } from "../theme";

const AVATAR_SIZE = 104;
const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 16 * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
        topBar: {
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
        },
        menuButton: {
          padding: 6,
        },
        identity: {
          alignItems: "center",
          paddingHorizontal: 16,
          marginTop: 4,
        },
        avatarWrap: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
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
          fontSize: 36,
          fontFamily: fonts.heading,
        },
        avatarEditBadge: {
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary,
          borderWidth: 2,
          borderColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarUploading: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: AVATAR_SIZE / 2,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
        },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
        },
        name: {
          fontSize: 20,
          fontFamily: fonts.heading,
          color: colors.text,
        },
        editNameIcon: {
          marginLeft: 8,
        },
        email: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 2,
        },
        nameEditRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          width: "100%",
        },
        input: {
          flex: 1,
          height: 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          fontSize: 16,
          backgroundColor: colors.surface,
          color: colors.text,
          textAlign: "center",
        },
        nameEditAction: {
          marginLeft: 8,
          padding: 8,
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
        addPostButton: {
          padding: 4,
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: 16 - GRID_GAP / 2,
          paddingTop: 12,
        },
        gridItem: {
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

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const profile = await AuthService.getCurrentUser();
    setUser(profile);
    setName(profile?.name || "");

    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    const [statsRes, postsRes] = await Promise.all([
      apiService.getMyStats(),
      uid ? apiService.getProviderPosts(uid) : Promise.resolve(null),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (postsRes && postsRes.success && postsRes.data) {
      setPosts(postsRes.data.filter((p) => !p.category));
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startEditingName = () => {
    hapticTap();
    setName(user?.name || "");
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setName(user?.name || "");
    setEditingName(false);
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await apiService.updateUserProfile({ name: name.trim() });
    setSaving(false);
    if (res.success) {
      setUser((prev) => (prev ? { ...prev, name: name.trim() } : prev));
      setEditingName(false);
    } else {
      Alert.alert("Error", res.error || "Failed to update profile");
    }
  };

  const changePhoto = async () => {
    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    if (!uid) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `users/${uid}/profile/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytesResumable(storageRef, blob, { contentType: asset.mimeType ?? "image/jpeg" });
      const photoUrl = await getDownloadURL(storageRef);

      const res = await apiService.updateUserProfile({ photoUrl });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, photoUrl } : prev));
      } else {
        Alert.alert("Couldn't update photo", res.error || "Please try again");
      }
    } catch (err) {
      console.error("Profile photo upload failed:", err);
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploadingPhoto(false);
    }
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

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isProvider = user?.role === "provider";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate("AccountMenu")}>
            <Ionicons name="menu-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.identity}>
          <TouchableOpacity style={styles.avatarWrap} onPress={changePhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.avatarUploading}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoFocus
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.nameEditAction} onPress={saveName} disabled={saving}>
                <Ionicons name="checkmark" size={22} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.nameEditAction} onPress={cancelEditingName} disabled={saving}>
                <Ionicons name="close" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={startEditingName} activeOpacity={0.7}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.name || "Add your name"}
              </Text>
              <Ionicons name="pencil" size={14} color={colors.subtext} style={styles.editNameIcon} />
            </TouchableOpacity>
          )}
          <Text style={styles.email} numberOfLines={1}>
            {user?.email}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            {isProvider ? (
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats?.followerCount ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            ) : null}
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats?.totalLikes ?? 0}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            {isProvider ? (
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>
                  {stats?.rating && stats.rating.count > 0 ? stats.rating.average.toFixed(1) : "—"}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Posts</Text>
          <TouchableOpacity style={styles.addPostButton} onPress={() => navigation.navigate("CreatePost")}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title="No posts yet"
            subtitle="Share an everyday moment — it'll show up here."
            actionLabel="New post"
            onAction={() => navigation.navigate("CreatePost")}
          />
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => (
              <PostGridItem
                key={post.id}
                post={post}
                style={styles.gridItem}
                videoBadgeStyle={styles.videoBadge}
                deleteButtonStyle={styles.deleteButton}
                onDelete={() => requestDelete(post)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <UndoToast visible={!!pendingDelete} message="Post deleted" onUndo={undoDelete} onDismiss={commitDelete} />
    </View>
  );
};

interface PostGridItemProps {
  post: Post;
  style: StyleProp<ViewStyle>;
  videoBadgeStyle: StyleProp<ViewStyle>;
  deleteButtonStyle: StyleProp<ViewStyle>;
  onDelete: () => void;
}

const PostGridItem = ({ post, style, videoBadgeStyle, deleteButtonStyle, onDelete }: PostGridItemProps) => (
  <View style={[style, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]}>
    <Image
      source={{ uri: post.thumbnailUrl ?? post.mediaUrl }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
    />
    {post.mediaType === "video" ? (
      <View style={videoBadgeStyle}>
        <Ionicons name="play" size={12} color="#FFFFFF" />
      </View>
    ) : null}
    <TouchableOpacity style={deleteButtonStyle} onPress={onDelete}>
      <Ionicons name="trash" size={14} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

export default ProfileScreen;
