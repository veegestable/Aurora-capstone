import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  open: boolean
  children: ReactNode
}

/** Renders modals on `document.body` so they stack above fixed layout chrome (e.g. mobile nav). */
export function ModalPortal({ open, children }: ModalPortalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return createPortal(children, document.body)
}
