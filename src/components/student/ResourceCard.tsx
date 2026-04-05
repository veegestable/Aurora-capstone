interface ResourceItem {
  id: string
  title: string
  category: string
  duration: string
  type: string
  image: string
}

interface ResourceCardProps {
  item: ResourceItem
  onStart: () => void
}

export function ResourceCard({ item, onStart }: ResourceCardProps) {
  return (
    <div className="card-aurora p-0! overflow-hidden mb-4">
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-40 object-cover"
      />
      <div className="flex items-center justify-between p-3.5 bg-aurora-card/95">
        <div>
          <p className="text-white text-base font-extrabold mb-1">{item.title}</p>
          <div className="flex items-center gap-2">
            <span className="bg-white/10 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-aurora-gray-300">
              {item.duration}
            </span>
            <span className="text-xs text-aurora-gray-400">{item.category}</span>
          </div>
        </div>
        <button
          onClick={onStart}
          className="bg-aurora-accent-purple text-white text-sm font-bold rounded-3xl px-5 py-2.5
                      hover:opacity-90 transition-opacity cursor-pointer"
        >
          Start
        </button>
      </div>
    </div>
  )
}