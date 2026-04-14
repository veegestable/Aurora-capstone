import logoLight from '../assets/logos/logo light.png'

const STARS = [
  { top: '10%', left: '15%', delay: '0s', size: '2px' },
  { top: '20%', left: '70%', delay: '1.5s', size: '1.5px' },
  { top: '40%', left: '85%', delay: '0.8s', size: '2px' },
  { top: '60%', left: '10%', delay: '2.2s', size: '1.5px' },
  { top: '75%', left: '50%', delay: '0.3s', size: '2px' },
  { top: '85%', left: '30%', delay: '1s', size: '1.5px' },
  { top: '15%', left: '45%', delay: '1.8s', size: '1px' },
  { top: '50%', left: '60%', delay: '2.5s', size: '1px' },
  { top: '30%', left: '25%', delay: '0.5s', size: '1.5px' },
  { top: '90%', left: '75%', delay: '1.2s', size: '2px' },
]

export default function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #10143C 0%, #0B0D30 50%, #080B25 100%)' }}
    >
      {/* Aurora ribbon bands */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/4 w-[150%] h-[60%] rounded-full animate-aurora-float"
          style={{
            background: 'linear-gradient(135deg, rgba(45,107,255,0.12), rgba(124,58,237,0.08), transparent)',
            filter: 'blur(80px)',
            animationDuration: '8s',
          }}
        />
        <div
          className="absolute -bottom-1/3 -right-1/4 w-[120%] h-[50%] rounded-full animate-aurora-float"
          style={{
            background: 'linear-gradient(225deg, rgba(255,85,184,0.1), rgba(254,189,3,0.06), transparent)',
            filter: 'blur(80px)',
            animationDuration: '10s',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[15%] left-[20%] w-24 sm:w-40 lg:w-56 h-24 sm:h-40 lg:h-56 bg-[#2D6BFF] rounded-full blur-3xl animate-aurora-float" />
        <div className="absolute bottom-[20%] right-[15%] w-20 sm:w-32 lg:w-48 h-20 sm:h-32 lg:h-48 bg-[#7C3AED] rounded-full blur-3xl animate-aurora-glow" />
        <div className="absolute top-[55%] right-[30%] w-12 sm:w-20 lg:w-28 h-12 sm:h-20 lg:h-28 bg-[#FEBD03] rounded-full blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[35%] left-[60%] w-16 sm:w-24 lg:w-36 h-16 sm:h-24 lg:h-36 bg-[#FF55B8] rounded-full blur-3xl animate-aurora-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[40%] left-[10%] w-10 sm:w-16 lg:w-24 h-10 sm:h-16 lg:h-24 bg-[#22C55E] rounded-full blur-2xl animate-aurora-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Star field */}
      <div className="absolute inset-0">
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: '3s',
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Card with glow */}
      <div className="relative z-10 text-center w-full max-w-sm sm:max-w-md">
        <div
          className="absolute inset-0 -m-8 rounded-full animate-aurora-glow"
          style={{
            background: 'radial-gradient(circle, rgba(45,107,255,0.15) 0%, rgba(124,58,237,0.08) 50%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative bg-aurora-card/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-aurora-lg p-6 sm:p-8 lg:p-10 border border-white/10">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <img
              src={logoLight}
              alt="Aurora"
              className="h-16 sm:h-20 lg:h-24 w-auto mx-auto filter drop-shadow-lg sm:drop-shadow-xl transition-all duration-700 hover:scale-105 sm:hover:scale-110 animate-aurora-glow"
            />
          </div>

          <div className="relative mb-4 sm:mb-6 lg:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto relative">
              <div className="absolute inset-0 rounded-full border-2 sm:border-3 lg:border-4 border-white/8" />
              <div className="absolute inset-0 rounded-full border-2 sm:border-3 lg:border-4 border-transparent border-t-[#2D6BFF] border-r-[#7C3AED] animate-spin" />
              <div
                className="absolute inset-1 rounded-full border sm:border-2 border-transparent border-b-[#FEBD03] border-l-[#FF55B8] animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '3s' }}
              />
              <div className="absolute inset-2 sm:inset-3 rounded-full animate-aurora-pulse-gradient" />
              <div className="absolute inset-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 -translate-x-1/2 -translate-y-1/2 bg-[#2D6BFF] rounded-full animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gradient-aurora">Aurora</h2>
            <p className="text-aurora-text-sec font-body text-base sm:text-lg lg:text-xl tracking-wide">Mental Health Companion</p>
            <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mt-4 sm:mt-6">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#2D6BFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#FEBD03] rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>

        <p className="mt-4 sm:mt-6 lg:mt-8 text-aurora-text-muted font-body text-sm sm:text-base animate-pulse">
          Preparing your personalized experience...
        </p>
      </div>
    </div>
  )
}