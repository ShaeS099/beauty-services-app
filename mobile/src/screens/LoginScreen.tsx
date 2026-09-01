import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthService } from "../services/authService";
import { RootStackParamList } from "../navigation/types";
import { fonts, useTheme } from "../theme";

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        flex: {
          flex: 1,
        },
        content: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 28,
        },
        logoBadge: {
          alignSelf: "center",
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        },
        logoBadgeText: {
          color: "#FFFFFF",
          fontSize: 24,
          fontWeight: "800",
          letterSpacing: 0.5,
        },
        title: {
          fontSize: 30,
          fontFamily: fonts.heading,
          color: colors.text,
          textAlign: "center",
          marginBottom: 6,
        },
        subtitle: {
          fontSize: 15,
          color: colors.subtext,
          textAlign: "center",
          marginBottom: 40,
        },
        form: {
          width: "100%",
        },
        input: {
          height: 54,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          fontSize: 16,
          color: colors.text,
          marginBottom: 14,
          backgroundColor: colors.surface,
        },
        button: {
          height: 54,
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 6,
          marginBottom: 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 3,
        },
        primaryButton: {
          backgroundColor: colors.primary,
        },
        buttonDisabled: {
          opacity: 0.5,
        },
        buttonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        },
        linkButton: {
          alignItems: "center",
          marginTop: 4,
        },
        linkText: {
          fontSize: 14,
          color: colors.subtext,
        },
        link: {
          color: colors.primary,
          fontWeight: "700",
        },
      }),
    [colors]
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await AuthService.signIn(email.trim(), password);
    setIsLoading(false);
    if (!result.success) {
      Alert.alert("Sign in failed", result.error || "Please check your details and try again");
    }
    // On success, the auth state listener in App.tsx switches to the main app.
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.content}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>BB</Text>
          </View>
          <Text style={styles.title}>Beauty Booking</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.subtext}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />

            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{isLoading ? "Signing In..." : "Sign In"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.linkText}>
                Don&apos;t have an account? <Text style={styles.link}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
