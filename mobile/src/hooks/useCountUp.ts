import { useEffect, useState, useRef } from 'react';

/**
 * Animates a numeric display from 0 toward `target` (calm, ~800ms).
 */
export function useCountUp(
    target: number | null,
    durationMs = 800,
    enabled = true,
    reduceMotion = false
): number {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled || target == null || Number.isNaN(target)) {
            setValue(target ?? 0);
            return;
        }
        if (reduceMotion) {
            setValue(target);
            return;
        }

        const start = performance.now();
        const from = 0;
        const to = target;

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - (1 - t) * (1 - t);
            const next = from + (to - from) * eased;
            setValue(next);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                setValue(to);
            }
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
        };
    }, [target, durationMs, enabled, reduceMotion]);

    return value;
}
