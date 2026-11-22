import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Info,
  RotateCw,
  Ruler,
  Sliders,
  Trash2,
  Video,
} from 'lucide-react';
import { GLOBAL_ASSUMPTIONS } from '../data/defaultLayout';
import {
  ScaleCalibration,
  SceneItem,
  SimulationSnapshot,
  URModelOption,
  WallSegment,
} from '../types';

interface RightInspectorProps {
  items: SceneItem[];
  selectedItem: SceneItem | null;
  selectedWall: WallSegment | null;
  sim: SimulationSnapshot;
  scale: ScaleCalibration;
  calibrationMode: boolean;
  onUpdateItem: (id: string, patch: Partial<SceneItem>) => void;
  onUpdateWall: (id: string, patch: Partial<WallSegment>) => void;
  onDeleteWall: (id: string) => void;
  onConfirmCalibration: (realMeters: number) => void;
  onResetCalibration: () => void;
  onExitCalibration: () => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  items,
  selectedItem,
  selectedWall,
  sim,
  scale,
  calibrationMode,
  onUpdateItem,
  onUpdateWall,
  onDeleteWall,
  onConfirmCalibration,
  onResetCalibration,
  onExitCalibration,
}) => {
  const [tab, setTab] = useState<'inspector' | 'assumptions'>('inspector');
  const [realDistInput, setRealDistInput] = useState<string>('10.0');

  const unit = scale.isCalibrated ? 'm' : 'u (สัมพัทธ์)';
  const factor = scale.metersPerBaseUnit;

  const calDistBase =
    scale.pointA && scale.pointB
      ? Math.hypot(scale.pointB[0] - scale.pointA[0], scale.pointB[1] - scale.pointA[1])
      : 0;

  // UR pool validation
  const urs = items.filter((i) => i.category === 'ur');
  const ur5eCount = urs.filter((u) => u.urModel === 'UR5e').length;
  const ur3eCount = urs.filter((u) => u.urModel === 'UR3e').length;

  return (
    <aside className="w-72 bg-slate-900/95 border-l border-slate-700/80 flex flex-col shrink-0 overflow-hidden z-10">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button
          onClick={() => setTab('inspector')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            tab === 'inspector'
              ? 'border-sky-400 text-sky-200 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> คุณสมบัติ
        </button>
        <button
          onClick={() => setTab('assumptions')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            tab === 'assumptions'
              ? 'border-amber-400 text-amber-200 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" /> สมมติฐาน & ขอบเขต
        </button>
      </div>

      {/* SCALE CALIBRATION PANEL (ALWAYS PINNED WHEN ACTIVE) */}
      {calibrationMode && (
        <div className="p-2.5 bg-cyan-950/60 border-b border-cyan-500/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-200 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" /> โหมดสอบเทียบระยะ (2 จุด)
            </span>
            <button
              onClick={onExitCalibration}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              ปิด
            </button>
          </div>
          <p className="text-[11px] text-cyan-100/80 leading-relaxed">
            คลิก 2 จุดบนพื้น 3D (เช่น ความกว้างห้อง หรือความยาวทางเดินที่วัดจริง) แล้วกรอกระยะจริงเป็นเมตร
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-slate-900/80 border border-slate-700">
              จุดที่ 1:{' '}
              {scale.pointA ? `(${scale.pointA[0].toFixed(1)}, ${scale.pointA[1].toFixed(1)})` : 'รอคลิก...'}
            </div>
            <div className="p-1.5 rounded bg-slate-900/80 border border-slate-700">
              จุดที่ 2:{' '}
              {scale.pointB ? `(${scale.pointB[0].toFixed(1)}, ${scale.pointB[1].toFixed(1)})` : 'รอคลิก...'}
            </div>
          </div>
          {calDistBase > 0.05 && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-cyan-200">
                ระยะในฉาก: <span className="font-mono font-bold">{calDistBase.toFixed(2)}</span> หน่วยฐาน
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={realDistInput}
                  onChange={(e) => setRealDistInput(e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-slate-950 border border-cyan-500/60 text-xs font-mono text-white"
                />
                <span className="text-slate-300 text-[11px]">เมตร</span>
                <button
                  onClick={() => {
                    const val = parseFloat(realDistInput);
                    if (val > 0) onConfirmCalibration(val);
                  }}
                  className="ml-auto px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[11px] flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> ยืนยัน
                </button>
              </div>
            </div>
          )}
          {scale.isCalibrated && (
            <button
              onClick={onResetCalibration}
              className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 border border-slate-700"
            >
              ยกเลิกการสอบเทียบ (กลับเป็นหน่วยสัมพัทธ์)
            </button>
          )}
        </div>
      )}

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {tab === 'assumptions' ? (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> ขอบเขต Concept Preview
              </div>
              <p className="text-amber-100/85 leading-relaxed">
                ฉากนี้ใช้เพื่อพิจารณาการจัดวาง layout และลำดับงานร่วมกันในทีม เวลาและเซนเซอร์เป็นค่าจำลองตัวอย่าง —
                ระยะเอื้อมแขน, Payload, จุดสอน UR, การจอดเทียบ, ระยะห่างคน และประตูจริงต้องตรวจวัดจากหน้างานชั้น 9 ก่อนติดตั้งจริง
              </p>
            </div>
            {GLOBAL_ASSUMPTIONS.map((grp) => (
              <div key={grp.category} className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-sky-300 uppercase tracking-wide">
                  {grp.category}
                </h3>
                <ul className="space-y-1.5">
                  {grp.items.map((txt, idx) => (
                    <li
                      key={idx}
                      className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed"
                    >
                      • {txt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : selectedWall ? (
          /* ================= WALL / DOORWAY EDITOR ================= */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-amber-300 text-xs">
                {selectedWall.isDoorway ? '🚪 แก้ไขช่องประตู' : '🧱 แก้ไขผนัง Cutaway'}
              </h2>
              <button
                onClick={() => onDeleteWall(selectedWall.id)}
                className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/60"
                title="ลบผนัง/ช่องประตูนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">ชื่อผนัง / ช่องประตู</label>
              <input
                type="text"
                value={selectedWall.label}
                onChange={(e) => onUpdateWall(selectedWall.id, { label: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateWall(selectedWall.id, { isDoorway: false })}
                className={`flex-1 py-1.5 rounded border text-[11px] font-medium ${
                  !selectedWall.isDoorway
                    ? 'bg-slate-700 border-slate-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🧱 ผนังทึบ
              </button>
              <button
                onClick={() => onUpdateWall(selectedWall.id, { isDoorway: true })}
                className={`flex-1 py-1.5 rounded border text-[11px] font-medium ${
                  selectedWall.isDoorway
                    ? 'bg-sky-700/60 border-sky-400 text-sky-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🚪 ช่องประตู
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['x1', 'z1', 'x2', 'z2'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-400 mb-0.5 uppercase font-mono">
                    {key} ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={Number((selectedWall[key] * factor).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        onUpdateWall(selectedWall.id, { [key]: Number((val / factor).toFixed(3)) });
                      }
                    }}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">
                ความหนาผนัง ({unit})
              </label>
              <input
                type="number"
                step="0.05"
                min="0.08"
                max="1.5"
                value={Number((selectedWall.thickness * factor).toFixed(2))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > 0.05) {
                    onUpdateWall(selectedWall.id, { thickness: Number((val / factor).toFixed(3)) });
                  }
                }}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100"
              />
            </div>
          </div>
        ) : !selectedItem ? (
          /* ================= NOTHING SELECTED ================= */
          <div className="space-y-3 text-slate-400">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="text-slate-200 font-semibold text-xs">ยังไม่ได้เลือกอุปกรณ์</div>
              <p className="text-[11px] leading-relaxed">
                คลิกที่สถานี (A, B, C, D), รถ AMR (M1–M3), แขนกล UR, กล้อง RealSense, WISE หรือ Router
                ในฉาก 3D หรือแผงซ้าย เพื่อแก้ชื่อ บทบาท ขนาด รุ่น UR หรือดูมุมกล้อง Placeholder
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="font-semibold text-slate-200">สีประจำรถ AMR & เส้นทาง</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>M1 (เขียว): AMR + mobile UR + มือคีบ (A ↔ B)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>M2 (ส้ม): รถขนตะกร้า #1 (B ↔ C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>M3 (ฟ้า): รถขนตะกร้า #2 (สลับรอบ B ↔ C)</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= SELECTED ITEM INSPECTOR ================= */
          <div className="space-y-3">
            {/* Header badge */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedItem.color }}
              />
              <div className="min-w-0">
                <div className="font-bold text-slate-100 truncate">{selectedItem.shortLabel}</div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">
                  {selectedItem.category} • {selectedItem.id}
                </div>
              </div>
            </div>

            {/* Editable Name */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">ชื่ออุปกรณ์ / สถานี</label>
              <input
                type="text"
                value={selectedItem.name}
                onChange={(e) => onUpdateItem(selectedItem.id, { name: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            {/* Editable Role */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">บทบาท (Role)</label>
              <textarea
                rows={2}
                value={selectedItem.role}
                onChange={(e) => onUpdateItem(selectedItem.id, { role: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[11px] leading-snug"
              />
            </div>

            {/* UR Model Assignment */}
            {selectedItem.category === 'ur' && (
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/40 space-y-2">
                <label className="block text-[11px] font-semibold text-blue-200">
                  การจับคู่รุ่น UR (คลัง: 1× UR5e, 2× UR3e)
                </label>
                <select
                  value={selectedItem.urModel ?? 'UNCONFIRMED'}
                  onChange={(e) => {
                    const model = e.target.value as URModelOption;
                    const prefix =
                      selectedItem.id === 'ur-mobile'
                        ? 'mobile UR'
                        : selectedItem.id === 'ur-station-c'
                          ? 'station UR'
                          : 'reserve UR';
                    const labelSuffix = model === 'UNCONFIRMED' ? 'รุ่นรอยืนยัน' : model;
                    onUpdateItem(selectedItem.id, {
                      urModel: model,
                      name: `${prefix} — ${labelSuffix}`,
                    });
                  }}
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-blue-400/60 text-xs text-slate-100"
                >
                  <option value="UNCONFIRMED">รุ่นรอยืนยัน (Unconfirmed)</option>
                  <option value="UR5e">UR5e (Reach ~850mm / Payload 5kg)</option>
                  <option value="UR3e">UR3e (Reach ~500mm / Payload 3kg)</option>
                </select>
                {(ur5eCount > 1 || ur3eCount > 2) && (
                  <div className="text-[10px] text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    จำนวนรุ่นที่เลือกเกินคลังที่มี (UR5e: {ur5eCount}/1, UR3e: {ur3eCount}/2)
                  </div>
                )}
              </div>
            )}

            {/* RealSense Placeholder Camera Preview & FOV Controls */}
            {selectedItem.category === 'camera' && (
              <div className="p-2.5 rounded-lg bg-cyan-950/35 border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between text-cyan-200 font-semibold text-[11px]">
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Dashboard Feed (Placeholder)
                  </span>
                  <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                    LIVE SIM
                  </span>
                </div>
                {/* Placeholder Camera Frame */}
                <div className="relative h-28 rounded bg-slate-950 border border-cyan-500/50 overflow-hidden p-2 flex flex-col justify-between font-mono text-[9px]">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }}
                  />
                  <div className="relative flex justify-between text-cyan-300">
                    <span>{selectedItem.shortLabel}</span>
                    <span>RGB-D 640×480</span>
                  </div>
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <Camera className="w-5 h-5 text-cyan-400/80 mb-0.5" />
                    <span className="text-slate-200 font-sans text-[10px] font-semibold">
                      มุมมอง: {selectedItem.cameraTarget}
                    </span>
                    <span className="text-amber-300 font-sans text-[9px]">
                      {selectedItem.id === 'cam-rs-1'
                        ? `M1: ${sim.robots.m1.statusText}`
                        : `Station UR: ${sim.stationUr.statusText}`}
                    </span>
                  </div>
                  <div className="relative flex justify-between text-slate-400">
                    <span>FOV {selectedItem.fovDeg ?? 65}°</span>
                    <span>[Placeholder Preview]</span>
                  </div>
                </div>

                {/* Adjustable FOV & Range */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-300">
                    <span>มุมกว้างกรวย (FOV)</span>
                    <span className="font-mono">{selectedItem.fovDeg ?? 65}°</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={110}
                    value={selectedItem.fovDeg ?? 65}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.id, { fovDeg: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-300">
                    <span>ระยะมองเห็น ({unit})</span>
                    <span className="font-mono">
                      {((selectedItem.fovRange ?? 4.5) * factor).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    step={0.2}
                    value={selectedItem.fovRange ?? 4.5}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.id, { fovRange: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* Buffer D Slot Count (2 or 3) */}
            {selectedItem.id === 'station-d' && (
              <div className="p-2 rounded bg-purple-950/35 border border-purple-500/40 flex items-center justify-between">
                <span className="text-[11px] text-purple-200 font-medium">จำนวนช่องพักตะกร้า</span>
                <div className="flex gap-1">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => onUpdateItem(selectedItem.id, { bufferSlots: n })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        (selectedItem.bufferSlots ?? 3) === n
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {n} ช่อง
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data / Network Role (WISE, Router, Sensor, Camera) */}
            {selectedItem.dataRole && (
              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/35 space-y-1">
                <div className="text-[10px] font-bold text-emerald-300">บทบาทข้อมูล / เครือข่าย</div>
                <div className="text-[11px] text-slate-200 leading-relaxed">{selectedItem.dataRole}</div>
              </div>
            )}

            {/* Origin & Destination Stations */}
            {(selectedItem.originStation || selectedItem.destinationStation) && (
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">สถานีต้นทาง</label>
                  <input
                    type="text"
                    value={selectedItem.originStation ?? ''}
                    onChange={(e) => onUpdateItem(selectedItem.id, { originStation: e.target.value })}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">สถานีปลายทาง</label>
                  <input
                    type="text"
                    value={selectedItem.destinationStation ?? ''}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.id, { destinationStation: e.target.value })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Position & Rotation */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300">
                  ตำแหน่ง & การหมุน ({unit})
                </span>
                {selectedItem.draggable && (
                  <button
                    onClick={() =>
                      onUpdateItem(selectedItem.id, {
                        rotationY: Number(((selectedItem.rotationY + Math.PI / 4) % (Math.PI * 2)).toFixed(3)),
                      })
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" /> +45°
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[9px] text-slate-400 font-mono">X</label>
                  <input
                    type="number"
                    step="0.25"
                    disabled={!selectedItem.draggable}
                    value={Number((selectedItem.position[0] * factor).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        onUpdateItem(selectedItem.id, {
                          position: [
                            Number((val / factor).toFixed(3)),
                            selectedItem.position[1],
                            selectedItem.position[2],
                          ],
                        });
                      }
                    }}
                    className="w-full px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-mono">Z</label>
                  <input
                    type="number"
                    step="0.25"
                    disabled={!selectedItem.draggable}
                    value={Number((selectedItem.position[2] * factor).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        onUpdateItem(selectedItem.id, {
                          position: [
                            selectedItem.position[0],
                            selectedItem.position[1],
                            Number((val / factor).toFixed(3)),
                          ],
                        });
                      }
                    }}
                    className="w-full px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-mono">หมุน (°)</label>
                  <input
                    type="number"
                    step="15"
                    disabled={!selectedItem.draggable}
                    value={Math.round((selectedItem.rotationY * 180) / Math.PI)}
                    onChange={(e) => {
                      const deg = parseFloat(e.target.value);
                      if (!Number.isNaN(deg)) {
                        onUpdateItem(selectedItem.id, {
                          rotationY: Number(((deg * Math.PI) / 180).toFixed(3)),
                        });
                      }
                    }}
                    className="w-full px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Editable Dimensions */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-300">ขนาด ({unit})</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['width', 'depth', 'height'] as const).map((dim) => (
                  <div key={dim}>
                    <label className="block text-[9px] text-slate-400 uppercase font-mono">
                      {dim === 'width' ? 'กว้าง W' : dim === 'depth' ? 'ลึก D' : 'สูง H'}
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      value={Number((selectedItem.dimensions[dim] * factor).toFixed(2))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > 0.04) {
                          onUpdateItem(selectedItem.id, {
                            dimensions: {
                              ...selectedItem.dimensions,
                              [dim]: Number((val / factor).toFixed(3)),
                            },
                          });
                        }
                      }}
                      className="w-full px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item Assumptions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> สมมติฐาน & จุดที่ต้องตรวจจริง
              </div>
              <ul className="space-y-1">
                {selectedItem.assumptions.map((note, idx) => (
                  <li
                    key={idx}
                    className="p-1.5 rounded bg-amber-950/25 border border-amber-500/25 text-[10px] text-slate-300 leading-relaxed"
                  >
                    • {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
