import React, { useState } from 'react';
import { User } from 'lucide-react';
import { USER_AVATAR_COLORS } from '../sandbox/cloudSync';

interface NameEntryModalProps {
  initialName: string;
  initialColor: string;
  canClose: boolean;
  onConfirm: (name: string, color: string) => void;
  onClose?: () => void;
}

export const NameEntryModal: React.FC<NameEntryModalProps> = ({
  initialName,
  initialColor,
  canClose,
  onConfirm,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || USER_AVATAR_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), color);
  };

  const initials = (name.trim() || 'W').slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (canClose && onClose) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base text-white shadow-lg border-2 border-white/80 shrink-0"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-400" />
              ตั้งชื่อของคุณก่อนเข้าห้อง
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              เพื่อนในทีมจะเห็นชื่อ ไอคอนมุมบนขวา และเมาส์ของคุณแบบ Real-time
            </p>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-300">ชื่อเล่น / ชื่อผู้ใช้งาน</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="เช่น Woray, บอส, มิ้นท์..."
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-sky-400 text-slate-100 text-sm font-semibold outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-300">สีประจำตัว (Avatar &amp; เมาส์)</label>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {USER_AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  color === c ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold shadow"
          >
            เข้าสู่ห้องออกแบบ Flow
          </button>
        </div>
      </form>
    </div>
  );
};
