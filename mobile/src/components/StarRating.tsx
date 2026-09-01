import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}

const StarRating = ({ value, onChange, size = 24, readOnly = false }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const content = (
          <Ionicons
            name={filled ? "star" : "star-outline"}
            size={size}
            color={colors.primary}
          />
        );
        if (readOnly) {
          return <View key={star}>{content}</View>;
        }
        return (
          <TouchableOpacity key={star} onPress={() => onChange?.(star)} style={styles.starButton}>
            {content}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  starButton: {
    marginRight: 6,
  },
});

export default StarRating;
