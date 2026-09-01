import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { PostComment } from "../types";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme";

const CommentsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, "Comments">>();
  const { postId } = route.params;
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
        heading: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          marginBottom: 12,
        },
        list: {
          paddingHorizontal: 16,
          paddingBottom: 12,
        },
        empty: {
          textAlign: "center",
          color: colors.subtext,
          marginTop: 24,
        },
        comment: {
          marginBottom: 14,
        },
        commentAuthor: {
          fontSize: 13,
          fontWeight: "700",
          color: colors.text,
        },
        commentText: {
          fontSize: 14,
          color: colors.text,
          marginTop: 2,
        },
        inputRow: {
          flexDirection: "row",
          alignItems: "flex-end",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: 12,
        },
        input: {
          flex: 1,
          maxHeight: 100,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 14,
          backgroundColor: colors.surface,
          marginRight: 10,
        },
        sendButton: {
          padding: 10,
        },
      }),
    [colors, insets.top]
  );

  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    apiService.getComments(postId).then((res) => {
      if (res.success && res.data) setComments(res.data);
      setLoading(false);
    });
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const res = await apiService.addComment(postId, text.trim());
    setPosting(false);
    if (res.success && res.data) {
      setComments((prev) => [res.data as PostComment, ...prev]);
      setText("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <Text style={styles.heading}>Comments</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be the first!</Text>}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Text style={styles.commentAuthor}>{item.userName}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={submit} disabled={posting || !text.trim()}>
          <Ionicons name="send" size={20} color={text.trim() ? colors.primary : colors.subtext} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CommentsScreen;
