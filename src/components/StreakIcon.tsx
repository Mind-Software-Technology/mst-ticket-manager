"use client";

import Image from "next/image";

interface StreakIconProps {
  streak: number;
  isActive: boolean; // sudah check-in hari ini atau tidak
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Komponen ikon api (streak).
 * - streak >= 50 & active → api50.png
 * - streak < 50 → streak-active.png / streak-inactive.png seperti biasa
 */
export function StreakIcon({
  streak,
  isActive,
  width = 56,
  height = 56,
  className = "object-contain drop-shadow-xl hover:scale-110 hover:rotate-[6deg] transition-all duration-300",
}: StreakIconProps) {
  const isMilestone = streak >= 50 && isActive;

  if (isMilestone) {
    return (
      <Image
        src="/api50.png"
        alt="Streak 50!"
        width={width}
        height={height}
        className={className}
      />
    );
  }

  return (
    <Image
      src={isActive ? "/streak-active.png" : "/streak-inactive.png"}
      alt="Streak"
      width={width}
      height={height}
      className={className}
    />
  );
}
