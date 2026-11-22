import React, { useState } from 'react';
import {
  Bot,
  Camera,
  ChevronDown,
  ChevronRight,
  Cpu,
  MapPin,
  Package,
  Plus,
  Radio,
  ShieldAlert,
  Wifi,
  Wrench,
} from 'lucide-react';
import { UNVERIFIED_ZONES } from '../data/floor9Geometry';
import { SceneItem, SimulationSnapshot, WallSegment } from '../types';

interface LeftSidebarProps {
  items: SceneItem[];
  walls: WallSegment[];
  sim: SimulationSnapshot;
  selectedId: string | null;
  selectedWallId: string | null;
  editMode: boolean;
  showBufferD: boolean;
  onSelectItem: (id: string, focus?: boolean) => void;
  onSelectWall: (id: string) => void;
  onAddWall: (isDoorway: boolean) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  items,
  walls,
  sim,
  selectedId,
  selectedWallId,
  editMode,
  showBufferD,
  onSelectItem,
  onSelectWall,
  onAddWall,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    stations: true,
    amrs: true,
    urs: true,
    sensors: true,
    unverified: false,
    walls: false,
  });

  const toggle = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const stations = items.filter((i) => i.category === 'station');
  const amrs = items.filter((i) => i.category === 'amr');
  const urs = items.filter((i) => i.category === 'ur');
  const sensorsAndNet = items.filter((i) =>
    ['camera', 'sensor', 'wise', 'router', 'optional'].includes(i.category)
  );

  // UR Pool Counter (1× UR5e + 2× UR3e)
  const ur5eAssigned = urs.filter((u) => u.urModel === 'UR5e').length;
  const ur3eAssigned = urs.filter((u) => u.urModel === 'UR3e').length;
  const urUnconfirmed = urs.filter((u) => !u.urModel || u.urModel === 'UNCONFIRMED').length;

  const getAmrLiveStatus = (id: string) => {
    if (id === 'amr-m1') return sim.robots.m1;
    if (id === 'amr-m2') return sim.robots.m2;
    return sim.robots.m3;
  };

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-700/80 flex flex-col shrink-0 overflow-hidden z-10">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 tracking-wide">
          อุปกรณ์ & สถานี (Inventory)
        </span>
        <span className="text-[10px] text-slate-400">คลิกเพื่อเน้น / ดับเบิลคลิกซูม</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {/* STATIONS */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('stations')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-slate-200 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> สถานี & จุดรอ ({stations.length})
            </span>
            {openGroups.stations ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.stations && (
            <div className="p-1 space-y-0.5">
              {stations.map((st) => {
                const disabled = st.id === 'station-d' && !showBufferD;
                return (
                  <button
                    key={st.id}
                    onClick={() => onSelectItem(st.id)}
                    onDoubleClick={() => onSelectItem(st.id, true)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between gap-1.5 transition ${
                      selectedId === st.id
                        ? 'bg-amber-500/20 border border-amber-400/70 text-amber-100'
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    } ${disabled ? 'opacity-45' : ''}`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: st.color }}
                      />
                      <span className="truncate">{st.shortLabel}</span>
                    </span>
                    {disabled && <span className="text-[9px] text-slate-400">ปิดอยู่</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* AMRs */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('amrs')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-slate-200 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" /> รถ AMR (3 คัน)
            </span>
            {openGroups.amrs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.amrs && (
            <div className="p-1 space-y-1">
              {amrs.map((amr) => {
                const live = getAmrLiveStatus(amr.id);
                return (
                  <button
                    key={amr.id}
                    onClick={() => onSelectItem(amr.id)}
                    onDoubleClick={() => onSelectItem(amr.id, true)}
                    className={`w-full text-left px-2 py-1.5 rounded transition ${
                      selectedId === amr.id
                        ? 'bg-emerald-500/20 border border-emerald-400/70 text-emerald-100'
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: amr.color }}
                        />
                        {amr.shortLabel}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">ID รอยืนยัน</span>
                    </div>
                    <div className="mt-0.5 pl-4 text-[10px] text-slate-400 truncate">
                      {live.action === 'wait' ? '⏸ ' : '▶ '}
                      {live.statusText}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* UR ARMS + POOL STATUS */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('urs')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-slate-200 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-400" /> แขนกล UR (3 ตัว)
            </span>
            {openGroups.urs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.urs && (
            <div className="p-1.5 space-y-1">
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>คลัง: UR5e ({ur5eAssigned}/1)</span>
                <span>UR3e ({ur3eAssigned}/2)</span>
                {urUnconfirmed > 0 && (
                  <span className="text-amber-300">รอยืนยัน: {urUnconfirmed}</span>
                )}
              </div>
              {urs.map((ur) => (
                <button
                  key={ur.id}
                  onClick={() => onSelectItem(ur.id)}
                  onDoubleClick={() => onSelectItem(ur.id, true)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between gap-1 transition ${
                    selectedId === ur.id
                      ? 'bg-blue-500/20 border border-blue-400/70 text-blue-100'
                      : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                  }`}
                >
                  <span className="truncate">{ur.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${
                      ur.urModel === 'UR5e'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : ur.urModel === 'UR3e'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {ur.urModel === 'UNCONFIRMED' ? 'รอยืนยัน' : ur.urModel}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* CAMERAS, WISE, ROUTERS, SENSORS, SOLOMON */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('sensors')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-slate-200 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> กล้อง / WISE / Router ({sensorsAndNet.length})
            </span>
            {openGroups.sensors ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.sensors && (
            <div className="p-1 space-y-0.5">
              {sensorsAndNet.map((it) => {
                const Icon =
                  it.category === 'camera'
                    ? Camera
                    : it.category === 'wise'
                      ? Radio
                      : it.category === 'router'
                        ? Wifi
                        : Package;
                return (
                  <button
                    key={it.id}
                    onClick={() => onSelectItem(it.id)}
                    onDoubleClick={() => onSelectItem(it.id, true)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-1.5 transition ${
                      selectedId === it.id
                        ? 'bg-cyan-500/20 border border-cyan-400/70 text-cyan-100'
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: it.color }} />
                    <span className="truncate">{it.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* UNVERIFIED AREAS */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('unverified')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-amber-300 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> พื้นที่รอตรวจ ({UNVERIFIED_ZONES.length})
            </span>
            {openGroups.unverified ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.unverified && (
            <div className="p-1.5 space-y-1">
              {UNVERIFIED_ZONES.map((uz) => (
                <div
                  key={uz.id}
                  className="p-1.5 rounded bg-amber-950/30 border border-amber-500/30 text-[10px]"
                >
                  <div className="font-semibold text-amber-200">{uz.name}</div>
                  <div className="text-slate-400 mt-0.5">{uz.note}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* EDITABLE WALLS / DOORWAYS */}
        <section className="rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => toggle('walls')}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-slate-200 font-semibold hover:bg-slate-800/50 rounded-t-lg"
          >
            <span>ผนัง / ช่องประตู ({walls.length})</span>
            {openGroups.walls ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.walls && (
            <div className="p-1.5 space-y-1">
              {editMode ? (
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() => onAddWall(false)}
                    className="flex-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-slate-200 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> เพิ่มผนัง
                  </button>
                  <button
                    onClick={() => onAddWall(true)}
                    className="flex-1 py-1 px-1.5 rounded bg-sky-900/50 hover:bg-sky-800/60 border border-sky-600/50 text-[10px] text-sky-200 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> เพิ่มประตู
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 px-1 pb-1">
                  เปิด Edit Mode ที่แถบบนเพื่อคลิกแก้ผนังหรือเพิ่มช่องประตู
                </div>
              )}
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {walls.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onSelectWall(w.id)}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] truncate transition ${
                      selectedWallId === w.id
                        ? 'bg-amber-500/20 border border-amber-400/70 text-amber-100'
                        : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {w.isDoorway ? '🚪 ' : '🧱 '}
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
