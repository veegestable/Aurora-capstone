import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { AppText as Text } from "../common/AppText";
import { BlurView } from "expo-blur";
import { Eye, EyeOff, ChevronDown } from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import { router } from "expo-router";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import {
  AuroraMessageModal,
  type AuroraMessageTone,
} from "../common/AuroraMessageModal";
import { triggerHaptic } from "../../utils/haptics";
import {
  getSignupEmailRejectionMessage,
  isMsuiitInstitutionalEmail,
} from "../../utils/signupEmailPolicy";
import {
  getRetryAfterSecondsFromError,
  parseRetryAfterSecondsFromText,
  stripRetrySecondsFromMessage,
} from "../../utils/rateLimitError";
import { toUserFacingSignUpTrustedErrorResult } from "../../utils/signUpTrustedErrors";
import {
  COLLEGES,
  getCollegeName,
  isCollegeCode,
} from "../../constants/colleges";
import {
  getProgramsForCollege,
  isProgramInCollege,
} from "../../constants/college-programs-iit";

/** Same width as native header + feature row; slightly under full bleed for side margins */
export const LOGIN_AUTH_COLUMN_MAX = 320;

const REGISTRATION_RESEND_COOLDOWN_SEC = 60;
const SIGN_IN_RESEND_COOLDOWN_SEC = 60;

export type LoginFormProps = {
  /** Called after switching from sign-in to sign-up so the parent ScrollView can reveal the taller form */
  onSwitchToSignUp?: () => void;
};

