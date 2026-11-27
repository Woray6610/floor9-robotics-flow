import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Box,
  Cpu,
  MapPin,
  Plus,
  Route,
  Trash2,
} from 'lucide-react';
import { KITTING_RECIPES } from '../sandbox/presets';
import {
  FlowStep,
  FlowStepAction,
  KittingFault,
  KittingOrder,
  SandboxProject,
  SelectionTarget,
  SimulationFrame,
  SimulationMode,
} from '../sandbox/types';

interface SandboxInspectorProps {
  project: SandboxProject;
  sim: SimulationFrame;
  mode: SimulationMode;
  selection: SelectionTarget;
  onSelect: (target: SelectionTarget) => void;
  onUpdateProject: (updater: (prev: SandboxProject) => SandboxProject) => void;
  onDeleteSelected: () => void;
  onChangeKittingOptions?: (patch: { order?: KittingOrder; fault?: KittingFault }) => void;
}

const ACTION_LABELS: Record<FlowStepAction, string> = {
  move: 'AMR วิ่งตามเส้นทาง',
  'convoy-move': 'AMR เดินขบวนแถวตอนเรียง 1 (Convoy)',
  'pick-station': 'AMR+UR คีบ Object จากสถานีขึ้นรถ',
  'transfer-amr': 'AMR+UR ส่งต่อ Object ให้ AMR อีกคัน',
  'ur-unload': 'UR ตั้งโต๊ะ ยก Object จาก AMR ลงสถานี',
  'ur-kit': 'UR ตั้งโต๊ะ จัดชิ้นส่วน F → ถาด A (S1–S3)',
  'qc-inspect': 'กล้องตรวจ QC จำลอง S1–S3',
  wait: 'รอสัญญาณ / รอคิว (Wait)',
};

