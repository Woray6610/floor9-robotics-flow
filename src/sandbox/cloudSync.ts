import { SandboxProject } from './types';

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  roomId: string;
}

const CLOUD_CFG_KEY = 'floor9-cloud-sync-config';

/**
 * Load Cloud Sync config from:
 * 1) Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ROOM_ID)
 * 2) URL query parameters (?sb_url=...&sb_key=...&room=...) — lets friends auto-connect via one link!
 * 3) localStorage fallback
 */
export function loadCloudConfig(): CloudSyncConfig | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  const envRoom = (import.meta.env.VITE_ROOM_ID as string | undefined)?.trim() || 'floor9-main';

  if (envUrl && envKey) {
    return {
      supabaseUrl: envUrl.replace(/\/+$/, ''),
      supabaseAnonKey: envKey,
      roomId: envRoom,
    };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const qUrl = params.get('sb_url')?.trim();
    const qKey = params.get('sb_key')?.trim();
    const qRoom = params.get('room')?.trim() || 'floor9-main';
    if (qUrl && qKey) {
      const cfg: CloudSyncConfig = {
        supabaseUrl: qUrl.replace(/\/+$/, ''),
        supabaseAnonKey: qKey,
        roomId: qRoom,
      };
      localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(cfg));
      return cfg;
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(CLOUD_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CloudSyncConfig;
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          supabaseUrl: parsed.supabaseUrl.replace(/\/+$/, ''),
          supabaseAnonKey: parsed.supabaseAnonKey,
          roomId: parsed.roomId || 'floor9-main',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function saveCloudConfig(cfg: CloudSyncConfig | null) {
  try {
    if (!cfg) {
      localStorage.removeItem(CLOUD_CFG_KEY);
    } else {
      localStorage.setItem(
        CLOUD_CFG_KEY,
        JSON.stringify({
          supabaseUrl: cfg.supabaseUrl.replace(/\/+$/, ''),
          supabaseAnonKey: cfg.supabaseAnonKey.trim(),
          roomId: cfg.roomId.trim() || 'floor9-main',
        })
      );
    }
  } catch {
    // ignore
  }
}

export interface CloudRow {
  id: string;
  project_json: SandboxProject;
  updated_by: string;
  client_id: string;
  updated_at: string;
}

/**
 * Build headers compatible with both legacy JWT anon keys (eyJ...) and new Supabase publishable keys (sb_publishable_...)
 */
function buildSupabaseHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: apiKey,
    Accept: 'application/json',
    ...extra,
  };
  // New sb_publishable_ keys are NOT JWTs and work cleanly via apikey alone; legacy eyJ keys also use Bearer
  if (!apiKey.startsWith('sb_publishable_')) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Fetch latest shared room state from Supabase REST API (no extra SDK dependency required!)
 */
export async function fetchCloudRoom(cfg: CloudSyncConfig): Promise<CloudRow | null> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?id=eq.${encodeURIComponent(cfg.roomId)}&select=*`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildSupabaseHeaders(cfg.supabaseAnonKey),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Supabase GET HTTP ${res.status}`);
  }
  const rows = (await res.json()) as CloudRow[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Upsert shared room state to Supabase REST API
 */
export async function upsertCloudRoom(
  cfg: CloudSyncConfig,
  payload: {
    project: SandboxProject;
    updatedBy: string;
    clientId: string;
  }
): Promise<void> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?on_conflict=id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildSupabaseHeaders(cfg.supabaseAnonKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: cfg.roomId,
      project_json: payload.project,
      updated_by: payload.updatedBy,
      client_id: payload.clientId,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase POST HTTP ${res.status}`);
  }
}

export const SUPABASE_SETUP_SQL = `-- รันครั้งเดียวใน Supabase SQL Editor เพื่อสร้างตารางเก็บผัง 24/7
create table if not exists public.floor9_rooms (
  id text primary key,
  project_json jsonb not null,
  updated_by text default 'Team',
  client_id text default '',
  updated_at timestamptz default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.floor9_rooms to anon, authenticated;

alter table public.floor9_rooms enable row level security;

drop policy if exists "Allow public read/write for Floor 9 Sandbox" on public.floor9_rooms;
create policy "Allow public read/write for Floor 9 Sandbox"
  on public.floor9_rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);`;
