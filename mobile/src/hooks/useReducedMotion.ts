import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Respect system "Reduce motion" — skip or shorten animations when true.
 */
export function useReducedMotion(): boolean {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled().then((v) => {
            if (mounted) setReduceMotion(v);
        });
        const sub =
            typeof AccessibilityInfo.addEventListener === 'function'
                ? AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
                : undefined;
        return () => {
            mounted = false;
            (sub as { remove?: () => void } | undefined)?.remove?.();
        };
    }, []);

    return reduceMotion;
}
