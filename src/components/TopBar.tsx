import React, { useRef } from 'react';
import {
  Box,
  Compass,
  Download,
  Edit3,
  Eye,
  Focus,
  Layers,
  Map as MapIcon,
  RotateCcw,
  Ruler,
  Upload,
} from 'lucide-react';
import { CameraPreset, ScaleCalibration, ViewSettings } from '../types';

interface TopBarProps {
  editMode: boolean;
  calibrationMode: boolean;
  scale: ScaleCalibration;
  viewSettings: ViewSettings;
  onSetCameraPreset: (preset: CameraPreset) => void;
  onToggleEditMode: () => void;
  onToggleCalibrationMode: () => void;
  onUpdateView: (patch: Partial<ViewSettings>) => void;
  onSaveJson: () => void;
  onLoadJson: (file: File) => void;
  onResetLayout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  editMode,
  calibrationMode,
  scale,
  viewSettings,
  onSetCameraPreset,
  onToggleEditMode,
  onToggleCalibrationMode,
  onUpdateView,
  onSaveJson,
  onLoadJson,
  onResetLayout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-12 bg-slate-900/95 border-b border-slate-700/80 px-3 flex items-center justify-between gap-2 z-20 shrink-0">
      {/* Left: Title & Mandatory Status Badges */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow">
          F9
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              Floor 9 Robotics Flow 3D
            </h1>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[10px] font-semibold text-sky-200 whitespace-nowrap">
              Concept preview
            </span>
            <span
              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
                scale.isCalibrated
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
              }`}
              title={
                scale.isCalibrated
                  ? `สอบเทียบแล้ว: 1 base unit = ${scale.metersPerBaseUnit.toFixed(3)} m`
                  : 'ยังไม่ได้สอบเทียบระยะจริง — กดปุ่ม “สอบเทียบระยะ” เพื่อเลือก 2 จุดและใส่ระยะจริง'
              }
            >
              {scale.isCalibrated ? '✓ สอบเทียบระยะแล้ว (m)' : '⚠ รอสอบเทียบระยะ'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Camera Views & Map Layer Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <div className="flex items-center bg-slate-800/90 rounded-md p-0.5 border border-slate-700">
          <button
            onClick={() => onSetCameraPreset('top')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-1 whitespace-nowrap"
            title="มุมมองด้านบน (Top View)"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" /> Top View
          </button>
          <button
            onClick={() => onSetCameraPreset('isometric')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-1 whitespace-nowrap"
            title="มุมมองเฉียง 3 มิติ (Isometric)"
          >
            <Box className="w-3.5 h-3.5 text-emerald-400" /> Isometric
          </button>
          <button
            onClick={() => onSetCameraPreset('focus-right')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-1 whitespace-nowrap"
            title="ซูมดูโซน A / B / C / D"
          >
            <Focus className="w-3.5 h-3.5 text-amber-400" /> โซน A–D
          </button>
          <button
            onClick={() => onSetCameraPreset('reset')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-1 whitespace-nowrap"
            title="รีเซ็ตมุมกล้องทั้งชั้น"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset Camera
          </button>
        </div>

        {/* Reference Map & Overlays */}
        <button
          onClick={() => onUpdateView({ showReferenceImage: !viewSettings.showReferenceImage })}
          className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition ${
            viewSettings.showReferenceImage
              ? 'bg-indigo-600/30 border-indigo-400/70 text-indigo-100'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="เปิด/ปิดภาพผังชั้น 9 ต้นฉบับซ้อนบนพื้น"
        >
          <MapIcon className="w-3.5 h-3.5" /> ผังเดิม
        </button>

        <button
          onClick={() => onUpdateView({ showOriginalOverlays: !viewSettings.showOriginalOverlays })}
          className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition ${
            viewSettings.showOriginalOverlays
              ? 'bg-rose-600/25 border-rose-400/60 text-rose-100'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="เปิด/ปิดจุดแดง-เขียว-ไอคอน MiR จากภาพเดิม"
        >
          <Layers className="w-3.5 h-3.5" /> Overlay เดิม
        </button>

        <button
          onClick={() => onUpdateView({ showBufferD: !viewSettings.showBufferD })}
          className={`px-2 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap transition ${
            viewSettings.showBufferD
              ? 'bg-purple-600/30 border-purple-400/70 text-purple-100'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="เปิด/ปิดช่องพักตะกร้า D ข้างสถานี C"
        >
          ช่องพัก D
        </button>
      </div>

      {/* Right: Mode Switch, Calibration, Save/Load */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleEditMode}
          className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition ${
            editMode
              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
              : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
          }`}
          title="สลับโหมด Preview (ดู Flow) / Edit (ลากย้าย หมุน และแก้ผนัง)"
        >
          {editMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {editMode ? 'Edit Mode' : 'Preview Mode'}
        </button>

        <button
          onClick={onToggleCalibrationMode}
          className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition ${
            calibrationMode
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-semibold'
              : 'bg-slate-800 border-slate-700 text-cyan-200 hover:bg-slate-700'
          }`}
          title="โหมดตั้งสเกล: เลือก 2 จุดบนพื้นแล้วใส่ระยะจริง"
        >
          <Ruler className="w-3.5 h-3.5" /> สอบเทียบระยะ
        </button>

        <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5">
          <button
            onClick={onSaveJson}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="บันทึก Layout เป็นไฟล์ JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="โหลด Layout จากไฟล์ JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLoadJson(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={onResetLayout}
            className="px-1.5 py-1 rounded bg-slate-800 hover:bg-rose-900/60 border border-slate-700 text-[10px] text-slate-300"
            title="คืนค่าผังเริ่มต้น"
          >
            รีเซ็ต
          </button>
        </div>
      </div>
    </header>
  );
};
