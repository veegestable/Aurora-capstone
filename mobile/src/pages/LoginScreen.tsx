import React, { useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Heart, Brain, Users } from "lucide-react-native";
import { Stack } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LoginForm, { LOGIN_AUTH_COLUMN_MAX } from "../components/auth/LoginForm";
import { AppText as Text } from "../components/common/AppText";

const FEATURES = [
  { icon: Brain, label: "Mood tracking", color: "#34D399" },
  { icon: Users, label: "Counselor support", color: "#F59E0B" },
  { icon: Heart, label: "Wellness tools", color: "#EC4899" },
];

export default function LoginScreen() {
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const scrollAuthIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <SafeAreaView className="flex-1 bg-primary">
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          ref={scrollRef}
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
                {
                  "Small check-ins. Bigger conversations.\nClarity for students. Context for counselors."
                }
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
                <View
                  style={[
                    styles.featureGlass,
                    !isWeb && styles.featureGlassNative,
                  ]}
                >
                  <View
                    style={[styles.featureIcon, !isWeb && styles.featureIconNative]}
                  >
                    <item.icon size={isWeb ? 22 : 16} color={item.color} />
                  </View>
                  <Text
                    style={[styles.featureLabel, !isWeb && styles.featureLabelNative]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Auth Form */}
          <LoginForm onSwitchToSignUp={scrollAuthIntoView} />
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
    paddingBottom: 48,
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
    width: 210,
    height: 210,
    marginBottom: 0,
    marginTop: 35,
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
    marginTop: 0,
  },
  features: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  featuresNative: {
    gap: 8,
    marginBottom: 8,
  },
  featureCard: { flex: 1 },
  featureGlass: {
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    // borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative",
  },
  featureGlassNative: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  featureIcon: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureIconNative: {
    marginBottom: 8,
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
