import React, { useState } from 'react';
import {
  Check,
  Copy,
  FolderOpen,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CollaboratorPresence, SavedWorkflowRecord } from '../sandbox/cloudSync';

interface WorkflowLibraryModalProps {
  workflows: SavedWorkflowRecord[];
  activeWorkflowId: string;
  currentWorkflowName: string;
  loading: boolean;
  collaborators: CollaboratorPresence[];
  onOpenWorkflow: (id: string) => void;
  onSaveOverwrite: (name: string) => void;
  onSaveAsNew: (name: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onCreateFromTemplate: (template: 'preset1' | 'kitting' | 'empty') => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const WorkflowLibraryModal: React.FC<WorkflowLibraryModalProps> = ({
  workflows,
  activeWorkflowId,
  currentWorkflowName,
  loading,
  collaborators,
  onOpenWorkflow,
  onSaveOverwrite,
  onSaveAsNew,
  onDeleteWorkflow,
  onCreateFromTemplate,
  onRefresh,
  onClose,
}) => {
  const [saveName, setSaveName] = useState(currentWorkflowName);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs flex flex-col max-h-[84vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            คลัง Workflow ของทีม (บันทึกและเปิดเปรียบเทียบได้อิสระ)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="รีเฟรชรายการ Workflow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Save Current Workflow Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-300">
            บันทึก Workflow ที่กำลังทำอยู่ (เซฟทับอันเดิม หรือ Save As เป็นอันใหม่เพื่อเปรียบเทียบ)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="ตั้งชื่อ Workflow เช่น Flow บอส - 2 AMR วนขวา..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-sky-400 text-slate-100 font-semibold outline-none"
            />
            <button
              onClick={() => {
                if (!saveName.trim()) return;
                onSaveOverwrite(saveName.trim());
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
              title="บันทึกทับ Workflow ที่เปิดอยู่ตอนนี้"
            >
              <Save className="w-3.5 h-3.5" /> Save ทับ
            </button>
            <button
              onClick={() => {
                if (!saveName.trim()) return;
                onSaveAsNew(saveName.trim());
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 shadow"
              title="สร้างเป็น Workflow ใหม่เก็บไว้เปรียบเทียบ"
            >
              <Copy className="w-3.5 h-3.5" /> Save As ใหม่
            </button>
          </div>
        </div>

        {/* Saved Workflows List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Workflow ที่บันทึกไว้บน Cloud ({workflows.length} รายการ)</span>
            <span>แต่ละคนคลิกสลับดูได้อย่างอิสระ · คนที่เปิดอันเดียวกันจะเห็นเมาส์สดร่วมกัน</span>
          </div>

          {workflows.length === 0 && !loading && (
            <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              ยังไม่มี Workflow ที่บันทึกไว้ — กด “Save As ใหม่” ด้านบนเพื่อเก็บเวอร์ชันแรก
            </div>
          )}

          {workflows.map((wf) => {
            const isActive = wf.id === activeWorkflowId;
            const viewersHere = collaborators.filter((c) => c.workflowId === wf.id);
            const stepCount = wf.project.steps?.length ?? 0;
            const robotCount = wf.project.robots?.length ?? 0;
            const stationCount = wf.project.stations?.length ?? 0;

            return (
              <div
                key={wf.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-sky-950/40 border-sky-400 shadow'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-xs truncate">{wf.name}</span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/60 text-sky-200 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> กำลังเปิดอยู่
                      </span>
                    )}
                    {wf.project.kitting?.enabled && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                        UR จัดชุด A/B
                      </span>
                    )}
                  </div>

                  <div className="text-[10.5px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>สร้างโดย: <strong className="text-slate-300">{wf.author}</strong></span>
                    <span>แก้ล่าสุด: <strong className="text-slate-300">{wf.updatedBy}</strong> · {formatTime(wf.updatedAt)}</span>
                    <span className="font-mono text-slate-500">
                      {stationCount} จุด · {robotCount} AMR · {stepCount} Step
                    </span>
                  </div>

                  {/* Who is currently viewing/editing this workflow */}
                  {viewersHere.length > 0 && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-slate-500 mr-1">กำลังดูอยู่:</span>
                      {viewersHere.map((v) => (
                        <span
                          key={v.clientId}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold text-white"
                          style={{ backgroundColor: v.color }}
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => {
                        onOpenWorkflow(wf.id);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-100 font-semibold flex items-center gap-1 transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> เปิดดู / แก้
                    </button>
                  )}

                  {confirmDeleteId === wf.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteWorkflow(wf.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                      >
                        ยืนยันลบ
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(wf.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800"
                      title="ลบ Workflow นี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Start New Workflow from Starter Templates */}
        <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-sky-400" /> เริ่ม Workflow ใหม่จากต้นแบบ:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                onCreateFromTemplate('preset1');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium"
            >
              ฐาน A → B → C / D
            </button>
            <button
              onClick={() => {
                onCreateFromTemplate('kitting');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/50 text-sky-200 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> ฐาน UR จัดชุด A/B + ตรวจถาด
            </button>
            <button
              onClick={() => {
                onCreateFromTemplate('empty');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium"
            >
              ผังเปล่า (Empty)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
