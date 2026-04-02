/**
 * Expo config — merges app.json and injects env at build time.
 * Set EXPO_PUBLIC_OPENAI_API_KEY in `.env` (local) or EAS Secrets (preview/production)
 * so weekly summaries can call OpenAI from the client.
 */
const appJson = require('./app.json');

module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            ...(appJson.expo.extra || {}),
            openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
        },
    },
};
