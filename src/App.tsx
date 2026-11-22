import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Box,
  Camera,
  Cpu,
  Download,
  Eraser,
  Eye,
  Grid,
  MapPin,
  MousePointer2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  Share2,
  Sparkles,
  Upload,
  Users,
  Wifi,
} from 'lucide-react';
import { Floor2DCanvas } from './components/Floor2DCanvas';
import { SandboxInspector } from './components/SandboxInspector';
import { ShareCloudModal } from './components/ShareCloudModal';
import {
  createDefaultPreset,
  createEmptyProject,
  ROBOT_PALETTE,
  STATION_PALETTE,
} from './sandbox/presets';
import { evaluateSandbox, getTotalDuration } from './sandbox/simEngine';
import { useLiveSync } from './sandbox/useLiveSync';
import {
  EditorTool,
  RoutePoint,
  SandboxProject,
  SelectionTarget,
  SimulationMode,
} from './sandbox/types';

const STORAGE_KEY = 'floor9-flow-sandbox-v2';

function loadSavedOrPreset(): SandboxProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SandboxProject;
      if (parsed && parsed.version === '2.0' && Array.isArray(parsed.stations)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default preset
  }
  return createDefaultPreset();
}

export function App() {
  const [project, setProject] = useState<SandboxProject>(loadSavedOrPreset);
  const [mode, setMode] = useState<SimulationMode>('modeA');
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [drawingPoints, setDrawingPoints] = useState<RoutePoint[]>([]);

  // View toggles
  const [showReachCircles, setShowReachCircles] = useState<boolean>(false);
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Live Sync (Auto-switches between Cloud 24/7 Supabase and Local Shared Server)
  const {
    backend: syncBackend,
    status: syncStatus,
    onlineCount,
    lastSyncedAt,
    syncError,
    editorName,
    setEditorName,
    cloudConfig,
    setCloudConfig,
  } = useLiveSync({
    project,
    onRemoteProject: useCallback(
      (remote: SandboxProject, byUser: string) => {
        setProject(remote);
        if (byUser !== 'เซิร์ฟเวอร์กลาง' && byUser !== 'Cloud 24/7') {
          showToast(`🔄 อัปเดตผังอัตโนมัติจาก ${byUser}`);
        }
      },
      [showToast]
    ),
  });

  // Auto-save to localStorage (offline fallback)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Ignore quota errors
    }
  }, [project]);

  const totalDuration = useMemo(() => getTotalDuration(project, mode), [project, mode]);

  // Animation RAF loop
  const lastFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }
    let rafId = 0;
    const tick = (now: number) => {
      if (lastFrameRef.current !== null) {
        const dt = Math.min(0.1, (now - lastFrameRef.current) / 1000);
        setSimTime((prev) => (prev + dt * speed) % totalDuration);
      }
      lastFrameRef.current = now;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speed, totalDuration]);

  const sim = useMemo(
    () => evaluateSandbox(project, mode, simTime),
    [project, mode, simTime]
  );

  const updateProject = useCallback((updater: (prev: SandboxProject) => SandboxProject) => {
    setProject((prev) => ({
      ...updater(prev),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Place new item on canvas click
  const handlePlaceItem = useCallback(
    (x: number, y: number) => {
      setIsPlaying(false);
      const ts = Date.now();

      if (activeTool === 'add-station') {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const usedCodes = new Set(project.stations.map((s) => s.code.toUpperCase()));
        const nextCode =
          Array.from(letters).find((c) => !usedCodes.has(c)) ?? `S${project.stations.length + 1}`;
        const color = STATION_PALETTE[project.stations.length % STATION_PALETTE.length];
        const id = `st-${ts}`;
        updateProject((p) => ({
          ...p,
          stations: [
            ...p.stations,
            { id, code: nextCode, name: `สถานี ${nextCode}`, kind: 'station', x, y, color },
          ],
        }));
        setSelection({ type: 'station', id });
        showToast(`เพิ่มจุดสถานี ${nextCode} แล้ว`);
      } else if (activeTool === 'add-amr' || activeTool === 'add-amr-ur') {
        const idx = project.robots.length + 1;
        const color = ROBOT_PALETTE[(idx - 1) % ROBOT_PALETTE.length];
        const id = `amr-${ts}`;
        const isUR = activeTool === 'add-amr-ur';
        updateProject((p) => ({
          ...p,
          robots: [
            ...p.robots,
            {
              id,
              name: `M${idx}`,
              kind: isUR ? 'amr-ur' : 'amr',
              x,
              y,
              angle: 0,
              color,
              urReach: isUR ? 38 : undefined,
            },
          ],
        }));
        setSelection({ type: 'robot', id });
        showToast(`เพิ่ม ${isUR ? 'AMR + UR บนหัว' : 'AMR ขนส่ง'} (M${idx}) แล้ว`);
      } else if (activeTool === 'add-ur-station') {
        const idx = project.stationURs.length + 1;
        const id = `ur-${ts}`;
        updateProject((p) => ({
          ...p,
          stationURs: [
            ...p.stationURs,
            { id, name: `UR-${idx}`, x, y, reach: 42, color: '#3b82f6' },
          ],
        }));
        setSelection({ type: 'ur', id });
        showToast(`เพิ่มแขน UR ตั้งโต๊ะ (UR-${idx}) แล้ว`);
      } else if (activeTool === 'add-object') {
        const idx = project.objects.length + 1;
        const id = `obj-${ts}`;
        const nearSt = project.stations.find((s) => Math.hypot(s.x - x, s.y - y) < 20);
        updateProject((p) => ({
          ...p,
          objects: [
            ...p.objects,
            {
              id,
              name: `ตะกร้า #${idx}`,
              color: '#fbbf24',
              initialStationId: nearSt?.id,
              x: nearSt ? nearSt.x : x,
              y: nearSt ? nearSt.y : y,
            },
          ],
        }));
        setSelection({ type: 'object', id });
        showToast(`วาง Object (ตะกร้า #${idx}) แล้ว`);
      } else if (
        activeTool === 'add-sensor' ||
        activeTool === 'add-camera' ||
        activeTool === 'add-wise' ||
        activeTool === 'add-router'
      ) {
        const kindMap = {
          'add-sensor': { kind: 'sensor' as const, label: 'Photo Sensor', color: '#f43f5e' },
          'add-camera': { kind: 'camera' as const, label: 'RealSense Cam', color: '#06b6d4' },
          'add-wise': { kind: 'wise' as const, label: 'WISE I/O', color: '#10b981' },
          'add-router': { kind: 'router' as const, label: 'Router AP', color: '#8b5cf6' },
        };
        const cfg = kindMap[activeTool];
        const id = `as-${ts}`;
        updateProject((p) => ({
          ...p,
          assets: [
            ...p.assets,
            {
              id,
              name: `${cfg.label} #${p.assets.length + 1}`,
              kind: cfg.kind,
              x,
              y,
              angle: 0.78,
              fovDeg: cfg.kind === 'camera' ? 60 : undefined,
              fovRange: cfg.kind === 'camera' ? 58 : undefined,
              color: cfg.color,
            },
          ],
        }));
        setSelection({ type: 'asset', id });
        showToast(`วาง ${cfg.label} แล้ว`);
      }

      setActiveTool('select');
    },
    [activeTool, project, updateProject, showToast]
  );

  // Route drawing handlers
  const handleAddRoutePoint = useCallback((x: number, y: number, stationId?: string) => {
    setDrawingPoints((prev) => [...prev, { x, y, stationId }]);
  }, []);

  const handleFinishRoute = useCallback(() => {
    if (drawingPoints.length < 2) {
      setDrawingPoints([]);
      setActiveTool('select');
      return;
    }
    const defaultRobot =
      (selection?.type === 'robot'
        ? project.robots.find((r) => r.id === selection.id)
        : project.robots[0]) ?? null;
    const id = `rt-${Date.now()}`;
    const startSt = drawingPoints[0].stationId
      ? project.stations.find((s) => s.id === drawingPoints[0].stationId)?.code
      : null;
    const endSt = drawingPoints[drawingPoints.length - 1].stationId
      ? project.stations.find((s) => s.id === drawingPoints[drawingPoints.length - 1].stationId)?.code
      : null;
    const autoName =
      startSt && endSt
        ? `${defaultRobot?.name ?? 'AMR'}: ${startSt} → ${endSt}`
        : `เส้นทาง #${project.routes.length + 1}`;

    updateProject((p) => ({
      ...p,
      routes: [
        ...p.routes,
        {
          id,
          name: autoName,
          robotId: defaultRobot?.id ?? '',
          color: defaultRobot?.color ?? '#2563eb',
          loop: true,
          points: drawingPoints,
        },
      ],
    }));
    setDrawingPoints([]);
    setActiveTool('select');
    setSelection({ type: 'route', id });
    showToast(`สร้างเส้นทาง "${autoName}" เรียบร้อย`);
  }, [drawingPoints, project, selection, updateProject, showToast]);

  // Delete currently selected item
  const handleDeleteSelected = useCallback(() => {
    if (!selection) return;
    setIsPlaying(false);
    updateProject((p) => {
      if (selection.type === 'station') {
        return { ...p, stations: p.stations.filter((x) => x.id !== selection.id) };
      }
      if (selection.type === 'robot') {
        return { ...p, robots: p.robots.filter((x) => x.id !== selection.id) };
      }
      if (selection.type === 'ur') {
        return { ...p, stationURs: p.stationURs.filter((x) => x.id !== selection.id) };
      }
      if (selection.type === 'asset') {
        return { ...p, assets: p.assets.filter((x) => x.id !== selection.id) };
      }
      if (selection.type === 'object') {
        return { ...p, objects: p.objects.filter((x) => x.id !== selection.id) };
      }
      if (selection.type === 'route') {
        return { ...p, routes: p.routes.filter((x) => x.id !== selection.id) };
      }
      return p;
    });
    setSelection(null);
    showToast('ลบรายการที่เลือกแล้ว');
  }, [selection, updateProject, showToast]);

  // Export / Import JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor9-flow-sandbox-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('บันทึกไฟล์ JSON แล้ว');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SandboxProject;
        if (!Array.isArray(parsed.stations) || !Array.isArray(parsed.robots)) {
          throw new Error('ไฟล์ไม่ใช่รูปแบบ Flow Sandbox V2');
        }
        setIsPlaying(false);
        setSimTime(0);
        setProject(parsed);
        setSelection(null);
        showToast(`โหลดไฟล์ ${file.name} สำเร็จ`);
      } catch (err) {
        showToast(`โหลดไม่สำเร็จ: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const toolButtons: { id: EditorTool; label: string; icon: React.ReactNode; group: string }[] = [
    { id: 'select', label: 'เลือก / ลากย้าย', icon: <MousePointer2 className="w-4 h-4" />, group: 'core' },
    { id: 'draw-route', label: 'วาดเส้นทาง AMR', icon: <Route className="w-4 h-4" />, group: 'core' },
    { id: 'add-station', label: 'วางจุดสถานี (A-Z)', icon: <MapPin className="w-4 h-4 text-emerald-400" />, group: 'flow' },
    { id: 'add-amr', label: 'วาง AMR ขนส่ง', icon: <Bot className="w-4 h-4 text-orange-400" />, group: 'flow' },
    { id: 'add-amr-ur', label: 'วาง AMR + UR บนหัว', icon: <Bot className="w-4 h-4 text-emerald-400" />, group: 'flow' },
    { id: 'add-ur-station', label: 'วาง UR ตั้งโต๊ะ', icon: <Sparkles className="w-4 h-4 text-sky-400" />, group: 'flow' },
    { id: 'add-object', label: 'วาง Object / ตะกร้า', icon: <Box className="w-4 h-4 text-amber-400" />, group: 'flow' },
    { id: 'add-sensor', label: 'Photo Sensor', icon: <Radio className="w-4 h-4 text-rose-400" />, group: 'iiot' },
    { id: 'add-camera', label: 'RealSense Cam', icon: <Camera className="w-4 h-4 text-cyan-400" />, group: 'iiot' },
    { id: 'add-wise', label: 'WISE I/O', icon: <Cpu className="w-4 h-4 text-emerald-400" />, group: 'iiot' },
    { id: 'add-router', label: 'Router AP', icon: <Wifi className="w-4 h-4 text-purple-400" />, group: 'iiot' },
  ];

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* ================= TOP HEADER BAR ================= */}
      <header className="h-12 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-sky-600 flex items-center justify-center font-black text-xs text-white shadow">
            F9
          </div>
          <div className="truncate">
            <div className="text-sm font-bold text-slate-100 leading-tight truncate">
              Floor 9 System Flow Sandbox (2D)
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              วางจุดอิสระ · ลากเส้นทาง AMR · ทดลองทั้งโหมด A (Step) &amp; โหมด B (Loop)
            </div>
          </div>
        </div>

        {/* Mode A / Mode B Switcher */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => {
              setMode('modeA');
              setSimTime(0);
            }}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              mode === 'modeA'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            โหมด A: Step Flow
          </button>
          <button
            onClick={() => {
              setMode('modeB');
              setSimTime(0);
            }}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              mode === 'modeB'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            โหมด B: Quick Route Loop
          </button>
        </div>

        {/* Preset / Clear / View / Save-Load Actions */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowReachCircles((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 ${
              showReachCircles
                ? 'bg-slate-800 border-sky-500/60 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="แสดง/ซ่อนระยะเอื้อมแขน UR"
          >
            <Eye className="w-3.5 h-3.5" /> ระยะ UR
          </button>
          <button
            onClick={() => setShowAssets((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 ${
              showAssets
                ? 'bg-slate-800 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="แสดง/ซ่อนอุปกรณ์ IIoT"
          >
            <Cpu className="w-3.5 h-3.5" /> IIoT
          </button>
          <button
            onClick={() => setShowGrid((v) => !v)}
            className={`p-1.5 rounded border ${
              showGrid
                ? 'bg-slate-800 border-slate-600 text-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="แสดง/ซ่อนตาราง Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          <button
            onClick={() => {
              setIsPlaying(false);
              setSimTime(0);
              setProject(createDefaultPreset());
              setSelection(null);
              showToast('โหลด Preset 1 (A → B → C / D) แล้ว');
            }}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium"
          >
            โหลด Preset 1
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setSimTime(0);
              setProject(createEmptyProject());
              setSelection(null);
              showToast('ล้างผังเป็นหน้ากระดาษเปล่าแล้ว');
            }}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-rose-950/60 border border-slate-700 text-slate-300 hover:text-rose-200 flex items-center gap-1"
            title="ล้างผังเริ่มใหม่ทั้งหมด"
          >
            <Eraser className="w-3.5 h-3.5" /> ล้างผัง
          </button>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* Live Shared Server / Cloud 24/7 Presence & Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-semibold transition ${
              syncStatus === 'live' && syncBackend === 'cloud'
                ? 'bg-sky-950/80 border-sky-400/70 text-sky-200 hover:bg-sky-900/70'
                : syncStatus === 'live'
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/70'
                : syncStatus === 'saving'
                ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="สถานะแชร์สดและตั้งค่า Cloud 24/7"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'live' && syncBackend === 'cloud'
                  ? 'bg-sky-400'
                  : syncStatus === 'live'
                  ? 'bg-emerald-400'
                  : syncStatus === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            {syncBackend === 'cloud' ? (
              <span>Cloud 24/7</span>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>{onlineCount}</span>
              </>
            )}
            <Share2 className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          <button
            onClick={handleExportJson}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="บันทึกเป็นไฟล์ JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="โหลดไฟล์ JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportJson(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {/* ================= MAIN WORKSPACE ================= */}
      <div className="flex-1 flex min-h-0">
        {/* Left Equipment & Drawing Palette */}
        <aside className="w-52 bg-slate-950 border-r border-slate-800 p-2.5 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5">
              เครื่องมือหลัก
            </div>
            <div className="space-y-1">
              {toolButtons
                .filter((t) => t.group === 'core')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setDrawingPoints([]);
                      setActiveTool(t.id);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition border ${
                      activeTool === t.id
                        ? 'bg-blue-600 border-blue-400 text-white shadow'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5">
              หุ่นยนต์ &amp; จุดสถานี
            </div>
            <div className="space-y-1">
              {toolButtons
                .filter((t) => t.group === 'flow')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setDrawingPoints([]);
                      setActiveTool(t.id);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition border ${
                      activeTool === t.id
                        ? 'bg-blue-600 border-blue-400 text-white shadow'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5">
              อุปกรณ์ IIoT (เสริม)
            </div>
            <div className="space-y-1">
              {toolButtons
                .filter((t) => t.group === 'iiot')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setDrawingPoints([]);
                      setActiveTool(t.id);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition border ${
                      activeTool === t.id
                        ? 'bg-blue-600 border-blue-400 text-white shadow'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Live Object Status Summary */}
          <div className="mt-auto pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1">
              สถานะ Object ตอนนี้
            </div>
            {Object.values(sim.objects).map((o) => (
              <div
                key={o.id}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-[11px]"
              >
                <div className="font-bold text-amber-300">{o.name}</div>
                <div className="text-[10px] text-slate-300 truncate">{o.holderLabel}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center 2D Floorplan Sandbox Canvas */}
        <main className="flex-1 relative min-w-0">
          <Floor2DCanvas
            project={project}
            sim={sim}
            isPlaying={isPlaying}
            activeTool={activeTool}
            selection={selection}
            drawingPoints={drawingPoints}
            showReachCircles={showReachCircles}
            showAssets={showAssets}
            showGrid={showGrid}
            onSelect={setSelection}
            onPlaceItem={handlePlaceItem}
            onAddRoutePoint={handleAddRoutePoint}
            onFinishRoute={handleFinishRoute}
            onMoveStation={(id, x, y) =>
              updateProject((p) => ({
                ...p,
                stations: p.stations.map((s) => (s.id === id ? { ...s, x, y } : s)),
                // Keep route endpoints snapped to this station moving along with it!
                routes: p.routes.map((rt) => ({
                  ...rt,
                  points: rt.points.map((pt) => (pt.stationId === id ? { ...pt, x, y } : pt)),
                })),
                objects: p.objects.map((o) => (o.initialStationId === id ? { ...o, x, y } : o)),
              }))
            }
            onMoveRobot={(id, x, y) =>
              updateProject((p) => ({
                ...p,
                robots: p.robots.map((r) => (r.id === id ? { ...r, x, y } : r)),
              }))
            }
            onMoveUR={(id, x, y) =>
              updateProject((p) => ({
                ...p,
                stationURs: p.stationURs.map((u) => (u.id === id ? { ...u, x, y } : u)),
              }))
            }
            onMoveAsset={(id, x, y) =>
              updateProject((p) => ({
                ...p,
                assets: p.assets.map((a) => (a.id === id ? { ...a, x, y } : a)),
              }))
            }
            onMoveObject={(id, x, y) =>
              updateProject((p) => ({
                ...p,
                objects: p.objects.map((o) =>
                  o.id === id ? { ...o, x, y, initialStationId: undefined } : o
                ),
              }))
            }
            onMoveRoutePoint={(routeId, pointIdx, x, y) =>
              updateProject((p) => ({
                ...p,
                routes: p.routes.map((rt) =>
                  rt.id === routeId
                    ? {
                        ...rt,
                        points: rt.points.map((pt, idx) =>
                          idx === pointIdx ? { x, y, stationId: undefined } : pt
                        ),
                      }
                    : rt
                ),
              }))
            }
          />

          {toast && (
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-emerald-400/70 text-emerald-200 text-xs shadow-xl z-30">
              {toast}
            </div>
          )}

          {/* Live Share & Cloud 24/7 Modal */}
          {showShareModal && (
            <ShareCloudModal
              backend={syncBackend}
              status={syncStatus}
              onlineCount={onlineCount}
              lastSyncedAt={lastSyncedAt}
              syncError={syncError}
              editorName={editorName}
              cloudConfig={cloudConfig}
              onChangeEditorName={setEditorName}
              onSaveCloudConfig={setCloudConfig}
              onNotify={showToast}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </main>

        {/* Right Flow & Inspector Panel */}
        <SandboxInspector
          project={project}
          sim={sim}
          mode={mode}
          selection={selection}
          onSelect={setSelection}
          onUpdateProject={updateProject}
          onDeleteSelected={handleDeleteSelected}
        />
      </div>

      {/* ================= BOTTOM PLAYBACK BAR ================= */}
      <footer className="h-14 px-4 bg-slate-900 border-t border-slate-800 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying((v) => !v)}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'หยุดเพื่อแก้ไข (Pause)' : 'เล่นจำลอง Flow (Play)'}
          </button>
          <button
            onClick={() => {
              setSimTime(0);
              setIsPlaying(true);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="เริ่มรอบใหม่จาก 0s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-[11px]">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded border font-mono ${
                speed === s
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Scrubber & Active Step Info */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-sky-300 truncate">{sim.activeStepTitle}</span>
            <span className="font-mono text-slate-400 shrink-0 ml-2">
              {sim.time.toFixed(1)}s / {sim.totalDuration.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, sim.totalDuration - 0.01)}
            step={0.05}
            value={sim.time}
            onChange={(e) => {
              setSimTime(Number(e.target.value));
            }}
            className="w-full accent-sky-400 h-1.5 cursor-pointer"
          />
        </div>
      </footer>
    </div>
  );
}

export default App;
