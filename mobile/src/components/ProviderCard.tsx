import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Provider } from "../types";
import { useTheme } from "../theme";

interface Props {
  provider: Provider;
  onPress: () => void;
}

const ProviderCard = ({ provider, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        avatar: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        },
        avatarText: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.primary,
        },
        info: {
          flex: 1,
        },
        name: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
        },
        location: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 2,
        },
        categories: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 4,
        },
        rating: {
          flexDirection: "row",
          alignItems: "center",
          marginLeft: 8,
        },
        ratingText: {
          marginLeft: 4,
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
        },
      }),
    [colors]
  );
  const initials = provider.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{provider.name}</Text>
        <Text style={styles.location}>{provider.location.city}</Text>
        <Text style={styles.categories} numberOfLines={1}>
          {provider.categories.join(" · ")}
        </Text>
      </View>
      {provider.ratings ? (
        <View style={styles.rating}>
          <Ionicons name="star" size={14} color={colors.primary} />
          <Text style={styles.ratingText}>{provider.ratings.average.toFixed(1)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

export default ProviderCard;
