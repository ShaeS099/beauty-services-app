import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import apiService from "../services/api";
import { SERVICE_CATEGORIES, ServiceCategory, UserInterests } from "../types";
import { SUBCATEGORIES, HAIR_TYPES } from "../taxonomy";
import Chip from "../components/Chip";
import StepIndicator from "../components/StepIndicator";
import { hapticTap } from "../utils/haptics";
import { fonts, useTheme } from "../theme";

interface Props {
  onDone: () => void;
  /** When set, the quiz starts pre-filled with these picks and reads as an edit rather than a
   * first-time setup step. */
  initialInterests?: UserInterests;
}

const CATEGORY_ICONS: Record<ServiceCategory, keyof typeof Ionicons.glyphMap> = {
  Hair: "cut-outline",
  Nails: "hand-left-outline",
  Makeup: "color-palette-outline",
  Barber: "person-outline",
  Esthetics: "sparkles-outline",
  Styling: "brush-outline",
  Bridal: "heart-outline",
  Waxing: "leaf-outline",
};

const BASE_STEPS = ["What you're into", "Get specific"];

const OnboardingQuizScreen = ({ onDone, initialInterests }: Props) => {
  const isEditing = !!initialInterests;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: insets.top + 20,
        },
        heading: {
          fontSize: 26,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 6,
        },
        subheading: {
          fontSize: 14,
          color: colors.subtext,
          marginBottom: 20,
          lineHeight: 20,
        },
        categoryGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        },
        categoryCard: {
          width: "48%",
          aspectRatio: 1.4,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        },
        categoryCardSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + "1A",
        },
        categoryIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          marginBottom: 8,
        },
        categoryIconWrapSelected: {
          backgroundColor: colors.primary,
        },
        categoryLabel: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
        },
        categoryLabelSelected: {
          color: colors.primary,
        },
        section: {
          marginBottom: 20,
        },
        sectionLabel: {
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 10,
        },
        subWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
        },
        emptyHint: {
          fontSize: 14,
          color: colors.subtext,
          textAlign: "center",
          marginTop: 40,
        },
        buttonRow: {
          flexDirection: "row",
          gap: 12,
          marginTop: 8,
        },
        secondaryButton: {
          flex: 1,
          height: 56,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        secondaryButtonText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
        },
        continueButton: {
          flex: 2,
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        continueButtonDisabled: {
          opacity: 0.5,
        },
        continueButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [colors, insets.top]
  );

  const [categories, setCategories] = useState<ServiceCategory[]>(
    (initialInterests?.categories as ServiceCategory[]) ?? []
  );
  const [subcategories, setSubcategories] = useState<string[]>(initialInterests?.subcategories ?? []);
  const [hairTypes, setHairTypes] = useState<string[]>(initialInterests?.hairTypes ?? []);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const hasHair = categories.includes("Hair");
  const steps = hasHair ? [...BASE_STEPS, "Your hair type"] : BASE_STEPS;
  const currentStep = Math.min(step, steps.length - 1);

  const toggleHairType = (hairType: string) => {
    hapticTap();
    setHairTypes((prev) =>
      prev.includes(hairType) ? prev.filter((h) => h !== hairType) : [...prev, hairType]
    );
  };

  const toggleCategory = (category: ServiceCategory) => {
    hapticTap();
    setCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      if (!next.includes(category)) {
        setSubcategories((subs) => subs.filter((s) => !SUBCATEGORIES[category].includes(s)));
      }
      return next;
    });
  };

  const toggleSubcategory = (subcategory: string) => {
    hapticTap();
    setSubcategories((prev) =>
      prev.includes(subcategory) ? prev.filter((s) => s !== subcategory) : [...prev, subcategory]
    );
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const goNext = () => {
    if (currentStep === 0 && categories.length === 0) {
      Alert.alert("Pick at least one", "Choose what you're interested in so we can personalize your feed");
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleFinish = async () => {
    setSaving(true);
    const res = await apiService.updateUserProfile({ interests: { categories, subcategories, hairTypes } });
    setSaving(false);
    if (res.success) {
      onDone();
    } else {
      Alert.alert("Error", res.error || "Failed to save your preferences");
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>{isEditing ? "Edit your preferences" : "Let's personalize your feed"}</Text>
        <Text style={styles.subheading}>
          {currentStep === 0
            ? "What are you into? Pick as many as you like."
            : currentStep === 1
              ? "Anything more specific you'd like to see?"
              : "This helps us show inspiration and providers suited to your hair."}
        </Text>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {currentStep === 0 ? (
          <View style={styles.categoryGrid}>
            {SERVICE_CATEGORIES.map((category) => {
              const selected = categories.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                  onPress={() => toggleCategory(category)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.categoryIconWrap, selected && styles.categoryIconWrapSelected]}>
                    <Ionicons
                      name={CATEGORY_ICONS[category]}
                      size={22}
                      color={selected ? "#FFFFFF" : colors.text}
                    />
                  </View>
                  <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {currentStep === 1 ? (
          categories.length === 0 ? (
            <Text style={styles.emptyHint}>Go back and pick a category first.</Text>
          ) : (
            categories.map((category) => (
              <View key={category} style={styles.section}>
                <Text style={styles.sectionLabel}>{category}</Text>
                <View style={styles.subWrap}>
                  {SUBCATEGORIES[category].map((sub) => (
                    <Chip
                      key={sub}
                      label={sub}
                      selected={subcategories.includes(sub)}
                      onPress={() => toggleSubcategory(sub)}
                    />
                  ))}
                </View>
              </View>
            ))
          )
        ) : null}

        {currentStep === 2 && hasHair ? (
          <View style={styles.section}>
            <View style={styles.subWrap}>
              {HAIR_TYPES.map((hairType) => (
                <Chip
                  key={hairType}
                  label={hairType}
                  selected={hairTypes.includes(hairType)}
                  onPress={() => toggleHairType(hairType)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.buttonRow, { paddingHorizontal: 20, paddingBottom: 20 }]}>
        {currentStep > 0 ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={goBack} disabled={saving}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.continueButton, saving && styles.continueButtonDisabled]}
          onPress={isLastStep ? handleFinish : goNext}
          disabled={saving}
        >
          <Text style={styles.continueButtonText}>
            {saving ? "Saving..." : isLastStep ? (isEditing ? "Save preferences" : "Finish") : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingQuizScreen;