export default function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const { signIn, signUp, resendRegistrationVerificationEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpPhase, setSignUpPhase] = useState<"form" | "verifyEmail">(
    "form",
  );
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [signInResendCooldownSeconds, setSignInResendCooldownSeconds] =
    useState(0);
  const [signInResendLoading, setSignInResendLoading] = useState(false);
  /** Sign-in resend row: only after MSU-IIT registration flow, or failed sign-in (unverified). */
  const [showMsuiitSignInResendOption, setShowMsuiitSignInResendOption] =
    useState(false);
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);
  const [programPickerOpen, setProgramPickerOpen] = useState(false);
  const [messageModal, setMessageModal] = useState<{
    title: string;
    body: string;
    tone: AuroraMessageTone;
    retryAfterSeconds?: number | null;
  } | null>(null);

  const showMessage = (
    title: string,
    body: string,
    tone: AuroraMessageTone = "error",
    retryAfterSeconds?: number | null,
  ) => {
    if (tone === "error") triggerHaptic("heavy");
    else if (tone === "success") triggerHaptic("medium");
    else triggerHaptic("light");

    const parsed =
      retryAfterSeconds ??
      parseRetryAfterSecondsFromText(body) ??
      null;
    const displayBody =
      parsed != null ? stripRetrySecondsFromMessage(body) : body;

    setMessageModal({
      title,
      body: displayBody,
      tone,
      retryAfterSeconds: parsed,
    });
  };

  const showErrorFromUnknown = (title: string, err: unknown) => {
    const trusted = toUserFacingSignUpTrustedErrorResult(err);
    const retry =
      trusted.retryAfterSeconds ?? getRetryAfterSecondsFromError(err);
    showMessage(title, trusted.message, "error", retry);
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    contactNumber: "",
    collegeCode: "",
    program: "",
  });

  useEffect(() => {
    const list = [...getProgramsForCollege(formData.collegeCode)];
    setFormData((prev) => {
      if (!prev.program || list.includes(prev.program)) return prev;
      return { ...prev, program: "" };
    });
  }, [formData.collegeCode]);

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const showRegistrationVerifyStep =
    isSignUp && signUpPhase === "verifyEmail";

  useEffect(() => {
    if (!showRegistrationVerifyStep) {
      setResendCooldownSeconds(0);
      return;
    }
    setResendCooldownSeconds(REGISTRATION_RESEND_COOLDOWN_SEC);
    const id = setInterval(() => {
      setResendCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [showRegistrationVerifyStep]);

  useEffect(() => {
    if (signInResendCooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setSignInResendCooldownSeconds((p) => (p <= 1 ? 0 : p - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [signInResendCooldownSeconds]);

  const handleResendVerificationFromSignIn = async () => {
    if (signInResendCooldownSeconds > 0 || signInResendLoading) return;
    if (!formData.email.trim() || !formData.password) {
      showMessage("Required", "Enter your email and password first.", "info");
      return;
    }
    setSignInResendLoading(true);
    try {
      const result = await resendRegistrationVerificationEmail(
        formData.email,
        formData.password,
      );
      if (result.success) {
        setSignInResendCooldownSeconds(SIGN_IN_RESEND_COOLDOWN_SEC);
        showMessage(
          "Email sent",
          "Check your inbox for a new verification link.",
          "success",
        );
      } else {
        showMessage("Could not resend", result.message, "error");
      }
    } finally {
      setSignInResendLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (resendCooldownSeconds > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const result = await resendRegistrationVerificationEmail(
        formData.email,
        formData.password,
      );
      if (result.success) {
        setResendCooldownSeconds(REGISTRATION_RESEND_COOLDOWN_SEC);
      } else {
        showMessage("Could not resend", result.message, "error");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleContinueAfterRegistrationEmail = () => {
    setShowMsuiitSignInResendOption(
      isMsuiitInstitutionalEmail(formData.email),
    );
    setSignUpPhase("form");
    setIsSignUp(false);
    setFormData((prev) => ({
      ...prev,
      password: "",
      contactNumber: "",
      collegeCode: "",
      program: "",
    }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      showMessage("Missing information", "Please fill in all fields.", "info");
      return;
    }

    if (isSignUp && !formData.fullName) {
      showMessage("Missing information", "Please enter your full name.", "info");
      return;
    }

    if (isSignUp && !formData.contactNumber.trim()) {
      showMessage(
        "Missing information",
        "Please enter your contact number (mobile phone).",
        "info",
      );
      return;
    }

    if (isSignUp && formData.contactNumber.trim().length < 7) {
      showMessage(
        "Invalid contact number",
        "Please enter a valid contact number (at least 7 digits).",
        "info",
      );
      return;
    }

    if (
      isSignUp &&
      (!formData.collegeCode.trim() || !isCollegeCode(formData.collegeCode.trim()))
    ) {
      showMessage(
        "College required",
        "Please select your college from the list.",
        "info",
      );
      return;
    }

    if (
      isSignUp &&
      (!formData.program.trim() ||
        !isProgramInCollege(formData.collegeCode.trim(), formData.program.trim()))
    ) {
      showMessage(
        "Program required",
        "After choosing your college, select your degree program from the list.",
        "info",
      );
      return;
    }

    if (isSignUp) {
      const policyError = getSignupEmailRejectionMessage(formData.email);
      if (policyError) {
        showMessage("Email not allowed", policyError, "error");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          "student",
          formData.contactNumber.trim(),
          formData.collegeCode.trim(),
          formData.program.trim(),
        );
        if (result.success) {
          setSignUpPhase("verifyEmail");
        } else {
          showMessage(
            "Registration failed",
            result.message,
            "error",
            parseRetryAfterSecondsFromText(result.message),
          );
        }
      } else {
        await signIn(formData.email, formData.password);
        router.replace("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (
        !isSignUp &&
        isMsuiitInstitutionalEmail(formData.email) &&
        typeof msg === "string" &&
        msg.includes("Verify your email before signing in")
      ) {
        setShowMsuiitSignInResendOption(true);
      }
      showErrorFromUnknown(
        isSignUp ? "Registration failed" : "Couldn't sign in",
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === "web";
  const compact = !isWeb;

  const formContent = (
    <>
      <Text
        className={`font-bold text-white text-center ${compact ? "text-xl mb-1.5" : "text-2xl mb-2"}`}
      >
        {showRegistrationVerifyStep
          ? "Verify your email"
          : isSignUp
            ? "Create Account"
            : "Welcome Back"}
      </Text>
      <Text
        style={{ color: "#E2E8F0" }}
        className={`text-center ${compact ? "mb-4 text-sm" : "mb-6 text-base"}`}
      >
        {showRegistrationVerifyStep
          ? `We sent a message to ${formData.email.trim()}`
          : isSignUp
            ? "Join Aurora today"
            : "Sign in to continue"}
      </Text>

      <View
        style={[
          styles.formFields,
          compact && styles.formFieldsCompact,
          compact && isSignUp && !showRegistrationVerifyStep && styles.formFieldsSignUpCompact,
        ]}
      >
        {showRegistrationVerifyStep ? (
          <>
            <Text
              style={[styles.verifyBody, compact && styles.verifyBodyCompact]}
            >
              Check your email and tap the verification link. Once verified,
              go back and sign in to continue.
            </Text>
            <Button
              onPress={handleResendVerificationEmail}
              loading={resendLoading}
              disabled={resendCooldownSeconds > 0}
              variant="outline"
              size="md"
              className={compact ? "mt-1 py-3" : "mt-2"}
            >
              Send verification email again
            </Button>
            <Button
              onPress={handleContinueAfterRegistrationEmail}
              disabled={resendLoading}
              size="md"
              className={compact ? "mt-2 py-3" : "mt-2"}
            >
              Continue to sign in
            </Button>
          </>
        ) : (
          <>
            {isSignUp && (
              <>
                <Input
                  variant="glass"
                  dense={compact}
                  label="Full Name"
                  placeholder="Enter your full name"
                  className="pl-4"
                  value={formData.fullName}
                  onChangeText={(text) => updateFormData("fullName", text)}
                  autoCapitalize="words"
                />
                <Input
                  variant="glass"
                  dense={compact}
                  label="Contact number"
                  placeholder="Enter your contact number"
                  className="pl-4"
                  value={formData.contactNumber}
                  onChangeText={(text) => updateFormData("contactNumber", text)}
                  keyboardType="phone-pad"
                />
                <View>
                  <Text
                    style={[styles.roleLabel, compact && styles.roleLabelCompact]}
                  >
                    College <Text style={{ color: "#FCA5A5" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic("light");
                      setCollegePickerOpen(true);
                    }}
                    activeOpacity={0.85}
                    style={[
                      styles.collegeField,
                      compact && styles.collegeFieldCompact,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Select college"
                  >
                    <Text
                      style={[
                        styles.collegeFieldText,
                        compact && styles.collegeFieldTextCompact,
                        !formData.collegeCode && styles.collegeFieldPlaceholder,
                      ]}
                      numberOfLines={2}
                    >
                      {formData.collegeCode &&
                      isCollegeCode(formData.collegeCode.trim())
                        ? `${formData.collegeCode.trim()} — ${getCollegeName(formData.collegeCode.trim())}`
                        : "Select your college"}
                    </Text>
                    <ChevronDown size={compact ? 18 : 20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>
                {formData.collegeCode.trim() &&
                  isCollegeCode(formData.collegeCode.trim()) && (
                    <View>
                      <Text
                        style={[styles.roleLabel, compact && styles.roleLabelCompact]}
                      >
                        Program <Text style={{ color: "#FCA5A5" }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic("light");
                          setProgramPickerOpen(true);
                        }}
                        activeOpacity={0.85}
                        style={[
                          styles.collegeField,
                          compact && styles.collegeFieldCompact,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Select degree program"
                      >
                        <Text
                          style={[
                            styles.collegeFieldText,
                            compact && styles.collegeFieldTextCompact,
                            !formData.program && styles.collegeFieldPlaceholder,
                          ]}
                          numberOfLines={3}
                        >
                          {formData.program || "Select your program"}
                        </Text>
                        <ChevronDown size={compact ? 18 : 20} color="#CBD5E1" />
                      </TouchableOpacity>
                    </View>
                  )}
              </>
            )}

            <Input
              variant="glass"
              dense={compact}
              label="Email"
              placeholder="Enter your MSU-IIT email"
              className="pl-4"
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
                className="pl-4"
                value={formData.password}
                onChangeText={(text) => updateFormData("password", text)}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity
                style={[styles.passwordToggle, { top: compact ? 36 : 40 }]}
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

            {!isSignUp && (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic("light");
                  router.push("/(auth)/forgot-password");
                }}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                style={styles.forgotPasswordWrap}
              >
                <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {!isSignUp && showMsuiitSignInResendOption && (
              <View style={styles.signInResendWrap}>
                <Text
                  style={[
                    styles.signInResendHint,
                    compact && styles.signInResendHintCompact,
                  ]}
                >
                  Need a new verification link?
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic("light");
                    void handleResendVerificationFromSignIn();
                  }}
                  disabled={
                    signInResendCooldownSeconds > 0 || signInResendLoading
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification email"
                >
                  <Text
                    style={[
                      styles.signInResendLink,
                      (signInResendCooldownSeconds > 0 || signInResendLoading) &&
                        styles.signInResendLinkDisabled,
                    ]}
                  >
                    {signInResendLoading
                      ? "Sending…"
                      : "Resend verification email"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              onPress={handleSubmit}
              loading={loading}
              size="md"
              className={compact ? "mt-3 py-3" : "mt-2"}
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={() => {
          triggerHaptic("light");
          setSignUpPhase("form");
          setShowMsuiitSignInResendOption(false);
          const nextIsSignUp = !isSignUp;
          setIsSignUp(nextIsSignUp);
          if (nextIsSignUp) {
            onSwitchToSignUp?.();
          }
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
          className="font-medium text-base"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>

      {/* Omit on native sign-up so the taller form fits; keep on sign-in */}
      {!(compact && isSignUp) && !showRegistrationVerifyStep && (
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

  const glassNativeSolid =
    Platform.OS === "android" ? (
      <View
        style={[
          styles.glass,
          compact && styles.glassCompact,
          styles.glassAndroidSolid,
        ]}
      >
        <View style={[styles.glassContent, compact && styles.glassContentCompact]}>
          {formContent}
        </View>
      </View>
    ) : (
      <BlurView intensity={60} tint="dark" style={[styles.glass, compact && styles.glassCompact]}>
        <View style={styles.glassOverlay} />
        <View style={[styles.glassContent, compact && styles.glassContentCompact]}>
          {formContent}
        </View>
      </BlurView>
    );

  return (
    <>
      <View style={[styles.wrapper, compact && styles.wrapperNarrow]}>
        {isWeb ? (
          <View style={[styles.glass, styles.glassFallback]}>{formContent}</View>
        ) : (
          glassNativeSolid
        )}
      </View>

      <Modal
        visible={collegePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCollegePickerOpen(false)}
      >
        <View style={styles.collegeModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCollegePickerOpen(false)}
          />
          <View style={styles.collegeModalSheet}>
            <Text style={styles.collegeModalTitle}>Select your college</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
            >
              {COLLEGES.map((row) => (
                <TouchableOpacity
                  key={row.code}
                  onPress={() => {
                    triggerHaptic("light");
                    setFormData((prev) => ({
                      ...prev,
                      collegeCode: row.code,
                      program:
                        prev.collegeCode.trim() === row.code
                          ? prev.program
                          : "",
                    }));
                    setCollegePickerOpen(false);
                  }}
                  style={[
                    styles.collegeModalRow,
                    formData.collegeCode === row.code &&
                      styles.collegeModalRowActive,
                  ]}
                >
                  <Text style={styles.collegeModalRowText}>
                    {row.code} — {row.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setCollegePickerOpen(false)}
              style={styles.collegeModalClose}
            >
              <Text style={styles.collegeModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={programPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProgramPickerOpen(false)}
      >
        <View style={styles.collegeModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setProgramPickerOpen(false)}
          />
          <View style={styles.collegeModalSheet}>
            <Text style={styles.collegeModalTitle}>Select your program</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
            >
              {getProgramsForCollege(formData.collegeCode).map((label) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => {
                    triggerHaptic("light");
                    setFormData((prev) => ({ ...prev, program: label }));
                    setProgramPickerOpen(false);
                  }}
                  style={[
                    styles.collegeModalRow,
                    formData.program === label && styles.collegeModalRowActive,
                  ]}
                >
                  <Text style={styles.collegeModalRowText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setProgramPickerOpen(false)}
              style={styles.collegeModalClose}
            >
              <Text style={styles.collegeModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AuroraMessageModal
        visible={messageModal != null}
        title={messageModal?.title ?? ""}
        body={messageModal?.body ?? ""}
        tone={messageModal?.tone ?? "error"}
        retryAfterSeconds={messageModal?.retryAfterSeconds}
        onDismiss={() => setMessageModal(null)}
      />
    </>
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
    zIndex: 2,
  },
  glass: {
    borderRadius: 24,
    borderWidth: 0.5,
    // borderColor: "rgba(255,255,255,0.18)",
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
  /** Android: expo-blur native view is often unavailable — match iOS card weight without blur */
  glassAndroidSolid: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
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
  trustTextCompact: { fontSize: 12 },
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
  roleLabelCompact: {
    fontSize: 13,
    marginBottom: 6,
  },
  forgotPasswordWrap: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPasswordLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#60A5FA",
  },
  collegeField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.1)",
    gap: 8,
  },
  collegeFieldCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  collegeFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  collegeFieldTextCompact: {
    fontSize: 14,
  },
  collegeFieldPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  collegeModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  collegeModalSheet: {
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  collegeModalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  collegeModalRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  collegeModalRowActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  collegeModalRowText: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "500",
  },
  collegeModalClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  collegeModalCloseText: {
    color: "#93C5FD",
    fontSize: 16,
    fontWeight: "600",
  },
  verifyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#E2E8F0",
  },
  verifyBodyCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  signInResendWrap: {
    marginTop: 4,
    alignItems: "center",
    gap: 4,
  },
  signInResendHint: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  signInResendHintCompact: {
    fontSize: 12,
  },
  signInResendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#93C5FD",
    textDecorationLine: "underline",
  },
  signInResendLinkDisabled: {
    color: "#64748B",
    textDecorationLine: "none",
  },
});
