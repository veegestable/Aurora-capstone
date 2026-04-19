import { useEffect, useMemo, useRef, useState } from 'react'
import { Megaphone, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react'
import { announcementsService } from '../../services/announcements'
import type { Announcement } from '../../types/announcement.types'
import { AnnouncementDetailModal } from './AnnouncementDetailModal'

interface AnnouncementBannerProps {
  role: 'counselor' | 'student'
  maxCount?: number
  autoPlayInterval?: number
  compact?: boolean
}

function formatShortDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AnnouncementBanner({
  role,
  maxCount = 20,
  autoPlayInterval = 5000,
  compact = false
}: AnnouncementBannerProps) {
  const [items, setItems] = useState<Announcement[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    const unsub = announcementsService.subscribeForRole(
      role,
      maxCount,
      (list) => {
        setItems(list)
        setActiveIndex((prev) => (prev >= list.length ? 0 : prev))
      },
      (err) => console.warn('AnnouncementBanner subscription error:', err)
    )
    return unsub
  }, [role, maxCount])

  const canRotate = useMemo(
    () => items.length > 1 && autoPlayInterval > 0 && !paused && !selected,
    [items.length, autoPlayInterval, paused, selected]
  )

  useEffect(() => {
    if (!canRotate) return
    intervalRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length)
    }, autoPlayInterval)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [canRotate, autoPlayInterval, items.length])

  if (items.length === 0) return null

  const goTo = (i: number) => {
    setActiveIndex((i + items.length) % items.length)
  }

  return (
    <>
      <section
        className="group/banner relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
        aria-label="Announcements"
      >
        {/* Header */}
        {!compact && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-aurora-blue" />
              <h3 className="text-xs font-bold tracking-[0.18em] text-aurora-text-muted uppercase">
                Announcements
              </h3>
            </div>
            {items.length > 1 && (
              <span className="text-[11px] font-medium tabular-nums text-aurora-text-muted">
                {String(activeIndex + 1).padStart(2, '0')}
                <span className="opacity-40"> / {String(items.length).padStart(2, '0')}</span>
              </span>
            )}
          </div>
        )}
        
        {/* Viewport */}
        <div className="relative overflow-hidden rounded-[14px] border border-aurora-border bg-aurora-card">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="shrink-0 w-full text-left cursor-pointer"
                aria-label={`Read announcement: ${item.title}`}
              >
                <article className="flex h-[104px] sm:h-[112px] overflow-hidden">
                  {/* Image */}
                  <div className="relative w-28 sm:w-36 shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        {/* Right-edge fade into card */}
                        <div className="absolute inset-y-0 right-0 w-10 bg-linear-to-l from-aurora-card to-transparent pointer-events-none" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-[rgba(45,107,255,0.3)] via-[rgba(45,107,255,0.1)] to-[rgba(124,58,237,0.15)] flex items-center justify-center">
                        <Megaphone className="w-7 h-7 text-aurora-blue/80" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-3 pr-12 pl-1 flex flex-col justify-center gap-1">
                    <div className="flex items-start gap-2">
                      <h4 className="text-sm sm:text-[15px] font-bold text-white leading-tight line-clamp-1 flex-1">
                        {item.title}
                      </h4>
                      <ArrowUpRight className="w-4 h-4 text-aurora-text-muted shrink-0 mt-0.5 transition-colors group-hover/banner:text-aurora-blue" />
                    </div>
                    <p className="text-xs text-aurora-text-sec leading-snug line-clamp-2">
                      {item.content}
                    </p>
                    <p className="text-[10px] tracking-wide text-aurora-text-muted mt-0.5">
                      {item.createdByName ? `${item.createdByName} · ` : ''}
                      {formatShortDate(item.createdAt)}
                    </p>
                  </div>
                </article>
              </button>
            ))}
          </div>

          {/* Nav arrows — only on hover, tucked into the right edge */}
          {items.length > 1 && (
            <div className="absolute inset-y-0 right-2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover/banner:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
                className="w-7 h-7 rounded-full bg-aurora-bg/90 hover:bg-aurora-blue/20 border border-aurora-border hover:border-aurora-blue/50 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous announcement"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
                className="w-7 h-7 rounded-full bg-aurora-bg/90 hover:bg-aurora-blue/20 border border-aurora-border hover:border-aurora-blue/50 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next announcement"
              >
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === activeIndex
                    ? 'w-8 bg-aurora-blue shadow-[0_0_8px_rgba(45,107,255,0.6)]'
                    : 'w-2 bg-aurora-text-muted/30 hover:bg-aurora-text-muted/60'
                }`}
                aria-label={`Go to announcement ${i + 1}`}
                aria-current={i === activeIndex}
              />
            ))}
          </div>
        )}
      </section>

      <AnnouncementDetailModal
        announcement={selected}
        showAuthor={role !== 'student'}
        onClose={() => setSelected(null)}
      />
    </>
  )
}