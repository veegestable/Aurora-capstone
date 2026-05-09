import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

const LOGO = require("../assets/logos/logomark light gradient.png");

const SPLASH_BG = "#0F172A";

type Props = {
  onFinish: () => void;
};

/**
 * Full-screen splash shown right after the native Expo splash. Hides the native
 * layer once this view is mounted, then runs a short zoom-in on the Aurora mark
 * and fades out before handing off to the app (same look on iOS and Android).
 */
export function AuroraAnimatedSplash({ onFinish }: Props) {
  const scale = useRef(new Animated.Value(0.58)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void (async () => {
            try {
              await SplashScreen.hideAsync();
            } catch {
              // Still run animation if hide fails (e.g. already hidden).
            }
            if (cancelled) return;

            Animated.spring(scale, {
              toValue: 1,
              friction: 7,
              tension: 55,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished || cancelled) return;
              Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 320,
                useNativeDriver: true,
              }).start(({ finished: fadeDone }) => {
                if (fadeDone && !cancelled) onFinishRef.current();
              });
            });
          })();
        });
      });
    };

    start();

    return () => {
      cancelled = true;
    };
  }, [overlayOpacity, scale]);

  const { width } = Dimensions.get("window");
  const logoSize = Math.min(width * 0.44, 240);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.root, { opacity: overlayOpacity }]}
    >
      <View style={styles.center}>
        <Animated.View
          style={{
            transform: [{ scale }],
            width: logoSize,
            height: logoSize,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={LOGO}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
