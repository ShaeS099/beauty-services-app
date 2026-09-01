import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import apiService from "../services/api";
import { AuthService } from "../services/authService";
import { storage } from "../services/firebase";
import { Service, SERVICE_CATEGORIES, Availability, TimeSlot, WEEKDAY_KEYS, VerificationStatus } from "../types";
import { HAIR_TYPES } from "../taxonomy";
import { RootStackParamList } from "../navigation/types";
import Chip from "../components/Chip";
import { fonts, useTheme } from "../theme";

interface DraftService extends Service {
  key: string;
}

let keyCounter = 0;
const newServiceDraft = (): DraftService => ({
  key: `svc-${keyCounter++}`,
  name: "",
  category: SERVICE_CATEGORIES[0],
  price: 0,
  durationMins: 30,
});

interface DraftSlot extends TimeSlot {
  key: string;
}

let slotKeyCounter = 0;
const newDraftSlot = (): DraftSlot => ({
  key: `slot-${slotKeyCounter++}`,
  start: "09:00",
  end: "17:00",
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const emptyAvailabilityDraft = (): Record<string, DraftSlot[]> =>
  Object.fromEntries(WEEKDAY_KEYS.map((d) => [d, [] as DraftSlot[]]));

const ProviderProfileFormScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        },
        heading: {
          fontSize: 24,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 20,
        },
        label: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
          marginTop: 16,
          marginBottom: 8,
        },
        smallLabel: {
          fontSize: 12,
          color: colors.subtext,
          marginBottom: 6,
        },
        input: {
          height: 48,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          fontSize: 15,
          backgroundColor: colors.surface,
          marginBottom: 10,
        },
        multiline: {
          height: 90,
          textAlignVertical: "top",
          paddingTop: 12,
        },
        chipWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
        },
        row: {
          flexDirection: "row",
        },
        rowItem: {
          flex: 1,
          marginRight: 10,
        },
        serviceCard: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        },
        removeService: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
        },
        removeServiceText: {
          color: colors.danger,
          marginLeft: 6,
          fontWeight: "600",
        },
        addServiceButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 12,
          marginBottom: 24,
        },
        addServiceText: {
          color: colors.primary,
          fontWeight: "600",
          marginLeft: 6,
        },
        dayCard: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 14,
          marginBottom: 10,
        },
        dayLabel: {
          fontSize: 14,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 8,
        },
        dayEmpty: {
          fontSize: 13,
          color: colors.subtext,
          marginBottom: 8,
        },
        removeSlotButton: {
          justifyContent: "center",
          alignItems: "center",
          width: 40,
          height: 48,
        },
        slotError: {
          fontSize: 12,
          color: colors.danger,
          marginTop: -6,
          marginBottom: 10,
        },
        addSlotButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 10,
          paddingVertical: 8,
        },
        verificationRow: {
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          marginBottom: 24,
        },
        verificationVerifiedText: {
          color: colors.success,
          fontWeight: "700",
          marginLeft: 8,
        },
        verificationPendingText: {
          color: colors.warning,
          fontWeight: "600",
          marginLeft: 8,
        },
        verificationButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 14,
          marginBottom: 24,
        },
        verificationButtonText: {
          color: colors.primary,
          fontWeight: "700",
          marginLeft: 8,
        },
        saveButton: {
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        saveButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [colors, insets.top]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [services, setServices] = useState<DraftService[]>([newServiceDraft()]);
  const [availability, setAvailability] = useState<Record<string, DraftSlot[]>>(emptyAvailabilityDraft());
  const [hairTypes, setHairTypes] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unverified");
  const [uploadingVerification, setUploadingVerification] = useState(false);

  useEffect(() => {
    const load = async () => {
      const uid = AuthService.getCurrentFirebaseUser()?.uid;
      if (uid) {
        const res = await apiService.getProvider(uid);
        if (res.success && res.data) {
          setName(res.data.name);
          setCity(res.data.location.city);
          setBio(res.data.bio);
          setCategories(res.data.categories);
          setHairTypes(res.data.hairTypes ?? []);
          setVerificationStatus(res.data.verificationStatus ?? "unverified");
          setServices(
            res.data.services.length > 0
              ? res.data.services.map((s) => ({ ...s, key: `svc-${keyCounter++}` }))
              : [newServiceDraft()]
          );
          if (res.data.availability) {
            const hydrated = emptyAvailabilityDraft();
            for (const day of WEEKDAY_KEYS) {
              const slots = res.data.availability[day];
              if (slots) {
                hydrated[day] = slots.map((s) => ({ ...s, key: `slot-${slotKeyCounter++}` }));
              }
            }
            setAvailability(hydrated);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleHairType = (hairType: string) => {
    setHairTypes((prev) =>
      prev.includes(hairType) ? prev.filter((h) => h !== hairType) : [...prev, hairType]
    );
  };

  const uploadVerificationId = async () => {
    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    if (!uid) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload your ID.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;

    setUploadingVerification(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `providers/${uid}/verification/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytesResumable(storageRef, blob, { contentType: asset.mimeType ?? "image/jpeg" });
      const documentUrl = await getDownloadURL(storageRef);

      const res = await apiService.submitVerification({ documentUrl });
      if (res.success && res.data) {
        setVerificationStatus(res.data.verificationStatus ?? "pending");
      } else {
        Alert.alert("Couldn't submit verification", res.error || "Please try again");
      }
    } catch (err) {
      console.error("Verification upload failed:", err);
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploadingVerification(false);
    }
  };

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const updateService = (key: string, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const addService = () => setServices((prev) => [...prev, newServiceDraft()]);
  const removeService = (key: string) =>
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));

  const addSlot = (day: string) =>
    setAvailability((prev) => ({ ...prev, [day]: [...prev[day], newDraftSlot()] }));
  const removeSlot = (day: string, key: string) =>
    setAvailability((prev) => ({ ...prev, [day]: prev[day].filter((s) => s.key !== key) }));
  const updateSlot = (day: string, key: string, patch: Partial<TimeSlot>) =>
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  const isSlotInvalid = (slot: DraftSlot) =>
    !TIME_RE.test(slot.start) || !TIME_RE.test(slot.end) || slot.start >= slot.end;

  const handleSave = async () => {
    if (!name.trim() || !city.trim() || !bio.trim()) {
      Alert.alert("Missing info", "Name, city and bio are required");
      return;
    }
    if (categories.length === 0) {
      Alert.alert("Missing info", "Pick at least one category");
      return;
    }
    const cleanServices = services
      .filter((s) => s.name.trim())
      .map(({ key: _key, ...s }) => ({
        ...s,
        name: s.name.trim(),
        price: Number(s.price) || 0,
        durationMins: Number(s.durationMins) || 30,
      }));
    if (cleanServices.length === 0) {
      Alert.alert("Missing info", "Add at least one service");
      return;
    }
    const invalidDay = WEEKDAY_KEYS.find((day) => availability[day].some(isSlotInvalid));
    if (invalidDay) {
      Alert.alert("Invalid availability", `Fix the time slot(s) on ${DAY_LABELS[invalidDay]} (use HH:MM, start before end).`);
      return;
    }

    const cleanAvailability: Availability = {};
    for (const day of WEEKDAY_KEYS) {
      if (availability[day].length > 0) {
        cleanAvailability[day] = availability[day].map(({ key: _key, ...slot }) => slot);
      }
    }

    setSaving(true);
    const res = await apiService.upsertMyProviderProfile({
      name: name.trim(),
      bio: bio.trim(),
      location: { city: city.trim(), lat: 0, lng: 0 },
      categories,
      services: cleanServices,
      availability: cleanAvailability,
      hairTypes,
    });
    setSaving(false);

    if (res.success) {
      Alert.alert("Saved", "Your provider profile has been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert("Error", res.error || "Failed to save provider profile");
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.heading}>Provider profile</Text>

      <Text style={styles.label}>Business / display name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>City</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Text style={styles.label}>Categories</Text>
      <View style={styles.chipWrap}>
        {SERVICE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={category}
            selected={categories.includes(category)}
            onPress={() => toggleCategory(category)}
          />
        ))}
      </View>

      {categories.includes("Hair") ? (
        <>
          <Text style={styles.label}>Hair type specialties</Text>
          <View style={styles.chipWrap}>
            {HAIR_TYPES.map((hairType) => (
              <Chip
                key={hairType}
                label={hairType}
                selected={hairTypes.includes(hairType)}
                onPress={() => toggleHairType(hairType)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Services</Text>
      {services.map((service) => (
        <View key={service.key} style={styles.serviceCard}>
          <TextInput
            style={styles.input}
            placeholder="Service name (e.g. Classic haircut)"
            value={service.name}
            onChangeText={(v) => updateService(service.key, { name: v })}
          />
          <View style={styles.chipWrap}>
            {SERVICE_CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                selected={service.category === category}
                onPress={() => updateService(service.key, { category })}
              />
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.smallLabel}>Price (£)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(service.price)}
                onChangeText={(v) => updateService(service.key, { price: Number(v) || 0 })}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.smallLabel}>Duration (min)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(service.durationMins)}
                onChangeText={(v) => updateService(service.key, { durationMins: Number(v) || 0 })}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.removeService} onPress={() => removeService(service.key)}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.removeServiceText}>Remove service</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addServiceText}>Add another service</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Availability</Text>
      {WEEKDAY_KEYS.map((day) => (
        <View key={day} style={styles.dayCard}>
          <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
          {availability[day].length === 0 ? (
            <Text style={styles.dayEmpty}>Not available</Text>
          ) : (
            availability[day].map((slot) => (
              <View key={slot.key}>
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.smallLabel}>Start</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="09:00"
                      value={slot.start}
                      onChangeText={(v) => updateSlot(day, slot.key, { start: v })}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.smallLabel}>End</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="17:00"
                      value={slot.end}
                      onChangeText={(v) => updateSlot(day, slot.key, { end: v })}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeSlotButton}
                    onPress={() => removeSlot(day, slot.key)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                {isSlotInvalid(slot) ? (
                  <Text style={styles.slotError}>Use HH:MM (e.g. 09:00), start before end</Text>
                ) : null}
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addSlotButton} onPress={() => addSlot(day)}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addServiceText}>Add slot</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.label}>Verification</Text>
      {verificationStatus === "verified" ? (
        <View style={styles.verificationRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.verificationVerifiedText}>Verified</Text>
        </View>
      ) : verificationStatus === "pending" ? (
        <View style={styles.verificationRow}>
          <Ionicons name="time-outline" size={20} color={colors.warning} />
          <Text style={styles.verificationPendingText}>Verification pending review</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.verificationButton}
          onPress={uploadVerificationId}
          disabled={uploadingVerification}
        >
          <Ionicons name="shield-outline" size={18} color={colors.primary} />
          <Text style={styles.verificationButtonText}>
            {uploadingVerification
              ? "Uploading..."
              : verificationStatus === "rejected"
              ? "Re-upload ID to get verified"
              : "Upload ID to get verified"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save profile"}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProviderProfileFormScreen;
