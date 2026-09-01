import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import apiService from "../services/api";
import { RootStackParamList } from "../navigation/types";
import StarRating from "../components/StarRating";
import { useTheme } from "../theme";

const ReviewFormScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Review">>();
  const { bookingId, providerName, serviceName } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 20,
          paddingBottom: 20,
          paddingTop: insets.top + 20,
        },
        heading: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginTop: 8,
        },
        subheading: {
          fontSize: 14,
          color: colors.subtext,
          marginTop: 4,
          marginBottom: 24,
        },
        starRow: {
          marginBottom: 24,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          minHeight: 100,
          textAlignVertical: "top",
          backgroundColor: colors.surface,
          fontSize: 15,
          marginBottom: 24,
        },
        submitButton: {
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        submitButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [colors, insets.top]
  );

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating === 0) {
      Alert.alert("Pick a rating", "Please select a star rating");
      return;
    }
    setSubmitting(true);
    const res = await apiService.submitReview(bookingId, {
      rating,
      text: text.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      navigation.goBack();
    } else {
      Alert.alert("Couldn't submit review", res.error || "Please try again");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Rate your visit</Text>
      <Text style={styles.subheading}>
        {serviceName} with {providerName}
      </Text>

      <View style={styles.starRow}>
        <StarRating value={rating} onChange={setRating} size={36} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Share more about your experience (optional)"
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>{submitting ? "Submitting..." : "Submit review"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ReviewFormScreen;
