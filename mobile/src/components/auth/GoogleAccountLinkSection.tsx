import React, { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useAuth } from "../../stores/AuthContext";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import { AppText as Text } from "../common/AppText";

/** Lets signed-in users link Google to the same Firebase uid (native dev build only). */
export function GoogleAccountLinkSection() {
  const { user, linkGoogleAccount } = useAuth();
  const [busy, setBusy] = useState(false);

  if (Platform.OS === "web" || !user) return null;

  const linked = user.google_linked === true;
  const googleEmail = user.google_email;

  const onLink = async () => {
    triggerHaptic("light");
    setBusy(true);
    try {
      await linkGoogleAccount();
      Alert.alert("Google linked", "You can now sign in with Google or email.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not link Google.";
      if (msg === "GOOGLE_SIGN_IN_CANCELLED") return;
      Alert.alert("Link Google", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ paddingVertical: 4 }}>
      <Text
        style={{
          color: AURORA.textMuted,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.2,
          marginBottom: 10,
        }}
      >
        GOOGLE SIGN-IN
      </Text>
      {linked ? (
        <Text
          style={{
            color: AURORA.textSec,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Google account linked
          {googleEmail ? `: ${googleEmail}` : ""}. You can sign in with Google or
          your password.
        </Text>
      ) : (
        <>
          <Text
            style={{
              color: AURORA.textSec,
              fontSize: 13,
              lineHeight: 19,
              marginBottom: 12,
            }}
          >
            Link your Google account to sign in with Google as well as email and
            password. Your data stays on this account.
          </Text>
          <TouchableOpacity
            onPress={() => void onLink()}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            {busy ? (
              <ActivityIndicator color={AURORA.blue} />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Link Google account
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
