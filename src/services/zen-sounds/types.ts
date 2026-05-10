export interface Track {
  id: string
  title: string
  url: string
  volume?: number
}

export interface ZenPlaybackState {
  isLoading: boolean
  hasError: boolean
  errorMessage: string | null
}