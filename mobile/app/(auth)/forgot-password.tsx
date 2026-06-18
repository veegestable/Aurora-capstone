import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AppText as Text } from "../../src/components/common/AppText";
import { Input } from "../../src/components/common/Input";
import { Button } from "../../src/components/common/Button";
import { AURORA } from "../../src/constants/aurora-colors";
import { authService } from "../../src/services/firebase-auth.service";
import { getPasswordResetRetryAfterSeconds } from "../../src/utils/passwordResetTrustedErrors";

const PASSWORD_RESET_COOLDOWN_SEC = 60;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setTimeout(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const startCooldown = (seconds = PASSWORD_RESET_COOLDOWN_SEC) => {
    setCooldownSeconds(seconds);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter your account email.");
      return;
    }
    if (loading || cooldownSeconds > 0) return;

    setLoading(true);
    setError("");
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
      startCooldown();
    } catch (err: unknown) {
      const retry = getPasswordResetRetryAfterSeconds(err);
      if (retry != null && retry > 0) {
        startCooldown(retry);
      }
      setError(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || cooldownSeconds > 0;
  const buttonLabel = loading
    ? "Sending…"
    : cooldownSeconds > 0
      ? sent
        ? `Resend available in ${cooldownSeconds}s`
        : `Try again in ${cooldownSeconds}s`
      : sent
        ? "Send reset link again"
        : "Send reset link";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: AURORA.bg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4, marginRight: 8 }}
            accessibilityLabel="Back to login"
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Reset password
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: AURORA.textSec,
                fontSize: 14,
                lineHeight: 22,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Enter your email and we&apos;ll send a link to choose a new
              password. Counselors with a temporary admin password can use this
              too.
            </Text>

            {sent ? (
              <View
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(34, 197, 94, 0.3)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text style={{ color: "#22C55E", fontSize: 14, lineHeight: 22 }}>
                  If an account exists for {email.trim().toLowerCase()}, we sent a
                  link to set a new password. Check your inbox and spam folder.
                </Text>
              </View>
            ) : null}

            {error ? (
              <Text
                style={{ color: "#F87171", textAlign: "center", fontSize: 13 }}
              >
                {error}
              </Text>
            ) : null}

            <Input
              variant="glass"
              label="Email"
              className="pl-4"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Button
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={submitDisabled}
              className="py-3.5"
            >
              {buttonLabel}
            </Button>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              disabled={loading}
              style={{ alignItems: "center", paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back to login"
            >
              <Text style={{ color: AURORA.blue, fontWeight: "600", fontSize: 14 }}>
                Back to login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
