import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  delayMs?: number
  disabled?: boolean
}

/** Pointer long-press + context menu (right-click) for web. */
export function useLongPress(
  onLongPress: () => void,
  { delayMs = 500, disabled = false }: UseLongPressOptions = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    didLongPressRef.current = false
    clearTimer()
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      onLongPress()
    }, delayMs)
  }, [clearTimer, delayMs, disabled, onLongPress])

  const end = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const consumeIfLongPress = useCallback(() => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false
      return true
    }
    return false
  }, [])

  const handlers = {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return
      start()
    },
    onMouseUp: end,
    onMouseLeave: end,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: end,
    onTouchMove: end,
    onContextMenu: (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      didLongPressRef.current = true
      onLongPress()
    },
  }

  return { handlers, consumeIfLongPress }
}
