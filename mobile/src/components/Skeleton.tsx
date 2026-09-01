import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";
import { useTheme } from "../theme";

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** A pulsing placeholder block, used to sketch a loading screen's eventual layout instead of
 * showing a spinner that gives no sense of what's coming. */
const Skeleton = ({ width = "100%", height = 16, borderRadius = 8, style }: Props) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
};

export default Skeleton;
