import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigationState } from '@react-navigation/native';

const springConfig = { damping: 15, stiffness: 400 };

interface AnimatedTabBarButtonProps {
  children?: React.ReactNode;
  onPress?: (e: unknown) => void;
  onLongPress?: (e: unknown) => void | null;
  style?: object;
  routeName: string;
  [key: string]: unknown;
}

export function AnimatedTabBarButton({
  children,
  onPress,
  onLongPress,
  style,
  routeName,
  ...rest
}: AnimatedTabBarButtonProps) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const currentRoute = useNavigationState(
    (state) => state?.routes?.[state?.index]?.name
  );
  const focused = currentRoute === routeName;

  React.useEffect(() => {
    bgOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <Pressable
      onPress={onPress as () => void}
      onLongPress={onLongPress ?? undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrapper, style] as object}
      {...(rest as object)}
    >
      <Animated.View style={[styles.inner, animatedContainerStyle]}>
        <Animated.View style={[styles.pill, animatedBgStyle]} />
        <View style={styles.content}>{children as React.ReactNode}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    minWidth: 68,

  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 68,
    position: 'relative',
    overflow: 'visible',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 107, 255, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 107, 255, 0.35)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    paddingHorizontal: 2,
  },
});
