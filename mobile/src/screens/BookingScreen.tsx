import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import apiService from "../services/api";
import { RootStackParamList } from "../navigation/types";
import { getNextDays, getTimeOptionsForDay } from "../utils/slots";
import StepIndicator from "../components/StepIndicator";
import { fonts, useTheme } from "../theme";

const STEPS = ["Service", "Address", "Date & time", "Review"];

const BookingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Booking">>();
  const { provider, service } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: insets.top + 16,
        },
        heading: {
          fontSize: 24,
          fontFamily: fonts.heading,
          color: colors.text,
        },
        subheading: {
          fontSize: 15,
          color: colors.subtext,
          marginTop: 4,
          marginBottom: 16,
        },
        helperText: {
          fontSize: 14,
          color: colors.text,
          marginBottom: 24,
          lineHeight: 20,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 10,
        },
        dayRow: {
          marginBottom: 20,
        },
        dayChip: {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginRight: 8,
        },
        dayChipSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        dayLabel: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
        },
        dayLabelSelected: {
          color: "#FFFFFF",
        },
        timeGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 8,
        },
        timeChip: {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginRight: 8,
          marginBottom: 8,
        },
        timeChipSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        timeLabel: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
        },
        timeLabelSelected: {
          color: "#FFFFFF",
        },
        empty: {
          color: colors.subtext,
          marginBottom: 16,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          backgroundColor: colors.surface,
          fontSize: 15,
        },
        multiline: {
          minHeight: 90,
          textAlignVertical: "top",
          marginBottom: 20,
        },
        notesInput: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          minHeight: 80,
          textAlignVertical: "top",
          backgroundColor: colors.surface,
          marginBottom: 24,
          fontSize: 15,
        },
        summaryCard: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        },
        summaryLabel: {
          fontSize: 12,
          color: colors.subtext,
          marginTop: 10,
        },
        summaryValue: {
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
          marginTop: 2,
        },
        buttonRow: {
          flexDirection: "row",
          gap: 12,
        },
        flexButton: {
          flex: 1,
        },
        primaryButton: {
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        },
        primaryButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
        secondaryButton: {
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: colors.border,
        },
        secondaryButtonText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
        },
        buttonDisabled: {
          opacity: 0.5,
        },
        confirmButton: {
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        confirmButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [colors, insets.top]
  );

  const [step, setStep] = useState(0);
  const [clientAddress, setClientAddress] = useState("");

  const days = useMemo(() => getNextDays(), []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const timeOptions = useMemo(
    () => getTimeOptionsForDay(days[selectedDayIndex].date, provider.availability, service.durationMins),
    [days, selectedDayIndex, provider.availability, service.durationMins]
  );

  const selectDay = (index: number) => {
    setSelectedDayIndex(index);
    setSelectedSlotIso(null);
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const confirmBooking = async () => {
    if (!selectedSlotIso) {
      Alert.alert("Pick a time", "Please choose an available time slot");
      return;
    }
    setSubmitting(true);
    const res = await apiService.createBooking({
      providerId: provider.id,
      service,
      date: selectedSlotIso,
      clientAddress: clientAddress.trim(),
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      Alert.alert("Booking requested", `Your booking with ${provider.name} has been requested.`, [
        { text: "OK", onPress: () => navigation.navigate("MainTabs") },
      ]);
    } else if (res.error?.toLowerCase().includes("no longer available")) {
      Alert.alert("Time no longer available", res.error, [
        { text: "Choose another time", onPress: () => setStep(2) },
      ]);
    } else {
      Alert.alert("Booking failed", res.error || "Please try again");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <StepIndicator steps={STEPS} currentStep={step} />

      {step === 0 && (
        <View>
          <Text style={styles.heading}>{service.name}</Text>
          <Text style={styles.subheading}>
            with {provider.name} · {service.durationMins} min · {apiService.formatPrice(service.price)}
          </Text>
          <Text style={styles.helperText}>
            This is a home-visit appointment. Next, tell us where {provider.name} should come to.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.sectionTitle}>Your address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Street address, city, postcode"
            value={clientAddress}
            onChangeText={setClientAddress}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={goBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton, !clientAddress.trim() && styles.buttonDisabled]}
              onPress={goNext}
              disabled={!clientAddress.trim()}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.sectionTitle}>Choose a day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={day.dateKey}
                style={[styles.dayChip, selectedDayIndex === index && styles.dayChipSelected]}
                onPress={() => selectDay(index)}
              >
                <Text style={[styles.dayLabel, selectedDayIndex === index && styles.dayLabelSelected]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Choose a time</Text>
          {timeOptions.length === 0 ? (
            <Text style={styles.empty}>No availability this day. Try another day.</Text>
          ) : (
            <View style={styles.timeGrid}>
              {timeOptions.map((slot) => (
                <TouchableOpacity
                  key={slot.iso}
                  style={[styles.timeChip, selectedSlotIso === slot.iso && styles.timeChipSelected]}
                  onPress={() => setSelectedSlotIso(slot.iso)}
                >
                  <Text
                    style={[styles.timeLabel, selectedSlotIso === slot.iso && styles.timeLabelSelected]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={goBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton, !selectedSlotIso && styles.buttonDisabled]}
              onPress={goNext}
              disabled={!selectedSlotIso}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.sectionTitle}>Review &amp; confirm</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>
              {service.name} · {apiService.formatPrice(service.price)}
            </Text>

            <Text style={styles.summaryLabel}>Stylist</Text>
            <Text style={styles.summaryValue}>{provider.name}</Text>

            <Text style={styles.summaryLabel}>Date &amp; time</Text>
            <Text style={styles.summaryValue}>
              {selectedSlotIso
                ? `${apiService.formatDate(selectedSlotIso)} · ${apiService.formatTime(selectedSlotIso)}`
                : "-"}
            </Text>

            <Text style={styles.summaryLabel}>Address</Text>
            <Text style={styles.summaryValue}>{clientAddress}</Text>
          </View>

          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Anything the provider should know?"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={goBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.flexButton, submitting && styles.buttonDisabled]}
              onPress={confirmBooking}
              disabled={submitting}
            >
              <Text style={styles.confirmButtonText}>
                {submitting ? "Booking..." : "Confirm booking"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BookingScreen;
