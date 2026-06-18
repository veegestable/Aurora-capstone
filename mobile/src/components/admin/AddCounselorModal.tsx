import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, X, ChevronDown } from "lucide-react-native";
import { AppText as Text } from "../common/AppText";
import { Input } from "../common/Input";
import { AURORA } from "../../constants/aurora-colors";
import {
  COLLEGES,
  getCollegeName,
  isCollegeCode,
  type CollegeCode,
} from "../../constants/colleges";
import { getSignupEmailRejectionMessage } from "../../utils/signupEmailPolicy";
import { createCounselorAccount } from "../../services/admin-counselor.service";
import { writeAuditLogTrusted } from "../../services/trusted-backend.service";

interface AddCounselorModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY = {
  fullName: "",
  email: "",
  contactNumber: "",
  collegeCode: "" as CollegeCode | "",
  password: "",
};

export function AddCounselorModal({
  visible,
  onClose,
  onCreated,
}: AddCounselorModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);

  const resetAndClose = () => {
    if (loading) return;
    setForm(EMPTY);
    setError("");
    setSuccessEmail(null);
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    const policyError = getSignupEmailRejectionMessage(form.email);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (!form.fullName.trim()) {
      setError("Enter the counselor's full name.");
      return;
    }
    if (!form.collegeCode || !isCollegeCode(form.collegeCode)) {
      setError("Select a college for this counselor.");
      return;
    }
    if (form.password.length < 6) {
      setError("Temporary password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { uid } = await createCounselorAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        college_code: form.collegeCode,
        ...(form.contactNumber.trim()
          ? { contact_number: form.contactNumber.trim() }
          : {}),
      });
      try {
        await writeAuditLogTrusted({
          action: "counselor_created",
          targetType: "user",
          targetId: uid,
          metadata: {
            counselorName: form.fullName.trim(),
            counselorEmail: form.email.trim().toLowerCase(),
            collegeCode: form.collegeCode,
          },
        });
      } catch {
        /* audit log is best-effort */
      }
      setSuccessEmail(form.email.trim().toLowerCase());
      onCreated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create counselor account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: AURORA.border,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
              Add counselor
            </Text>
            <TouchableOpacity
              onPress={resetAndClose}
              disabled={loading}
              accessibilityLabel="Close"
            >
              <X size={22} color={AURORA.textSec} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {successEmail ? (
              <View>
                <Text
                  style={{
                    color: "#22C55E",
                    fontSize: 15,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  Counselor account created for {successEmail}.
                </Text>
                <Text
                  style={{
                    color: AURORA.textSec,
                    fontSize: 14,
                    lineHeight: 22,
                    marginBottom: 20,
                  }}
                >
                  Share the temporary password securely. The counselor can sign in
                  right away, then use Forgot password on the login screen to set
                  their own password.
                </Text>
                <TouchableOpacity
                  onPress={resetAndClose}
                  style={{
                    backgroundColor: AURORA.blue,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700" }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 20 }}>
                  Counselor accounts are provisioned by admin only and are
                  approved immediately.
                </Text>

                {error ? (
                  <Text style={{ color: "#F87171", fontSize: 13 }}>{error}</Text>
                ) : null}

                <Input
                  variant="glass"
                  label="Full name"
                  className="pl-4"
                  value={form.fullName}
                  onChangeText={(fullName) => setForm((f) => ({ ...f, fullName }))}
                  placeholder="Counselor full name"
                  autoCapitalize="words"
                />
                <Input
                  variant="glass"
                  label="Email"
                  className="pl-4"
                  value={form.email}
                  onChangeText={(email) => setForm((f) => ({ ...f, email }))}
                  placeholder="Institutional email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Input
                  variant="glass"
                  label="Contact number (optional)"
                  className="pl-4"
                  value={form.contactNumber}
                  onChangeText={(contactNumber) =>
                    setForm((f) => ({ ...f, contactNumber }))
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />

                <View>
                  <Text style={styles.fieldLabel}>
                    College <Text style={{ color: "#FCA5A5" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCollegePickerOpen(true)}
                    activeOpacity={0.85}
                    style={styles.collegeField}
                    accessibilityRole="button"
                    accessibilityLabel="Select college"
                  >
                    <Text
                      style={[
                        styles.collegeFieldText,
                        !form.collegeCode && styles.collegeFieldPlaceholder,
                      ]}
                      numberOfLines={2}
                    >
                      {form.collegeCode && isCollegeCode(form.collegeCode)
                        ? `${form.collegeCode} — ${getCollegeName(form.collegeCode)}`
                        : "Select college"}
                    </Text>
                    <ChevronDown size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <View>
                  <View style={{ position: "relative" }}>
                    <Input
                      variant="glass"
                      label="Temporary password"
                      className="pl-4"
                      value={form.password}
                      onChangeText={(password) =>
                        setForm((f) => ({ ...f, password }))
                      }
                      placeholder="At least 6 characters"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.passwordToggle}
                      accessibilityLabel={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#CBD5E1" />
                      ) : (
                        <Eye size={20} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    Share once with the counselor. They can change it via Forgot
                    password on login.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => void handleSubmit()}
                  disabled={loading}
                  style={{
                    backgroundColor: AURORA.blue,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: loading ? 0.7 : 1,
                    marginTop: 8,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ color: "#FFF", fontWeight: "700" }}>
                      Create account
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      <Modal
        visible={collegePickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCollegePickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: AURORA.border,
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "700" }}>
                Select college
              </Text>
              <TouchableOpacity onPress={() => setCollegePickerOpen(false)}>
                <Text style={{ color: AURORA.blue, fontWeight: "600" }}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {COLLEGES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => {
                    setForm((f) => ({ ...f, collegeCode: c.code }));
                    setCollegePickerOpen(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: AURORA.border,
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>{c.code}</Text>
                  <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 2 }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  collegeField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "rgba(166, 166, 166, 0.22)",
    gap: 8,
  },
  collegeFieldText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: AURORA.textPrimary,
  },
  collegeFieldPlaceholder: {
    color: AURORA.textSecPale,
    fontWeight: "500",
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 35,
    padding: 4,
  },
  helperText: {
    color: AURORA.textSecPale,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
});
