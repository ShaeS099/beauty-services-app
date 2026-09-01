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
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import apiService from "../services/api";
import { ChatMessage } from "../types";
import { RootStackParamList } from "../navigation/types";
import ChatBubble from "../components/ChatBubble";
import { fonts, useTheme } from "../theme";

const ChatScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const { bookingId, otherPartyName } = route.params;
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
          fontFamily: fonts.heading,
          color: colors.text,
          textAlign: "center",
          marginBottom: 12,
        },
        list: {
          paddingVertical: 12,
        },
        empty: {
          textAlign: "center",
          color: colors.subtext,
          marginTop: 24,
          transform: [{ scaleY: -1 }],
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "chats", bookingId, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
        setLoading(false);
      },
      (err) => {
        console.error("Chat listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [bookingId]);

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const res = await apiService.sendMessage(bookingId, text.trim());
    setPosting(false);
    if (res.success) {
      setText("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <Text style={styles.heading}>{otherPartyName}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello!</Text>}
          renderItem={({ item }) => (
            <ChatBubble message={item} isMine={item.senderId === auth.currentUser?.uid} />
          )}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
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

export default ChatScreen;
