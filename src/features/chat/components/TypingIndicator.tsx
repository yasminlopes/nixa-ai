'use client'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'var(--color-accent)',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: '0ms',
        }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'var(--color-accent)',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: '180ms',
        }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'var(--color-accent)',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: '360ms',
        }}
      />
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
