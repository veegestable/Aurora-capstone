/**
 * Sudden shift in encoded mood scale — log only, never shown or interpreted to the student.
 * Per ethics spec: no alerts, no causal copy.
 */

import { energyLevelToMoodScale } from './ethicsDailyAnalytics';

export function logSuddenMoodDropIfNeeded(
    previousEnergy: number | undefined,
    currentEnergy: number
): void {
    if (previousEnergy == null || Number.isNaN(previousEnergy)) return;
    const prevM = energyLevelToMoodScale(previousEnergy);
    const curM = energyLevelToMoodScale(currentEnergy);
    if (prevM >= 4 && curM <= 2) {
        // Silent internal record for audit / research pipelines; not user-facing.
        console.log('[Aurora analytics] Sudden low mood shift recorded (internal only).');
    }
}
