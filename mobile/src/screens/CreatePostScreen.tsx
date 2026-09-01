import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase";
import { AuthService } from "../services/authService";
import apiService from "../services/api";
import { SERVICE_CATEGORIES, ServiceCategory, PostMediaType } from "../types";
import { SUBCATEGORIES, HAIR_TYPES } from "../taxonomy";
import { RootStackParamList } from "../navigation/types";
import Chip from "../components/Chip";
import { useTheme } from "../theme";

interface PickedAsset {
  uri: string;
  mediaType: PostMediaType;
  mimeType?: string;
}

interface VideoPreviewProps {
  uri: string;
}

// Shared with the themed styles below via the same key name — has no color dependency, so it's
// fine as a plain static style that both this sibling component and the screen itself can use.
const staticStyles = StyleSheet.create({
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
});

const VideoPreview = ({ uri }: VideoPreviewProps) => {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={staticStyles.mediaPreview} contentFit="cover" nativeControls />;
};

/** Uploads a local file URI to Storage and resolves its public download URL. `onProgress`
 * (0-1) is only meaningful for the main media file; the thumbnail upload omits it since it's
 * small enough to not need its own progress bar. */
async function uploadToStorage(
  localUri: string,
  path: string,
  contentType: string,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes),
      reject,
      () => resolve()
    );
  });
  return getDownloadURL(storageRef);
}

const CreatePostScreen = () => {
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
        heading: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 20,
        },
        mediaPicker: {
          height: 220,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 20,
        },
        mediaPickerText: {
          color: colors.subtext,
          fontSize: 14,
        },
        label: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8,
          marginTop: 4,
        },
        helperText: {
          fontSize: 12,
          color: colors.subtext,
          marginBottom: 10,
        },
        chipWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 16,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          minHeight: 80,
          textAlignVertical: "top",
          backgroundColor: colors.surface,
          fontSize: 15,
          marginBottom: 24,
        },
        submitButton: {
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        submitButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
          marginLeft: 8,
        },
        uploadingRow: {
          flexDirection: "row",
          alignItems: "center",
        },
      }),
    [colors, insets.top]
  );

  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [hairTypes, setHairTypes] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add portfolio media.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets[0];
    setAsset({
      uri: picked.uri,
      mediaType: picked.type === "video" ? "video" : "image",
      mimeType: picked.mimeType,
    });
  };

  const selectCategory = (next: ServiceCategory) => {
    setCategory((prev) => (prev === next ? null : next));
    setSubcategory(null);
    setHairTypes([]);
  };

  const toggleHairType = (hairType: string) => {
    setHairTypes((prev) =>
      prev.includes(hairType) ? prev.filter((h) => h !== hairType) : [...prev, hairType]
    );
  };

  const handleSubmit = async () => {
    if (!asset) {
      Alert.alert("Add media", "Pick a photo or video to post");
      return;
    }
    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    if (!uid) return;

    setUploading(true);
    setProgress(0);
    try {
      const filePrefix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const ext = asset.uri.split(".").pop()?.split("?")[0] || (asset.mediaType === "video" ? "mp4" : "jpg");
      const contentType = asset.mimeType ?? (asset.mediaType === "video" ? "video/mp4" : "image/jpeg");
      const mediaUrl = await uploadToStorage(
        asset.uri,
        `providers/${uid}/posts/${filePrefix}.${ext}`,
        contentType,
        setProgress
      );

      // Grids can't thumbnail a raw video URL as an image, so generate an actual still frame
      // and upload it alongside the video — best-effort, a post still works without one.
      let thumbnailUrl: string | undefined;
      if (asset.mediaType === "video") {
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0 });
          thumbnailUrl = await uploadToStorage(
            thumbUri,
            `providers/${uid}/posts/${filePrefix}-thumb.jpg`,
            "image/jpeg"
          );
        } catch (err) {
          console.error("Thumbnail generation failed (continuing without one):", err);
        }
      }

      const res = await apiService.createPost({
        mediaUrl,
        mediaType: asset.mediaType,
        thumbnailUrl,
        category: category ?? undefined,
        subcategory: subcategory || undefined,
        hairTypes: hairTypes.length > 0 ? hairTypes : undefined,
        caption: caption.trim() || undefined,
      });

      if (res.success) {
        navigation.goBack();
      } else {
        Alert.alert("Couldn't create post", res.error || "Please try again");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.heading}>New post</Text>

      <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
        {asset ? (
          asset.mediaType === "video" ? (
            <VideoPreview key={asset.uri} uri={asset.uri} />
          ) : (
            <Image source={{ uri: asset.uri }} style={staticStyles.mediaPreview} contentFit="cover" />
          )
        ) : (
          <Text style={styles.mediaPickerText}>Tap to choose a photo or video</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Category (optional)</Text>
      <Text style={styles.helperText}>
        Add a category to include this in your portfolio — leave it blank for an everyday post.
      </Text>
      <View style={styles.chipWrap}>
        {SERVICE_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => selectCategory(c)} />
        ))}
      </View>

      {category ? (
        <>
          <Text style={styles.label}>Subcategory (optional)</Text>
          <View style={styles.chipWrap}>
            {SUBCATEGORIES[category].map((sub) => (
              <Chip
                key={sub}
                label={sub}
                selected={subcategory === sub}
                onPress={() => setSubcategory(subcategory === sub ? null : sub)}
              />
            ))}
          </View>
        </>
      ) : null}

      {category === "Hair" ? (
        <>
          <Text style={styles.label}>Hair type tags (optional)</Text>
          <View style={styles.chipWrap}>
            {HAIR_TYPES.map((hairType) => (
              <Chip
                key={hairType}
                label={hairType}
                selected={hairTypes.includes(hairType)}
                onPress={() => toggleHairType(hairType)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Tell clients about this look"
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <TouchableOpacity style={[styles.submitButton, uploading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={uploading}>
        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{`Uploading ${Math.round(progress * 100)}%`}</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>Post</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreatePostScreen;
