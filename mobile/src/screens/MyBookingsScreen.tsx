import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { Booking, BookingStatus } from "../types";
import { RootStackParamList } from "../navigation/types";
import EmptyState from "../components/EmptyState";
import UndoToast from "../components/UndoToast";
import { hapticImpact } from "../utils/haptics";
import { fonts, getStatusColors, useTheme } from "../theme";

type FilterTab = "upcoming" | "past";

/** "Today"/"Tomorrow" for a booking date, otherwise null (just show the plain date). */
function getRelativeDayLabel(dateIso: string): string | null {
  const booking = new Date(dateIso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfBookingDay = new Date(booking.getFullYear(), booking.getMonth(), booking.getDate());
  const diffDays = Math.round((startOfBookingDay.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return null;
}

const MyBookingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const statusColors = useMemo(() => getStatusColors(colors), [colors]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        heading: {
          fontSize: 26,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 16,
        },
        tabRow: {
          flexDirection: "row",
          marginBottom: 16,
        },
        tab: {
          marginRight: 24,
          paddingBottom: 8,
        },
        tabLabel: {
          fontSize: 15,
          color: colors.subtext,
          fontWeight: "600",
        },
        tabLabelActive: {
          color: colors.text,
        },
        tabIndicator: {
          height: 2,
          backgroundColor: colors.primary,
          marginTop: 6,
          borderRadius: 1,
        },
        listContent: {
          paddingBottom: 24,
        },
        card: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        cardHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        serviceName: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
        },
        statusBadge: {
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 8,
        },
        statusText: {
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: "700",
          textTransform: "capitalize",
        },
        provider: {
          fontSize: 14,
          color: colors.subtext,
          marginTop: 4,
        },
        dateRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 6,
        },
        dateText: {
          fontSize: 14,
          color: colors.text,
        },
        relativeDayBadge: {
          backgroundColor: colors.primary,
          borderRadius: 6,
          paddingHorizontal: 6,
          paddingVertical: 2,
          marginLeft: 8,
        },
        relativeDayText: {
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: "700",
        },
        price: {
          fontSize: 14,
          fontFamily: fonts.mono,
          color: colors.text,
          marginTop: 4,
        },
        cancelButton: {
          marginTop: 12,
          alignSelf: "flex-start",
        },
        cancelButtonText: {
          color: colors.danger,
          fontWeight: "600",
        },
        reviewButton: {
          marginTop: 12,
          alignSelf: "flex-start",
        },
        reviewButtonText: {
          color: colors.primary,
          fontWeight: "600",
        },
        messageButton: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          alignSelf: "flex-start",
        },
        messageButtonText: {
          color: colors.primary,
          fontWeight: "600",
          marginLeft: 6,
        },
      }),
    [colors, insets.top]
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<FilterTab>("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{ id: string; previousStatus: BookingStatus } | null>(
    null
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await apiService.getBookings();
    if (!res.success || !res.data) {
      setError(res.error || "Failed to load bookings");
      return;
    }
    setBookings(res.data);

    const uniqueProviderIds = Array.from(new Set(res.data.map((b) => b.providerId)));
    const missing = uniqueProviderIds.filter((id) => !(id in providerNames));
    if (missing.length > 0) {
      const results = await Promise.all(missing.map((id) => apiService.getProvider(id)));
      setProviderNames((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.success && r.data) next[missing[i]] = r.data.name;
        });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const shareSafetyCheckIn = (booking: Booking) => {
    const providerName = providerNames[booking.providerId] || "your stylist";
    const message =
      `I'm getting ${booking.service.name} with ${providerName} on ` +
      `${apiService.formatDate(booking.date)} at ${apiService.formatTime(booking.date)}.\n` +
      `Address: ${booking.clientAddress}`;
    Share.share({ message }).catch((err) => console.error("Share failed:", err));
  };

  /** Optimistically marks the booking cancelled and offers a few seconds to undo, rather than
   * blocking with a confirm dialog up front. The status change only hits the API once the undo
   * window expires (see UndoToast's onDismiss below). */
  const requestCancel = (booking: Booking) => {
    hapticImpact();
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b)));
    setPendingCancel({ id: booking.id, previousStatus: booking.status });
  };

  const undoCancel = () => {
    if (!pendingCancel) return;
    const { id, previousStatus } = pendingCancel;
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: previousStatus } : b)));
    setPendingCancel(null);
  };

  const commitCancel = async () => {
    const cancelling = pendingCancel;
    if (!cancelling) return;
    setPendingCancel(null);
    const res = await apiService.updateBookingStatus(cancelling.id, { status: "cancelled" });
    if (!res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelling.id ? { ...b, status: cancelling.previousStatus } : b))
      );
      Alert.alert("Error", res.error || "Failed to cancel booking");
    }
  };

  const now = Date.now();
  const filtered = bookings
    .filter((b) => {
      const isUpcoming = new Date(b.date).getTime() >= now && b.status !== "cancelled" && b.status !== "completed";
      return tab === "upcoming" ? isUpcoming : !isUpcoming;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Bookings</Text>

      <View style={styles.tabRow}>
        {(["upcoming", "past"] as FilterTab[]).map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === "upcoming" ? "Upcoming" : "Past"}
            </Text>
            {tab === t ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={error ? "Couldn't load bookings" : `No ${tab} bookings`}
            subtitle={error || (tab === "upcoming" ? "Book a service to see it here." : undefined)}
          />
        }
        renderItem={({ item }) => {
          const relativeDay =
            item.status !== "cancelled" && item.status !== "completed" ? getRelativeDayLabel(item.date) : null;
          return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.service.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.provider}>{providerNames[item.providerId] || "Provider"}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {apiService.formatDate(item.date)} · {apiService.formatTime(item.date)}
              </Text>
              {relativeDay ? (
                <View style={styles.relativeDayBadge}>
                  <Text style={styles.relativeDayText}>{relativeDay}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.price}>{apiService.formatPrice(item.service.price)}</Text>
            {item.status !== "cancelled" && (
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() =>
                  navigation.navigate("Chat", {
                    bookingId: item.id,
                    otherPartyName: item.userName || providerNames[item.providerId] || "them",
                  })
                }
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            )}
            {(item.status === "pending" || item.status === "confirmed") && (
              <TouchableOpacity style={styles.messageButton} onPress={() => shareSafetyCheckIn(item)}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <Text style={styles.messageButtonText}>Share safety check-in</Text>
              </TouchableOpacity>
            )}
            {(item.status === "pending" || item.status === "confirmed") && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => requestCancel(item)}>
                <Text style={styles.cancelButtonText}>Cancel booking</Text>
              </TouchableOpacity>
            )}
            {item.status === "completed" && !item.hasReview && (
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() =>
                  navigation.navigate("Review", {
                    bookingId: item.id,
                    providerName: providerNames[item.providerId] || "Provider",
                    serviceName: item.service.name,
                  })
                }
              >
                <Text style={styles.reviewButtonText}>Leave a review</Text>
              </TouchableOpacity>
            )}
          </View>
          );
        }}
      />

      <UndoToast
        visible={!!pendingCancel}
        message="Booking cancelled"
        onUndo={undoCancel}
        onDismiss={commitCancel}
      />
    </View>
  );
};

export default MyBookingsScreen;
