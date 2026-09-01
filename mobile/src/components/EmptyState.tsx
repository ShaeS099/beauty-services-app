import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, useTheme } from "../theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingVertical: 48,
        },
        iconBadge: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        },
        title: {
          fontSize: 16,
          fontFamily: fonts.heading,
          color: colors.text,
          textAlign: "center",
        },
        subtitle: {
          fontSize: 13,
          color: colors.subtext,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 18,
        },
        actionButton: {
          marginTop: 20,
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 10,
          paddingHorizontal: 18,
          paddingVertical: 10,
        },
        actionText: {
          color: colors.primary,
          fontWeight: "700",
          fontSize: 14,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={28} color={colors.subtext} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default EmptyState;
