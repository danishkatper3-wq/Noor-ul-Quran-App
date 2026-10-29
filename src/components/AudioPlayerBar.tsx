import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  X,
  Volume2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import type { AudioTrack, EditionOption } from "../types/quran";

interface AudioPlayerBarProps {
  track: AudioTrack | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevAyah: () => void;
  onNextAyah: (autoAdvanced?: boolean) => void;
  onClose: () => void;
  reciters: EditionOption[];
  selectedReciter: string;
  onChangeReciter: (reciterId: string) => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  track,
  isPlaying,
  onPlayPause,
  onPrevAyah,
  onNextAyah,
  onClose,
  reciters,
  selectedReciter,
  onChangeReciter,
  autoAdvance,
  onToggleAutoAdvance,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<"1x" | "3x" | "inf">("1x");
  const repeatCountRef = useRef(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    repeatCountRef.current = 0;
    setProgress(0);
    setAudioError(null);
  }, [track?.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    audio.playbackRate = playbackRate;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setAudioError("Audio stream interrupted or blocked. Tap Retry to play.");
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, track?.audioUrl, playbackRate]);

  if (!track) return null;

  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (repeatMode === "inf") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    if (repeatMode === "3x" && repeatCountRef.current < 2) {
      repeatCountRef.current += 1;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    repeatCountRef.current = 0;
    if (autoAdvance && track.ayahNumber < track.totalAyahsInSurah) {
      onNextAyah(true);
    } else {
      onPlayPause();
    }
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => (prev === "1x" ? "3x" : prev === "3x" ? "inf" : "1x"));
    repeatCountRef.current = 0;
  };

  const cycleSpeed = () => {
    setPlaybackRate((prev) => (prev === 1 ? 1.25 : prev === 1.25 ? 0.85 : 1));
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleRetryAudio = () => {
    setAudioError(null);
    const audio = audioRef.current;
    if (audio) {
      audio.load();
      audio.play().catch(() => {
        setAudioError("Could not connect to the audio CDN. Please check internet connection.");
      });
    }
  };

  return (
    <div
      role="region"
      aria-label="Quran Audio Recitation Player"
      dir="ltr"
      className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111D18]/95 backdrop-blur-md border-t border-[#E6E1D6] dark:border-[#21352D] shadow-lg"
    >
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="auto"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={handleEnded}
        onError={() => setAudioError("Unable to load verified audio recitation for this Ayah.")}
      />

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col gap-2">
        {audioError && (
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{audioError}</span>
            </span>
            <button
              type="button"
              onClick={handleRetryAudio}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-700 text-white font-medium hover:bg-red-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Track Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0B5D46]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0B5D46] dark:text-[#34D399] shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6] truncate">
                <span className="truncate">{track.surahEnglishName}</span>
                <span aria-hidden="true" className="text-[#8A948E]">·</span>
                <span className="font-mono text-xs tabular-nums">Ayah {track.reference}</span>
              </div>
              <div className="text-xs text-[#57635D] dark:text-[#98AAA2] truncate">
                Recitation CDN · {track.ayahNumber} of {track.totalAyahsInSurah}
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevAyah}
              disabled={track.ayahNumber <= 1}
              aria-label="Previous Ayah"
              className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#F3EFE6] dark:hover:bg-[#1A2C25] disabled:opacity-35 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause recitation" : "Play recitation"}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white flex items-center justify-center transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => onNextAyah(false)}
              disabled={track.ayahNumber >= track.totalAyahsInSurah}
              aria-label="Next Ayah"
              className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#F3EFE6] dark:hover:bg-[#1A2C25] disabled:opacity-35 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              title="Repeat Ayah for Hifz practice"
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                repeatMode !== "1x"
                  ? "bg-[#B58D3D]/15 text-[#8A6823] dark:text-[#E2B866]"
                  : "text-[#57635D] dark:text-[#98AAA2] hover:bg-[#F3EFE6] dark:hover:bg-[#1A2C25]"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="tabular-nums">{repeatMode === "inf" ? "Loop" : repeatMode}</span>
            </button>

            <button
              type="button"
              onClick={cycleSpeed}
              title="Playback speed"
              className="min-h-[40px] px-2.5 rounded-lg text-xs font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2] hover:bg-[#F3EFE6] dark:hover:bg-[#1A2C25] transition-colors whitespace-nowrap shrink-0"
            >
              {playbackRate}x
            </button>
          </div>

          {/* Reciter Selector, Auto-Advance & Close */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <select
              aria-label="Select Quran Reciter"
              value={selectedReciter}
              onChange={(e) => onChangeReciter(e.target.value)}
              className="h-9 max-w-[180px] sm:max-w-[210px] rounded-lg border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#162620] px-2.5 text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onToggleAutoAdvance}
              className={`hidden sm:inline-flex h-9 px-3 items-center rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                autoAdvance
                  ? "border-[#0B5D46]/40 bg-[#0B5D46]/10 text-[#0B5D46] dark:text-[#34D399]"
                  : "border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
              }`}
            >
              Auto-Next: {autoAdvance ? "On" : "Off"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close audio player"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-[#57635D] dark:text-[#98AAA2] hover:bg-[#F3EFE6] dark:hover:bg-[#1A2C25]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrubber Row */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2] w-9">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={progress}
            aria-label="Recitation playback progress"
            onChange={(e) => {
              const nextTime = Number(e.target.value);
              setProgress(nextTime);
              if (audioRef.current) {
                audioRef.current.currentTime = nextTime;
              }
            }}
            className="w-full h-1.5 accent-[#0B5D46] dark:accent-[#10B981] cursor-pointer"
          />
          <span className="text-[11px] font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2] w-9 text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
