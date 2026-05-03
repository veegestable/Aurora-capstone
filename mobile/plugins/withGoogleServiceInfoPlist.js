const {
  withDangerousMod,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const fs = require("fs/promises");
const path = require("path");

function escapeXml(text) {
  if (text == null || text === "") return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function inferredDatabaseUrl(projectId) {
  if (!projectId) return "";
  return `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
}

function buildPlist(env, bundleIdentifier) {
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const messagingSenderId = env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const databaseUrl =
    env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || inferredDatabaseUrl(projectId);

  const missing = [];
  if (!apiKey) missing.push("EXPO_PUBLIC_FIREBASE_API_KEY");
  if (!messagingSenderId)
    missing.push("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!projectId) missing.push("EXPO_PUBLIC_FIREBASE_PROJECT_ID");
  if (!storageBucket) missing.push("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!appId) missing.push("EXPO_PUBLIC_FIREBASE_APP_ID");
  if (!bundleIdentifier) missing.push("ios.bundleIdentifier");

  if (missing.length) {
    throw new Error(
      `[withGoogleServiceInfoPlist] Missing ${missing.join(", ")}. Set env vars (see mobile/.env.example) before running expo prebuild or eas build.`,
    );
  }

  const esc = escapeXml;
  const dbBlock = databaseUrl
    ? `\t<key>DATABASE_URL</key>\n\t<string>${esc(databaseUrl)}</string>\n`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>API_KEY</key>
	<string>${esc(apiKey)}</string>
	<key>GCM_SENDER_ID</key>
	<string>${esc(messagingSenderId)}</string>
	<key>PLIST_VERSION</key>
	<string>1</string>
	<key>BUNDLE_ID</key>
	<string>${esc(bundleIdentifier)}</string>
	<key>PROJECT_ID</key>
	<string>${esc(projectId)}</string>
	<key>STORAGE_BUCKET</key>
	<string>${esc(storageBucket)}</string>
	<key>IS_ADS_ENABLED</key>
	<false/>
	<key>IS_ANALYTICS_ENABLED</key>
	<false/>
	<key>IS_APPINVITE_ENABLED</key>
	<true/>
	<key>IS_GCM_ENABLED</key>
	<true/>
	<key>IS_SIGNIN_ENABLED</key>
	<true/>
	<key>GOOGLE_APP_ID</key>
	<string>${esc(appId)}</string>
${dbBlock}</dict>
</plist>
`;
}

function withGoogleServiceInfoPlist(config) {
  return withDangerousMod(config, [
    "projectRoot",
    async (cfg) => {
      const bundleIdentifier = cfg.ios?.bundleIdentifier;
      const plistPath = path.join(
        cfg.modRequest.projectRoot,
        "GoogleService-Info.plist",
      );
      const contents = buildPlist(process.env, bundleIdentifier);
      await fs.writeFile(plistPath, contents, "utf8");
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withGoogleServiceInfoPlist,
  "with-google-service-info-plist",
  "1.0.0",
);
