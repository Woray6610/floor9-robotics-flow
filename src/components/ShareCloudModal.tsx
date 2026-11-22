import React, { useState } from 'react';
import { Cloud, Copy, Server, Share2 } from 'lucide-react';
import { CloudSyncConfig, SUPABASE_SETUP_SQL } from '../sandbox/cloudSync';
import { SyncBackend, SyncStatus } from '../sandbox/useLiveSync';

interface ShareCloudModalProps {
  backend: SyncBackend;
  status: SyncStatus;
  onlineCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  editorName: string;
  cloudConfig: CloudSyncConfig | null;
  onChangeEditorName: (name: string) => void;
  onSaveCloudConfig: (cfg: CloudSyncConfig | null) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export const ShareCloudModal: React.FC<ShareCloudModalProps> = ({
  backend,
  status,
  onlineCount,
  lastSyncedAt,
  syncError,
  editorName,
  cloudConfig,
  onChangeEditorName,
  onSaveCloudConfig,
  onNotify,
  onClose,
}) => {
  const [tab, setTab] = useState<'share' | 'cloud'>(backend === 'cloud' ? 'share' : 'share');
  const [sbUrl, setSbUrl] = useState(cloudConfig?.supabaseUrl ?? '');
  const [sbKey, setSbKey] = useState(cloudConfig?.supabaseAnonKey ?? '');
  const [roomId, setRoomId] = useState(cloudConfig?.roomId ?? 'floor9-main');
  const [showSql, setShowSql] = useState(false);

  const shareUrl = (() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    if (cloudConfig && !import.meta.env.VITE_SUPABASE_URL) {
      const p = new URLSearchParams({
        sb_url: cloudConfig.supabaseUrl,
        sb_key: cloudConfig.supabaseAnonKey,
        room: cloudConfig.roomId,
      });
      return `${base}?${p.toString()}`;
    }
    return base;
  })();

