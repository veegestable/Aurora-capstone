/**
 * Zen ambient sounds - maps resource type and title to local bundled assets.
 * Avoids CORS by using require() instead of remote URLs.
 */
import { Audio } from 'expo-av';

export type ResourceType = 'Meditation' | 'Focus' | 'Sleep';

// Local bundled sounds (from Relaxation-tracks, Pixabay-sourced)
const SOUND_MAP: Record<ResourceType, number> = {
  Meditation: require('../../assets/sounds/meditation.mp3'),
  Focus: require('../../assets/sounds/focus.mp3'),
  Sleep: require('../../assets/sounds/sleep.mp3'),
};

// Per-title overrides for variety
const TITLE_SOUNDS: Record<string, number> = {
  '5-Minute Calm': require('../../assets/sounds/calm-5min.mp3'),
  'Stress Release Scan': require('../../assets/sounds/stress-release.mp3'),
  'Morning Focus': require('../../assets/sounds/morning-focus.mp3'),
  'Sleep Journey': require('../../assets/sounds/sleep.mp3'),
};

let currentSound: Audio.Sound | null = null;

function getSoundSource(type: ResourceType, title?: string): number {
  if (title && TITLE_SOUNDS[title] !== undefined) return TITLE_SOUNDS[title];
  return SOUND_MAP[type] ?? SOUND_MAP.Meditation;
}

export async function playAmbientSound(type: ResourceType, title?: string): Promise<void> {
  try {
    await stopAmbientSound();
    // Required for playback on iOS (silent switch) and Android
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const source = getSoundSource(type, title);
    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true, isLooping: true, volume: 0.5 }
    );
    currentSound = sound;
  } catch (e) {
    console.warn('Zen ambient sound failed to load:', e);
  }
}

export async function stopAmbientSound(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch {
    currentSound = null;
  }
}

export async function pauseAmbientSound(): Promise<void> {
  try {
    if (currentSound) await currentSound.pauseAsync();
  } catch {}
}

export async function resumeAmbientSound(): Promise<void> {
  try {
    if (currentSound) await currentSound.playAsync();
  } catch {}
}

export async function setAmbientVolume(volume: number): Promise<void> {
  try {
    if (currentSound) await currentSound.setVolumeAsync(volume);
  } catch {}
}
