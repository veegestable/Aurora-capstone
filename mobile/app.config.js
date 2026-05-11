/**
 * Expo config — merges app.json and injects env at build time.
 * Set EXPO_PUBLIC_OPENAI_API_KEY in `.env` (local) or EAS Secrets (preview/production)
 * so weekly summaries can call OpenAI from the client.
 *
 * GoogleService-Info.plist is generated from EXPO_PUBLIC_FIREBASE_* env vars during
 * `expo prebuild` / EAS Build (plugin `withGoogleServiceInfoPlist`). Do not commit secrets.
 */
const appJson = require("./app.json");
const withGoogleServiceInfoPlist = require("./plugins/withGoogleServiceInfoPlist");

module.exports = {
  expo: {
    ...appJson.expo,
    updates: {
      ...(appJson.expo.updates || {}),
      url: "https://u.expo.dev/797ad4cd-1753-4380-9052-8332a31722e1",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [...(appJson.expo.plugins || []), withGoogleServiceInfoPlist],
    extra: {
      ...(appJson.expo.extra || {}),
      openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
    },
  },
};