  const handleConnectCloud = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      onNotify('กรุณากรอก Supabase Project URL และ Anon Key ให้ครบ');
      return;
    }
    onSaveCloudConfig({
      supabaseUrl: sbUrl.trim(),
      supabaseAnonKey: sbKey.trim(),
      roomId: roomId.trim() || 'floor9-main',
    });
    onNotify('เชื่อมต่อ Supabase Cloud 24/7 แล้ว!');
    setTab('share');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            แชร์ผังสด &amp; ซิงก์ Cloud 24/7 (ฟรี ไม่ต้องใช้ VPS)
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="grid grid-cols-2 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('share')}
            className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'share'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 bg-slate-950/40'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> สถานะ &amp; ลิงก์แชร์
          </button>
          <button
            onClick={() => setTab('cloud')}
            className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'cloud'
                ? 'border-sky-400 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 bg-slate-950/40'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> ตั้งค่า Cloud 24/7 (ปิดคอมก็ใช้ได้)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {tab === 'share' && (
            <>
              <div className="flex items-center justify-between bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-800">
                <div>
                  <div className="text-slate-400 text-[10px]">โหมดการซิงก์ตอนนี้</div>
                  <div className="font-semibold text-slate-100 mt-0.5">
                    {backend === 'cloud' && status === 'live' && (
                      <span className="text-sky-300">
                        ☁️ Cloud 24/7 (Supabase · ห้อง {cloudConfig?.roomId})
                      </span>
                    )}
                    {backend === 'local' && status === 'live' && (
                      <span className="text-emerald-300">
                        🟢 Local Shared Server ({onlineCount} คนกำลังดู/แก้ไข)
                      </span>
                    )}
                    {status === 'saving' && (
                      <span className="text-amber-300">🔵 กำลังบันทึกและซิงก์ข้อมูล...</span>
                    )}
                    {status === 'offline' && (
                      <span className="text-rose-300">
                        ⚪ ออฟไลน์ {syncError ? `(${syncError})` : '(บันทึกเฉพาะในเครื่องนี้)'}
                      </span>
                    )}
                    {status === 'connecting' && (
                      <span className="text-slate-300">⏳ กำลังเชื่อมต่อเซิร์ฟเวอร์...</span>
                    )}
                  </div>
                </div>
                {lastSyncedAt && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    อัปเดต {lastSyncedAt}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-400">
                  ชื่อของคุณ (แสดงให้เพื่อนเห็นตอนคุณแก้ไขผัง)
                </label>
                <input
                  value={editorName}
                  onChange={(e) => onChangeEditorName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-medium"
                  placeholder="เช่น Woray, เพื่อน A..."
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">
                  ลิงก์สำหรับส่งให้เพื่อนเปิดดูและแก้ไขร่วมกัน
                </label>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-300 font-mono text-[11px]"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(shareUrl);
                      onNotify('คัดลอกลิงก์แชร์เรียบร้อย');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> คัดลอก
                  </button>
                </div>
              </div>

              {backend !== 'cloud' && (
                <div className="bg-sky-950/40 border border-sky-700/50 rounded-lg p-3 text-[11px] text-sky-100 space-y-1.5">
                  <div className="font-bold text-sky-300">
                    อยากปิดคอมแล้วให้เพื่อนเข้าแก้ได้ 24 ชม. จากทุกที่?
                  </div>
                  <p className="text-slate-300">
                    กดแท็บ <strong>“ตั้งค่า Cloud 24/7”</strong> ด้านบนเพื่อเชื่อมต่อ <strong>Supabase (ฟรี ไม่ใช้บัตรเครดิต)</strong> แล้วนำโปรเจกต์ขึ้น <strong>GitHub Pages / Vercel (ฟรี)</strong> ได้เลย
                  </p>
                </div>
              )}
            </>
          )}

          {tab === 'cloud' && (
            <>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-bold text-sky-300">ขั้นตอนตั้งค่าฟรีครั้งเดียว (ใช้เวลา ~3 นาที)</div>
                <div>
                  1. สมัครฟรีที่ <strong>supabase.com</strong> (ล็อกอินด้วย GitHub ได้เลย ไม่ต้องใช้บัตรเครดิต) แล้วกด <em>New Project</em>
                </div>
                <div>
                  2. ไปที่เมนู <strong>SQL Editor</strong> → วางโค้ด SQL ด้านล่างแล้วกด <strong>Run</strong>
                </div>
                <div>
                  3. ไปที่ <strong>Project Settings → API</strong> ก๊อปปี้ <code>Project URL</code> และ <code>anon public key</code> มาวางด้านล่าง
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setShowSql((v) => !v)}
                    className="text-[11px] text-sky-400 hover:underline font-semibold"
                  >
                    {showSql ? 'ซ่อนโค้ด SQL' : 'ดูโค้ด SQL สำหรับรันใน Supabase'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(SUPABASE_SETUP_SQL);
                      onNotify('คัดลอกโค้ด SQL แล้ว — นำไปวางใน Supabase SQL Editor ได้เลย');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> คัดลอก SQL
                  </button>
                </div>
                {showSql && (
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-emerald-300 font-mono overflow-x-auto">
                    {SUPABASE_SETUP_SQL}
                  </pre>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400">Supabase Project URL</label>
                  <input
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Supabase Anon Public Key</label>
                  <input
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">ชื่อห้อง (Room ID)</label>
                  <input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="floor9-main"
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {cloudConfig ? (
                  <button
                    onClick={() => {
                      onSaveCloudConfig(null);
                      setSbUrl('');
                      setSbKey('');
                      onNotify('สลับกลับเป็น Local Server แล้ว');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 font-semibold"
                  >
                    ตัดการเชื่อมต่อ Cloud
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    ใส่ค่าใน <code>.env</code> ตอน Deploy ขึ้น GitHub/Vercel ก็ได้
                  </span>
                )}
                <button
                  onClick={handleConnectCloud}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                >
                  บันทึกและเชื่อม Cloud 24/7
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
