"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface StreakIconProps {
  streak: number;
  isActive: boolean; // sudah check-in hari ini atau tidak
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Komponen ikon api (streak).
 * - streak >= 50 & active → putar video50.mp4 sekali sebagai transisi, lalu tampilkan api50.png
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

  // Simpan di sessionStorage supaya video tidak replay tiap render
  const [videoPlayed, setVideoPlayed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("streak50VideoPlayed") === "true";
  });
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isMilestone && !videoPlayed) {
      setShowVideo(true);
    }
  }, [isMilestone, videoPlayed]);

  const handleVideoEnded = () => {
    setShowVideo(false);
    setVideoPlayed(true);
    sessionStorage.setItem("streak50VideoPlayed", "true");
  };

  if (showVideo) {
    return (
      <video
        ref={videoRef}
        src="/video50.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnded}
        style={{ width, height, objectFit: "contain" }}
        className={`rounded-full ${className}`}
      />
    );
  }

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
