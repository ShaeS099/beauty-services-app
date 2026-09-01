import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Text, TouchableOpacity, StyleSheet } from "react-native";
import { fonts, useTheme } from "../theme";

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

/** A bottom snackbar offering a brief window to undo a just-performed action, instead of
 * blocking with a confirm dialog up front. Auto-dismisses (and thereby commits the action)
 * after `durationMs`. */
const UndoToast = ({ visible, message, onUndo, onDismiss, durationMs = 4000 }: Props) => {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.text,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        },
        message: {
          flex: 1,
          color: colors.background,
          fontSize: 14,
          marginRight: 12,
        },
        undoText: {
          color: colors.primary,
          fontWeight: "700",
          fontSize: 14,
          fontFamily: fonts.mono,
        },
      }),
    [colors]
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={() => {
          translateY.stopAnimation();
          onUndo();
        }}
      >
        <Text style={styles.undoText}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default UndoToast;
