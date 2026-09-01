import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiService from "../services/api";
import { Provider } from "../types";
import EmptyState from "../components/EmptyState";
import { hapticSuccess, hapticError } from "../utils/haptics";
import { fonts, useTheme } from "../theme";

const AdminVerificationScreen = () => {
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
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        heading: {
          fontSize: 22,
          fontFamily: fonts.heading,
          color: colors.text,
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        list: {
          paddingHorizontal: 16,
          paddingBottom: 24,
        },
        card: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        docImage: {
          width: "100%",
          height: 220,
          borderRadius: 10,
          marginBottom: 10,
          backgroundColor: colors.background,
        },
        providerName: {
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
        },
        providerLocation: {
          fontSize: 13,
          color: colors.subtext,
          marginTop: 2,
          marginBottom: 12,
        },
        actionRow: {
          flexDirection: "row",
          gap: 10,
        },
        actionButton: {
          flex: 1,
          height: 44,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        rejectButton: {
          borderWidth: 1,
          borderColor: colors.danger,
        },
        rejectButtonText: {
          color: colors.danger,
          fontWeight: "700",
        },
        approveButton: {
          backgroundColor: colors.success,
        },
        approveButtonText: {
          color: "#FFFFFF",
          fontWeight: "700",
        },
      }),
    [colors, insets.top]
  );
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiService.getPendingVerifications();
    if (res.success && res.data) setProviders(res.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const review = async (providerId: string, status: "verified" | "rejected") => {
    setActioningId(providerId);
    const res = await apiService.reviewVerification(providerId, status);
    setActioningId(null);
    if (res.success) {
      if (status === "verified") hapticSuccess();
      else hapticError();
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      hapticError();
      Alert.alert("Couldn't submit review", res.error || "Please try again");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Verification queue</Text>
      <FlatList
        data={providers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="shield-checkmark-outline" title="All caught up" subtitle="Nothing pending review." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.verificationDocUrl ? (
              <Image
                source={{ uri: item.verificationDocUrl }}
                style={styles.docImage}
                contentFit="cover"
                transition={200}
              />
            ) : null}
            <Text style={styles.providerName}>{item.name}</Text>
            <Text style={styles.providerLocation}>{item.location.city}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => review(item.id, "rejected")}
                disabled={actioningId === item.id}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => review(item.id, "verified")}
                disabled={actioningId === item.id}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default AdminVerificationScreen;
