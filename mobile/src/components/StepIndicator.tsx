import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface Props {
  steps: string[];
  currentStep: number; // 0-based
}

const StepIndicator = ({ steps, currentStep }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: 20,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
        },
        dot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.border,
        },
        dotActive: {
          backgroundColor: colors.primary,
        },
        line: {
          flex: 1,
          height: 2,
          backgroundColor: colors.border,
          marginHorizontal: 4,
        },
        lineActive: {
          backgroundColor: colors.primary,
        },
        label: {
          marginTop: 8,
          fontSize: 13,
          fontWeight: "600",
          color: colors.text,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((_, index) => (
          <React.Fragment key={index}>
            <View style={[styles.dot, index <= currentStep && styles.dotActive]} />
            {index < steps.length - 1 ? (
              <View style={[styles.line, index < currentStep && styles.lineActive]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.label}>{steps[currentStep]}</Text>
    </View>
  );
};

export default StepIndicator;
