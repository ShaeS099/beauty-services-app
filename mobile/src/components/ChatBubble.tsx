import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChatMessage } from "../types";
import { useTheme } from "../theme";

interface Props {
  message: ChatMessage;
  isMine: boolean;
}

const ChatBubble = ({ message, isMine }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          marginVertical: 4,
          paddingHorizontal: 16,
        },
        rowMine: {
          justifyContent: "flex-end",
        },
        rowTheirs: {
          justifyContent: "flex-start",
        },
        bubble: {
          maxWidth: "78%",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
        },
        bubbleMine: {
          backgroundColor: colors.primary,
          borderBottomRightRadius: 4,
        },
        bubbleTheirs: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderBottomLeftRadius: 4,
        },
        textMine: {
          color: "#FFFFFF",
          fontSize: 14,
        },
        textTheirs: {
          color: colors.text,
          fontSize: 14,
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={isMine ? styles.textMine : styles.textTheirs}>{message.text}</Text>
      </View>
    </View>
  );
};

export default ChatBubble;
