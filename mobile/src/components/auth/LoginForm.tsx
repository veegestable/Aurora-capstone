import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import { router } from "expo-router";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { triggerHaptic } from "../../utils/haptics";

/** Same width as native header + feature row; slightly under full bleed for side margins */
export const LOGIN_AUTH_COLUMN_MAX = 288;

export default function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    contactNumber: "",
    role: "student" as "student" | "counselor",
  });

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (isSignUp && !formData.fullName) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (isSignUp && !formData.contactNumber.trim()) {
      Alert.alert("Error", "Please enter your contact number (mobile phone).");
      return;
    }

    if (isSignUp && formData.contactNumber.trim().length < 7) {
      Alert.alert(
        "Error",
        "Please enter a valid contact number (at least 7 digits).",
      );
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role,
          formData.contactNumber.trim(),
        );
        if (result.success) {
          Alert.alert("Success", result.message, [
            { text: "OK", onPress: () => setIsSignUp(false) },
          ]);
          setFormData((prev) => ({
            ...prev,
            password: "",
            contactNumber: "",
          }));
        } else {
          Alert.alert("Registration Failed", result.message);
        }
      } else {
        await signIn(formData.email, formData.password);
        router.replace("/");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === "web";
  const compact = !isWeb;

  const formContent = (
    <>
      <Text
        className={`font-bold text-white text-center ${compact ? "text-lg mb-1.5" : "text-2xl mb-2"}`}
      >
        {isSignUp ? "Create Account" : "Welcome Back"}
      </Text>
      <Text
        style={{ color: "#E2E8F0" }}
        className={`text-center ${compact ? "mb-4 text-xs" : "mb-6 text-base"}`}
      >
        {isSignUp ? "Join Aurora today" : "Sign in to continue"}
      </Text>

      <View
        style={[
          styles.formFields,
          compact && styles.formFieldsCompact,
          compact && isSignUp && styles.formFieldsSignUpCompact,
        ]}
      >
        {isSignUp && (
          <>
            <Input
              variant="glass"
              dense={compact}
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => updateFormData("fullName", text)}
              autoCapitalize="words"
            />
            <Input
              variant="glass"
              dense={compact}
              label="Contact number"
              placeholder="Mobile number (e.g. 09XXXXXXXXX)"
              value={formData.contactNumber}
              onChangeText={(text) => updateFormData("contactNumber", text)}
              keyboardType="phone-pad"
            />
            <View>
              <Text style={[styles.roleLabel, compact && styles.roleLabelCompact]}>
                Sign up as
              </Text>
              <View style={[styles.roleRow, compact && styles.roleRowCompact]}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic("light");
                    updateFormData("role", "student");
                  }}
                  style={[
                    styles.roleBtn,
                    compact && styles.roleBtnCompact,
                    formData.role === "student" && styles.roleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      compact && styles.roleBtnTextCompact,
                      formData.role === "student" && styles.roleBtnTextActive,
                    ]}
                  >
                    Student
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic("light");
                    updateFormData("role", "counselor");
                  }}
                  style={[
                    styles.roleBtn,
                    compact && styles.roleBtnCompact,
                    formData.role === "counselor" && styles.roleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      compact && styles.roleBtnTextCompact,
                      formData.role === "counselor" && styles.roleBtnTextActive,
                    ]}
                  >
                    Counselor
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.role === "counselor" && (
                <Text
                  className={`text-amber-300 ${compact ? "mt-0.5 text-[10px] leading-[14px]" : "text-xs mt-1"}`}
                >
                  {compact
                    ? "Counselor accounts require admin approval."
                    : "Your account will need admin approval before you can access the counselor dashboard."}
                </Text>
              )}
            </View>
          </>
        )}

        <Input
          variant="glass"
          dense={compact}
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(text) => updateFormData("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View className="relative">
          <Input
            variant="glass"
            dense={compact}
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => updateFormData("password", text)}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity
            style={[styles.passwordToggle, { top: compact ? 32 : 40 }]}
            onPress={() => {
              triggerHaptic("light");
              setIsPasswordVisible(!isPasswordVisible);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Hide password" : "Show password"
            }
          >
            {isPasswordVisible ? (
              <EyeOff size={compact ? 18 : 20} color="#CBD5E1" />
            ) : (
              <Eye size={compact ? 18 : 20} color="#CBD5E1" />
            )}
          </TouchableOpacity>
        </View>

        <Button
          onPress={handleSubmit}
          loading={loading}
          size={compact ? "sm" : "md"}
          className={compact ? "mt-3 py-3" : "mt-2"}
        >
          {isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </View>

      <TouchableOpacity
        onPress={() => {
          triggerHaptic("light");
          setIsSignUp(!isSignUp);
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          isSignUp ? "Sign in with an existing account" : "Create a new account"
        }
        accessibilityHint={
          isSignUp ? "Opens the sign-in form" : "Opens the sign-up form"
        }
        className={compact ? "mt-3 items-center py-2" : "mt-6 items-center py-2"}
      >
        <Text
          style={{ color: "#93C5FD" }}
          className={`font-medium ${compact ? "text-sm" : "text-base"}`}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>

      {/* Omit on native sign-up so the taller form fits; keep on sign-in */}
      {!(compact && isSignUp) && (
        <View style={[styles.trustSection, compact && styles.trustSectionCompact]}>
          {["Students", "Support", "Care"].map((text, i) => (
            <View key={i} style={styles.trustItem}>
              <View style={[styles.trustDot, compact && styles.trustDotCompact]} />
              <Text style={[styles.trustText, compact && styles.trustTextCompact]}>
                {text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.wrapper, compact && styles.wrapperNarrow]}>
      {isWeb ? (
        <View style={[styles.glass, styles.glassFallback]}>{formContent}</View>
      ) : (
        <BlurView intensity={60} tint="dark" style={[styles.glass, compact && styles.glassCompact]}>
          <View style={styles.glassOverlay} />
          <View style={[styles.glassContent, compact && styles.glassContentCompact]}>
            {formContent}
          </View>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 24, overflow: "hidden" },
  /** Native: centered column with side margins so the card is not edge-to-edge */
  wrapperNarrow: {
    alignSelf: "center",
    width: "100%",
    maxWidth: LOGIN_AUTH_COLUMN_MAX,
    borderRadius: 14,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    padding: 6,
    zIndex: 2,
  },
  glass: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    position: "relative",
  },
  glassCompact: {
    borderRadius: 14,
  },
  glassFallback: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 24,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  glassContent: { padding: 24 },
  glassContentCompact: { paddingVertical: 16, paddingHorizontal: 16 },
  formFields: { gap: 20 },
  formFieldsCompact: { gap: 12 },
  formFieldsSignUpCompact: { gap: 9 },
  trustSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.35)",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  trustSectionCompact: {
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
    opacity: 0.92,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  trustText: {
    fontSize: 12,
    color: "#E2E8F0",
  },
  trustTextCompact: { fontSize: 10 },
  trustDotCompact: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  roleBtnActive: {
    borderColor: "rgba(96, 165, 250, 0.8)",
    backgroundColor: "rgba(59, 130, 246, 0.25)",
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  roleBtnTextActive: {
    color: "#93C5FD",
  },
  roleLabelCompact: {
    fontSize: 11,
    marginBottom: 6,
  },
  roleRowCompact: { gap: 8 },
  roleBtnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  roleBtnTextCompact: {
    fontSize: 12,
  },
});
