import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { Heart, Brain, Users } from "lucide-react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import LoginForm, { LOGIN_AUTH_COLUMN_MAX } from "../components/auth/LoginForm";

const FEATURES = [
  { icon: Brain, label: "Mood tracking", color: "#34D399" },
  { icon: Users, label: "Counselor support", color: "#F59E0B" },
  { icon: Heart, label: "Wellness tools", color: "#EC4899" },
];

export default function LoginScreen() {
  const isWeb = Platform.OS === "web";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView className="flex-1 bg-primary">
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isWeb ? styles.scrollContentWeb : styles.scrollContentNative,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section — native: same max width as auth card for symmetry */}
          <View
            style={[
              styles.headerBlock,
              isWeb ? styles.headerBlockWeb : styles.headerBlockNative,
              !isWeb && styles.nativeColumn,
            ]}
          >
            <Image
              source={require("../assets/logo-light.png")}
              style={isWeb ? styles.logoWeb : styles.logoNative}
              resizeMode="contain"
            />
            {isWeb ? (
              <Text
                className="text-center text-gray-400 max-w-xs"
                style={styles.taglineWeb}
              >
                AI-powered mental health platform tailored for your wellness
                journey
              </Text>
            ) : (
              <Text
                className="text-center max-w-xs"
                style={styles.taglineNative}
                numberOfLines={4}
              >
                {"Small check-ins. Bigger conversations.\nClarity for students. Context for counselors."}
              </Text>
            )}
          </View>

          {/* Feature cards — native: aligned to auth column */}
          <View
            style={[
              styles.features,
              !isWeb && styles.featuresNative,
              !isWeb && styles.nativeColumn,
            ]}
          >
            {FEATURES.map((item, index) => (
              <View key={index} style={styles.featureCard}>
                {isWeb ? (
                  <View
                    style={[styles.featureGlass, styles.featureFallback]}
                  >
                    <View style={styles.featureIcon}>
                      <item.icon size={22} color={item.color} />
                    </View>
                    <Text style={styles.featureLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </View>
                ) : (
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={[styles.featureGlass, styles.featureGlassNative]}
                  >
                    <View style={styles.featureOverlay} />
                    <View style={[styles.featureIcon, styles.featureIconNative]}>
                      <item.icon size={16} color={item.color} />
                    </View>
                    <Text
                      style={[styles.featureLabel, styles.featureLabelNative]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  </BlurView>
                )}
              </View>
            ))}
          </View>

          {/* Auth Form */}
          <LoginForm />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentWeb: {
    justifyContent: "center",
    padding: 24,
    paddingBottom: 48,
  },
  scrollContentNative: {
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  nativeColumn: {
    alignSelf: "center",
    width: "100%",
    maxWidth: LOGIN_AUTH_COLUMN_MAX,
  },
  headerBlock: {
    alignItems: "center",
  },
  headerBlockWeb: {
    marginBottom: 24,
    marginTop: 24,
  },
  headerBlockNative: {
    marginBottom: 8,
    marginTop: 0,
  },
  logoWeb: {
    width: 200,
    height: 200,
    marginBottom: 12,
  },
  logoNative: {
    width: 204,
    height: 204,
    marginBottom: 6,
  },
  taglineWeb: {
    fontSize: 16,
    lineHeight: 22,
  },
  taglineNative: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    width: "100%",
    color: "#A8B4C8",
    marginTop: 4,
  },
  features: { flexDirection: "row", gap: 12, marginBottom: 24 },
  featuresNative: {
    gap: 8,
    marginBottom: 8,
  },
  featureCard: { flex: 1 },
  featureGlass: {
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative",
  },
  featureGlassNative: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  featureFallback: { backgroundColor: "rgba(255,255,255,0.06)" },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  featureIcon: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureIconNative: {
    marginBottom: 2,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  featureLabelNative: {
    fontSize: 9,
    lineHeight: 12,
    minHeight: 24,
  },
});
