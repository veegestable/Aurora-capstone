---
description: Debugging Workflow for Expo Router Navigation Issues
---

# Debugging Workflow

1. **Check app.json**: Confirm if `expo-router` is listed in the plugins.
2. **Verify _layout.tsx**: Ensure this file exists in the `/app` directory and properly exports a `<Stack />`, `<Tabs />`, or `<Slot />`.
3. **Validate Hook Imports**: Ensure I'm importing from `expo-router` (e.g., `import { useRouter } from 'expo-router'`) rather than the core `@react-navigation/native` library, which can cause context mismatches in Expo projects.
4. **Cache Reset Instruction**: Always conclude a fix by recommending `npx expo start -c` to clear the Metro bundler cache, as navigation errors are frequently "ghosts" of old code.
