import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Text, TouchableOpacity, StyleSheet } from "react-native";
import { fonts, useTheme } from "../theme";
import { hapticTap } from "../utils/haptics";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Chip = ({ label, selected, onPress }: Props) => {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selected) return;
    scale.setValue(0.9);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }).start();
  }, [selected, scale]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginRight: 8,
        },
        chipSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        label: {
          fontSize: 13,
          fontFamily: fonts.mono,
          color: colors.text,
        },
        labelSelected: {
          color: "#FFFFFF",
        },
      }),
    [colors]
  );

  return (
    <TouchableOpacity
      onPress={() => {
        hapticTap();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[styles.chip, selected && styles.chipSelected, { transform: [{ scale }] }]}
      >
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Chip;