export const SandboxInspector: React.FC<SandboxInspectorProps> = ({
  project,
  sim,
  mode,
  selection,
  onSelect,
  onUpdateProject,
  onDeleteSelected,
  onChangeKittingOptions,
}) => {
  const [tab, setTab] = useState<'inspector' | 'flow' | 'routes'>('flow');

  // Auto-switch to inspector when user clicks something on the canvas
  React.useEffect(() => {
    if (selection) setTab('inspector');
  }, [selection]);

  const addNewStep = () => {
    const firstRobot = project.robots[0]?.id;
    const firstRoute = project.routes[0]?.id;
    const newStep: FlowStep = {
      id: `step-${Date.now()}`,
      title: `${project.steps.length + 1}. ขั้นตอนใหม่`,
      action: 'move',
      duration: 5,
      robotId: firstRobot,
      routeId: firstRoute,
      reverseRoute: false,
    };
    onUpdateProject((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const updateStep = (stepId: string, patch: Partial<FlowStep>) => {
    onUpdateProject((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    }));
  };

  const deleteStep = (stepId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId),
    }));
  };

  const moveStepOrder = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= project.steps.length) return;
    onUpdateProject((prev) => {
      const copy = [...prev.steps];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return { ...prev, steps: copy };
    });
  };

  const renderInspectorBody = () => {
    if (!selection) {
      return (
        <div className="p-4 text-xs text-slate-400 space-y-3">
          <p className="text-slate-200 font-semibold">คลิกเลือกวัตถุหรือเส้นทางบนผังเพื่อแก้ไข</p>
          <p>
            • ลากสถานี (A, B, C, D...), AMR, UR ตั้งโต๊ะ หรือ Object บนผังได้อิสระตอนหยุดเล่น (Pause)
          </p>
          <p>• คลิกที่เส้นประเพื่อเลือกเส้นทางและลากปรับจุดเลี้ยว (Waypoints) ได้โดยตรง</p>
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300">สรุปองค์ประกอบในผังตอนนี้</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
                สถานี: <span className="text-emerald-400 font-bold">{project.stations.length}</span>
              </div>
              <div className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
                AMR: <span className="text-orange-400 font-bold">{project.robots.length}</span>
              </div>
              <div className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
                UR ตั้งโต๊ะ: <span className="text-sky-400 font-bold">{project.stationURs.length}</span>
              </div>
              <div className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
                เส้นทาง: <span className="text-purple-400 font-bold">{project.routes.length}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selection.type === 'station') {
      const st = project.stations.find((s) => s.id === selection.id);
      if (!st) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> สถานี / จุดมาร์ค
            </span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
              title="ลบจุดนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">รหัสจุด (A-Z)</label>
              <input
                value={st.code}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    stations: p.stations.map((x) =>
                      x.id === st.id ? { ...x, code: e.target.value.slice(0, 4) } : x
                    ),
                  }))
                }
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400">ชื่อจุด</label>
              <input
                value={st.name}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    stations: p.stations.map((x) =>
                      x.id === st.id ? { ...x, name: e.target.value } : x
                    ),
                  }))
                }
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">ประเภทจุด</label>
              <select
                value={st.kind}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    stations: p.stations.map((x) =>
                      x.id === st.id ? { ...x, kind: e.target.value as typeof st.kind } : x
                    ),
                  }))
                }
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="station">สถานีหลัก (Station)</option>
                <option value="buffer">จุดพัก / Buffer</option>
                <option value="wait">จุดรอคิว (Wait)</option>
                <option value="charge">จุดชาร์จ (Charge)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">สีประจำจุด</label>
              <input
                type="color"
                value={st.color}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    stations: p.stations.map((x) =>
                      x.id === st.id ? { ...x, color: e.target.value } : x
                    ),
                  }))
                }
                className="w-full h-7 mt-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-400">
            <div>X: {st.x}</div>
            <div>Y: {st.y}</div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">โน้ต / ข้อคิดเห็น (แชร์กับเพื่อน)</label>
            <textarea
              rows={3}
              value={st.note ?? ''}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  stations: p.stations.map((x) =>
                    x.id === st.id ? { ...x, note: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200"
              placeholder="จดข้อสังเกต เช่น ระยะเอื้อมหรือทางเดิน..."
            />
          </div>
        </div>
      );
    }

    if (selection.type === 'robot') {
      const r = project.robots.find((x) => x.id === selection.id);
      if (!r) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-orange-400" /> หุ่นยนต์ AMR
            </span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">ชื่อรถ (เช่น M1, M2)</label>
              <input
                value={r.name}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    robots: p.robots.map((x) =>
                      x.id === r.id ? { ...x, name: e.target.value } : x
                    ),
                  }))
                }
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">สีแถบแยกคัน</label>
              <input
                type="color"
                value={r.color}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    robots: p.robots.map((x) =>
                      x.id === r.id ? { ...x, color: e.target.value } : x
                    ),
                  }))
                }
                className="w-full h-7 mt-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">รูปแบบหุ่น</label>
            <select
              value={r.kind}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  robots: p.robots.map((x) =>
                    x.id === r.id ? { ...x, kind: e.target.value as typeof r.kind } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            >
              <option value="amr">AMR ขนส่งทั่วไป (แบก Object บนหลัง)</option>
              <option value="amr-ur">AMR ติดแขน UR บนหัว (Mobile UR)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">
              มุมหันหัวรถ ({Math.round((r.angle * 180) / Math.PI)}°)
            </label>
            <input
              type="range"
              min={-180}
              max={180}
              step={15}
              value={Math.round((r.angle * 180) / Math.PI)}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  robots: p.robots.map((x) =>
                    x.id === r.id ? { ...x, angle: (Number(e.target.value) * Math.PI) / 180 } : x
                  ),
                }))
              }
              className="w-full accent-orange-400"
            />
          </div>
          {r.kind === 'amr-ur' && (
            <div>
              <label className="text-[10px] text-slate-400">รัศมีระยะเอื้อม UR ({r.urReach ?? 38}px)</label>
              <input
                type="range"
                min={20}
                max={75}
                value={r.urReach ?? 38}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    robots: p.robots.map((x) =>
                      x.id === r.id ? { ...x, urReach: Number(e.target.value) } : x
                    ),
                  }))
                }
                className="w-full accent-emerald-400"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] text-slate-400">โน้ต</label>
            <textarea
              rows={2}
              value={r.note ?? ''}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  robots: p.robots.map((x) =>
                    x.id === r.id ? { ...x, note: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200"
            />
          </div>
        </div>
      );
    }

    if (selection.type === 'ur') {
      const ur = project.stationURs.find((u) => u.id === selection.id);
      if (!ur) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100">🦾 แขน UR ตั้งโต๊ะ</span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">ชื่อแขน UR</label>
            <input
              value={ur.name}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  stationURs: p.stationURs.map((x) =>
                    x.id === ur.id ? { ...x, name: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">รัศมีระยะเอื้อม ({ur.reach}px)</label>
            <input
              type="range"
              min={24}
              max={85}
              value={ur.reach}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  stationURs: p.stationURs.map((x) =>
                    x.id === ur.id ? { ...x, reach: Number(e.target.value) } : x
                  ),
                }))
              }
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      );
    }

    if (selection.type === 'object') {
      const obj = project.objects.find((o) => o.id === selection.id);
      if (!obj) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-amber-400" /> Object / ตะกร้า
            </span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">ชื่อชิ้นงาน / ตะกร้า</label>
            <input
              value={obj.name}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  objects: p.objects.map((x) =>
                    x.id === obj.id ? { ...x, name: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">สถานีตั้งต้น (เริ่มวางที่จุดไหน)</label>
            <select
              value={obj.initialStationId ?? ''}
              onChange={(e) => {
                const sid = e.target.value || undefined;
                const st = project.stations.find((s) => s.id === sid);
                onUpdateProject((p) => ({
                  ...p,
                  objects: p.objects.map((x) =>
                    x.id === obj.id
                      ? {
                          ...x,
                          initialStationId: sid,
                          x: st ? st.x : x.x,
                          y: st ? st.y : x.y,
                        }
                      : x
                  ),
                }));
              }}
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            >
              <option value="">วางอิสระบนผัง</option>
              {project.stations.map((s) => (
                <option key={s.id} value={s.id}>
                  สถานี {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (selection.type === 'asset') {
      const asset = project.assets.find((a) => a.id === selection.id);
      if (!asset) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> อุปกรณ์ IIoT
            </span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">ชื่ออุปกรณ์</label>
            <input
              value={asset.name}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  assets: p.assets.map((x) =>
                    x.id === asset.id ? { ...x, name: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>
          {asset.kind === 'camera' && (
            <>
              <div>
                <label className="text-[10px] text-slate-400">
                  ทิศทางกล้อง ({Math.round((asset.angle * 180) / Math.PI)}°)
                </label>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={Math.round((asset.angle * 180) / Math.PI)}
                  onChange={(e) =>
                    onUpdateProject((p) => ({
                      ...p,
                      assets: p.assets.map((x) =>
                        x.id === asset.id
                          ? { ...x, angle: (Number(e.target.value) * Math.PI) / 180 }
                          : x
                      ),
                    }))
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">ระยะมอง FOV ({asset.fovRange ?? 55}px)</label>
                <input
                  type="range"
                  min={25}
                  max={130}
                  value={asset.fovRange ?? 55}
                  onChange={(e) =>
                    onUpdateProject((p) => ({
                      ...p,
                      assets: p.assets.map((x) =>
                        x.id === asset.id ? { ...x, fovRange: Number(e.target.value) } : x
                      ),
                    }))
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </>
          )}
        </div>
      );
    }

    if (selection.type === 'route') {
      const rt = project.routes.find((x) => x.id === selection.id);
      if (!rt) return null;
      return (
        <div className="p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-purple-400" /> เส้นทางวิ่ง AMR
            </span>
            <button
              onClick={onDeleteSelected}
              className="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">ชื่อเส้นทาง</label>
            <input
              value={rt.name}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  routes: p.routes.map((x) =>
                    x.id === rt.id ? { ...x, name: e.target.value } : x
                  ),
                }))
              }
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">ผูกกับหุ่น AMR คันไหน (ใช้ในโหมด B)</label>
            <select
              value={rt.robotId}
              onChange={(e) => {
                const rid = e.target.value;
                const rob = project.robots.find((rb) => rb.id === rid);
                onUpdateProject((p) => ({
                  ...p,
                  routes: p.routes.map((x) =>
                    x.id === rt.id ? { ...x, robotId: rid, color: rob?.color ?? x.color } : x
                  ),
                }));
              }}
              className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
            >
              {project.robots.map((rb) => (
                <option key={rb.id} value={rb.id}>
                  {rb.name} ({rb.kind === 'amr-ur' ? 'AMR+UR' : 'AMR'})
                </option>
              ))}
            </select>
          </div>
          <div className="text-[11px] text-slate-400">
            จุดเลี้ยวทั้งหมด: <span className="text-slate-200 font-bold">{rt.points.length} จุด</span>
            <div className="mt-1 text-[10px]">
              ลากจุดวงกลมสีขาวบนเส้นทางในผังเพื่อดัดแนววิ่งได้ทันที
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <aside className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col min-h-0">
      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-slate-800 text-[11px] font-semibold">
        <button
          onClick={() => setTab('flow')}
          className={`py-2.5 border-b-2 transition ${
            tab === 'flow'
              ? 'border-sky-400 text-sky-300 bg-slate-900/70'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ลำดับ Flow ({project.steps.length})
        </button>
        <button
          onClick={() => setTab('routes')}
          className={`py-2.5 border-b-2 transition ${
            tab === 'routes'
              ? 'border-purple-400 text-purple-300 bg-slate-900/70'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          เส้นทาง ({project.routes.length})
        </button>
        <button
          onClick={() => setTab('inspector')}
          className={`py-2.5 border-b-2 transition ${
            tab === 'inspector'
              ? 'border-emerald-400 text-emerald-300 bg-slate-900/70'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          คุณสมบัติ
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'inspector' && renderInspectorBody()}

        {tab === 'routes' && (
          <div className="p-3 space-y-2 text-xs">
            <div className="text-[11px] text-slate-400 mb-2">
              คลิกเครื่องมือ <strong className="text-blue-400">“วาดเส้นทาง”</strong> ด้านซ้ายเพื่อสร้างเส้นวิ่งใหม่ หรือคลิกเส้นด้านล่างเพื่อแก้ไขจุดเลี้ยว
            </div>
            {project.routes.length === 0 && (
              <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                ยังไม่มีเส้นทางวิ่ง AMR
              </div>
            )}
            {project.routes.map((rt) => {
              const rob = project.robots.find((r) => r.id === rt.robotId);
              const isSel = selection?.type === 'route' && selection.id === rt.id;
              return (
                <div
                  key={rt.id}
                  onClick={() => onSelect({ type: 'route', id: rt.id })}
                  className={`p-2.5 rounded-lg border cursor-pointer transition ${
                    isSel
                      ? 'bg-slate-800 border-purple-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: rt.color }}
                      />
                      {rt.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{rt.points.length} จุด</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    หุ่นที่ใช้: {rob?.name ?? 'ยังไม่ระบุ'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'flow' && (
          <div className="p-3 space-y-2.5 text-xs">
            {mode === 'modeB' && (
              <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-600/50 text-amber-200 text-[11px]">
                ตอนนี้กำลังเปิด <strong>โหมด B (Quick Route Loop)</strong> — หุ่นทุกคันจะวิ่งวนตามเส้นทางที่วาดไว้อัตโนมัติ สลับไป <strong>โหมด A</strong> ด้านบนเพื่อเล่นตามลำดับ Step ด้านล่าง
              </div>
            )}

            {/* Kitting Order A/B + Fault Missing S3 Panel (visible when Kitting preset is active) */}
            {project.kitting?.enabled && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300 text-[11px]">
                    ชุดจัดถาด A/B &amp; ตรวจ QC (จำลอง)
                  </span>
                  {sim.kitting && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sim.kitting.qcStatus === 'pass'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : sim.kitting.qcStatus === 'hold'
                          ? 'bg-rose-500/25 text-rose-200 border border-rose-500/60'
                          : sim.kitting.qcStatus === 'inspecting'
                          ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {sim.kitting.qcBadgeText}
                    </span>
                  )}
                </div>

                {/* Order A / B selector */}
                <div className="grid grid-cols-2 gap-1.5">
                  {(['A', 'B'] as const).map((ord) => {
                    const active = project.kitting?.order === ord;
                    return (
                      <button
                        key={ord}
                        type="button"
                        onClick={() => onChangeKittingOptions?.({ order: ord })}
                        className={`px-2 py-1.5 rounded-md border text-left transition ${
                          active
                            ? 'bg-sky-600/30 border-sky-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-[11px]">ออเดอร์ {ord}</div>
                        <div className="text-[9.5px] opacity-85">
                          {ord === 'A' ? 'S1 แหวน · S2 บล็อก · S3 แหวน' : 'S1 บล็อก · S2 แหวน · S3 บล็อก'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Fault test toggle: ปกติ / ขาด S3 */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onChangeKittingOptions?.({ fault: 'none' })}
                    className={`py-1 rounded-md border font-semibold transition ${
                      project.kitting.fault === 'none'
                        ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ปกติ (ครบ 3 ช่อง)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeKittingOptions?.({ fault: 'missingS3' })}
                    className={`py-1 rounded-md border font-semibold transition ${
                      project.kitting.fault === 'missingS3'
                        ? 'bg-rose-600/30 border-rose-400 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ทดสอบ: ขาด S3
                  </button>
                </div>

                {/* Live S1-S3 slot readout */}
                {sim.kitting && (
                  <div className="pt-1 border-t border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400">
                      สูตร: {KITTING_RECIPES[sim.kitting.order].label}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                      {(['S1', 'S2', 'S3'] as const).map((slotId) => {
                        const actual = sim.kitting!.actualSlots[slotId];
                        const isMiss =
                          sim.kitting!.qcStatus === 'hold' &&
                          sim.kitting!.missingSlots.includes(slotId);
                        return (
                          <div
                            key={slotId}
                            className={`px-1.5 py-1 rounded border ${
                              isMiss
                                ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                                : actual
                                ? 'bg-slate-950 border-slate-700 text-slate-100'
                                : 'bg-slate-950/60 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div className="font-mono text-[9px] text-slate-400">{slotId}</div>
                            <div className="font-bold">
                              {actual === 'ring' ? '◯ แหวน' : actual === 'block' ? '▢ บล็อก' : 'ว่าง'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sim.kitting.qcReason && (
                      <div
                        className={`text-[10px] px-2 py-1 rounded ${
                          sim.kitting.qcStatus === 'hold'
                            ? 'bg-rose-950/60 text-rose-200 border border-rose-800'
                            : 'bg-emerald-950/50 text-emerald-200 border border-emerald-800/70'
                        }`}
                      >
                        {sim.kitting.qcReason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                ลำดับ Step งาน (โหมด A)
              </span>
              <button
                onClick={addNewStep}
                className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> เพิ่ม Step
              </button>
            </div>

            {project.steps.length === 0 && (
              <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                ยังไม่มี Step — กด “เพิ่ม Step” เพื่อออกแบบ System Flow
              </div>
            )}

            {project.steps.map((step, idx) => {
              const isCurrent = mode === 'modeA' && sim.activeStepIndex === idx;
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border space-y-2 ${
                    isCurrent
                      ? 'bg-sky-950/40 border-sky-400 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={step.title}
                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      className="flex-1 bg-transparent text-slate-100 font-semibold text-[11px] focus:outline-none focus:bg-slate-800 px-1 rounded"
                    />
                    <button
                      onClick={() => moveStepOrder(idx, -1)}
                      className="p-0.5 text-slate-400 hover:text-white"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveStepOrder(idx, 1)}
                      className="p-0.5 text-slate-400 hover:text-white"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="p-0.5 text-rose-400 hover:text-rose-300"
                      title="ลบ Step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={step.action}
                      onChange={(e) => {
                        const nextAction = e.target.value as FlowStepAction;
                        if (nextAction === 'convoy-move') {
                          const defaultIds = project.robots.slice(0, 2).map((r) => r.id);
                          updateStep(step.id, {
                            action: nextAction,
                            convoyRobotIds:
                              step.convoyRobotIds && step.convoyRobotIds.length >= 2
                                ? step.convoyRobotIds
                                : defaultIds,
                            convoySpacing: step.convoySpacing ?? 24,
                            routeId: step.routeId || project.routes[0]?.id,
                          });
                        } else {
                          updateStep(step.id, { action: nextAction });
                        }
                      }}
                      className="col-span-2 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-[10px] text-slate-200"
                    >
                      {(Object.keys(ACTION_LABELS) as FlowStepAction[]).map((k) => (
                        <option key={k} value={k}>
                          {ACTION_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        step={0.5}
                        value={step.duration}
                        onChange={(e) =>
                          updateStep(step.id, { duration: Math.max(0.5, Number(e.target.value)) })
                        }
                        className="w-full bg-transparent text-[10px] text-slate-200 font-mono focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-500">วิ</span>
                    </div>
                  </div>

                  {/* Contextual selectors per action type */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {step.action !== 'ur-unload' &&
                      step.action !== 'ur-kit' &&
                      step.action !== 'qc-inspect' &&
                      step.action !== 'convoy-move' && (
                        <select
                          value={step.robotId ?? ''}
                          onChange={(e) => updateStep(step.id, { robotId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">เลือก AMR...</option>
                          {project.robots.map((r) => (
                            <option key={r.id} value={r.id}>
                              รถ {r.name}
                            </option>
                          ))}
                        </select>
                      )}

                    {step.action === 'convoy-move' && (() => {
                      const ids = step.convoyRobotIds ?? [];
                      const setSlot = (slotIdx: number, val: string) => {
                        const next = [...ids];
                        while (next.length <= slotIdx) next.push('');
                        next[slotIdx] = val;
                        const cleaned = next.filter((v, i) => Boolean(v) && next.indexOf(v) === i);
                        updateStep(step.id, { convoyRobotIds: cleaned });
                      };
                      return (
                        <div className="col-span-2 space-y-1.5 bg-slate-950/70 border border-sky-500/35 rounded-md p-2">
                          <div className="text-[10px] font-bold text-sky-300">
                            ลำดับขบวนแถวตอนเรียง 1 (คันนำ → คันตาม)
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {[0, 1, 2].map((slotIdx) => (
                              <select
                                key={slotIdx}
                                value={ids[slotIdx] ?? ''}
                                onChange={(e) => setSlot(slotIdx, e.target.value)}
                                className="px-1 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200"
                              >
                                <option value="">
                                  {slotIdx === 0 ? '#1 คันนำ...' : slotIdx === 1 ? '#2 ตาม...' : '#3 (ไม่บังคับ)'}
                                </option>
                                {project.robots.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    #{slotIdx + 1} {r.name}
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                          <select
                            value={step.routeId ?? ''}
                            onChange={(e) => updateStep(step.id, { routeId: e.target.value })}
                            className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200"
                          >
                            <option value="">เลือกเส้นทางเดินขบวน...</option>
                            {project.routes.map((rt) => (
                              <option key={rt.id} value={rt.id}>
                                {rt.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
                            <span className="shrink-0">ระยะเว้นห่าง: {step.convoySpacing ?? 24}px</span>
                            <input
                              type="range"
                              min={16}
                              max={48}
                              step={2}
                              value={step.convoySpacing ?? 24}
                              onChange={(e) =>
                                updateStep(step.id, { convoySpacing: Number(e.target.value) })
                              }
                              className="flex-1 accent-sky-400"
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(step.reverseRoute)}
                              onChange={(e) =>
                                updateStep(step.id, { reverseRoute: e.target.checked })
                              }
                              className="accent-sky-400"
                            />
                            <span>เดินขบวนย้อนเส้นทางกลับ (Reverse)</span>
                          </label>
                        </div>
                      );
                    })()}

                    {step.action === 'ur-kit' && (
                      <>
                        <select
                          value={step.urId ?? ''}
                          onChange={(e) => updateStep(step.id, { urId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">แขน UR...</option>
                          {project.stationURs.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.feedStationId ?? ''}
                          onChange={(e) => updateStep(step.id, { feedStationId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">โต๊ะป้อน (F)...</option>
                          {project.stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              สถานี {s.code}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.stationId ?? ''}
                          onChange={(e) => updateStep(step.id, { stationId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">จุดจัดถาด (A)...</option>
                          {project.stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              สถานี {s.code}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.objectId ?? ''}
                          onChange={(e) => updateStep(step.id, { objectId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">ถาดจัดชุด...</option>
                          {project.objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {step.action === 'qc-inspect' && (
                      <>
                        <select
                          value={step.cameraAssetId ?? ''}
                          onChange={(e) => updateStep(step.id, { cameraAssetId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">กล้อง QC...</option>
                          {project.assets
                            .filter((a) => a.kind === 'camera')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                        </select>
                        <select
                          value={step.objectId ?? ''}
                          onChange={(e) => updateStep(step.id, { objectId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">ถาดที่ตรวจ...</option>
                          {project.objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {step.action === 'move' && (
                      <>
                        <select
                          value={step.routeId ?? ''}
                          onChange={(e) => updateStep(step.id, { routeId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">เลือกเส้นทาง...</option>
                          {project.routes.map((rt) => (
                            <option key={rt.id} value={rt.id}>
                              {rt.name}
                            </option>
                          ))}
                        </select>
                        <label className="col-span-2 flex items-center gap-1.5 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(step.reverseRoute)}
                            onChange={(e) =>
                              updateStep(step.id, { reverseRoute: e.target.checked })
                            }
                            className="accent-sky-400"
                          />
                          <span>วิ่งย้อนเส้นทางกลับ (Reverse)</span>
                        </label>
                      </>
                    )}

                    {step.action === 'pick-station' && (
                      <>
                        <select
                          value={step.stationId ?? ''}
                          onChange={(e) => updateStep(step.id, { stationId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">จากสถานี...</option>
                          {project.stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              สถานี {s.code}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.objectId ?? ''}
                          onChange={(e) => updateStep(step.id, { objectId: e.target.value })}
                          className="col-span-2 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">เลือก Object...</option>
                          {project.objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {step.action === 'transfer-amr' && (
                      <>
                        <select
                          value={step.targetRobotId ?? ''}
                          onChange={(e) => updateStep(step.id, { targetRobotId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">ส่งให้รถ...</option>
                          {project.robots.map((r) => (
                            <option key={r.id} value={r.id}>
                              รถ {r.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.objectId ?? ''}
                          onChange={(e) => updateStep(step.id, { objectId: e.target.value })}
                          className="col-span-2 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">เลือก Object...</option>
                          {project.objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {step.action === 'ur-unload' && (
                      <>
                        <select
                          value={step.urId ?? ''}
                          onChange={(e) => updateStep(step.id, { urId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">แขน UR...</option>
                          {project.stationURs.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.robotId ?? ''}
                          onChange={(e) => updateStep(step.id, { robotId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">ยกจากรถ...</option>
                          {project.robots.map((r) => (
                            <option key={r.id} value={r.id}>
                              รถ {r.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.stationId ?? ''}
                          onChange={(e) => updateStep(step.id, { stationId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">วางลงสถานี...</option>
                          {project.stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              สถานี {s.code}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.objectId ?? ''}
                          onChange={(e) => updateStep(step.id, { objectId: e.target.value })}
                          className="px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                        >
                          <option value="">Object...</option>
                          {project.objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
