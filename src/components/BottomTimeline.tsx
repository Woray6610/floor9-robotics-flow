import React from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { PHASE_MARKERS, SIM_DURATION, TIMELINE_TRACKS } from '../simulation/flowEngine';
import { RobotActionType, SimulationSnapshot } from '../types';

interface BottomTimelineProps {
  sim: SimulationSnapshot;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onRestart: () => void;
  onStep: (deltaPhase: number) => void;
  onSeek: (time: number) => void;
  onChangeSpeed: (speed: number) => void;
}

const ACTION_STYLE: Record<RobotActionType, string> = {
  pickup: 'bg-emerald-600/85 border-emerald-400/70 text-white',
  transit: 'bg-sky-600/80 border-sky-400/70 text-white',
  transfer: 'bg-indigo-600/85 border-indigo-400/70 text-white',
  unload: 'bg-purple-600/85 border-purple-400/70 text-white',
  return: 'bg-slate-600/80 border-slate-400/60 text-slate-100',
  wait: 'bg-amber-500/85 border-amber-300 text-slate-950 font-semibold',
  idle: 'bg-slate-800/80 border-slate-700 text-slate-400',
};

const ACTION_ICON: Record<RobotActionType, string> = {
  pickup: '🦾',
  transit: '▶',
  transfer: '⇄',
  unload: '⬇',
  return: '↩',
  wait: '⏸',
  idle: '·',
};

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  sim,
  isPlaying,
  speed,
  onTogglePlay,
  onRestart,
  onStep,
  onSeek,
  onChangeSpeed,
}) => {
  const pct = (sim.time / SIM_DURATION) * 100;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * SIM_DURATION);
  };

  return (
    <footer className="bg-slate-900/95 border-t border-slate-700/80 px-3 py-2 shrink-0 z-20 space-y-1.5">
      {/* Row 1: Controls + Current Phase + Basket Ownership */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={onRestart}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="เริ่มรอบใหม่ (Restart)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStep(-1)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="ย้อนกลับ 1 ขั้น (Step Back)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStep(1)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="ไปขั้นถัดไป (Step Forward)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded p-0.5 ml-1">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  speed === s ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-slate-300 ml-1">
            {sim.time.toFixed(1)}s / {SIM_DURATION}s
            <span className="text-[10px] text-slate-500 ml-1">(เวลาตัวอย่าง)</span>
          </span>
        </div>

        {/* Live Phase Description */}
        <div className="flex-1 min-w-[240px] px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-[11px] flex items-center gap-2 truncate">
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] shrink-0">
            {sim.phaseIndex + 1}/{PHASE_MARKERS.length}
          </span>
          <span className="font-semibold text-slate-100 shrink-0">{sim.phaseTitle}</span>
          <span className="text-slate-400 truncate hidden xl:inline">— {sim.phaseSummary}</span>
        </div>

        {/* Active Basket Ownership Pills */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {sim.baskets.slice(0, 2).map((b) => (
            <div
              key={b.id}
              className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
              <span className="font-semibold text-slate-200">{b.label}:</span>
              <span className="text-amber-200">{b.owner}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Compact Multi-Robot Timeline showing รับ / วิ่ง / รอ / ส่ง */}
      <div className="space-y-1">
        {TIMELINE_TRACKS.map((track) => (
          <div key={track.id} className="flex items-center gap-2">
            <div className="w-28 shrink-0 flex items-center gap-1.5 text-[10px] font-medium text-slate-300 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: track.color }}
              />
              <span className="truncate">{track.label}</span>
            </div>
            <div
              onClick={handleTrackClick}
              className="relative flex-1 h-4 rounded bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer"
              title="คลิกบนแถบเวลาเพื่อข้ามไปยังช่วงเวลาที่ต้องการ"
            >
              {track.blocks.map((blk, idx) => {
                const left = (blk.start / SIM_DURATION) * 100;
                const width = ((blk.end - blk.start) / SIM_DURATION) * 100;
                return (
                  <div
                    key={idx}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${blk.label}: ${blk.detail} (${blk.start}s–${blk.end}s)`}
                    className={`absolute top-0 bottom-0 border-r text-[9px] px-1 flex items-center gap-0.5 overflow-hidden whitespace-nowrap ${ACTION_STYLE[blk.type]}`}
                  >
                    <span>{ACTION_ICON[blk.type]}</span>
                    <span className="truncate">{blk.label}</span>
                  </div>
                );
              })}
              {/* Playhead needle */}
              <div
                style={{ left: `${pct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_#fff] pointer-events-none z-10"
              />
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
};
