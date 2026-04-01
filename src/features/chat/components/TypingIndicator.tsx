'use client'

import React from 'react'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 h-6">
      <div className="flex gap-1 items-center">
        <div className="w-2 h-2 rounded-full bg-[#9ac5ef] animate-typing-dot-1" />
        <div className="w-2 h-2 rounded-full bg-[#9ac5ef] animate-typing-dot-2" />
        <div className="w-2 h-2 rounded-full bg-[#9ac5ef] animate-typing-dot-3" />
      </div>
    </div>
  )
}
