import { type Track } from './types'
export * from './types'

class ZenSoundsService {
  private audio: HTMLAudioElement | null = null
  private currentTrack: Track | null = null
  private volume: number = 0.5

  play(track: Track) {
    // Resume current track
    if (this.currentTrack?.id === track.id && this.audio) {
      this.audio.play().catch(e => console.warn("Audio playback failed:", e))
      return
    }
    
    // Switch to new track
    this.stop()
    this.currentTrack = track
    this.audio = new Audio(track.url)
    this.audio.loop = true
    this.audio.volume = this.volume
    this.audio.play().catch(e => console.warn("Audio playback failed (make sure files exist in public/sounds/):", e))
  }

  pause() {
    if (this.audio) this.audio.pause()
  }

  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.audio = null
    this.currentTrack = null
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.audio) this.audio.volume = this.volume
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack
  }
}

export const zenSoundsService = new ZenSoundsService()