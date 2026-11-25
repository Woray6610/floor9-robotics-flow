import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SandboxProject, SelectionTarget } from './types';

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  roomId: string;
}

export interface SavedWorkflowRecord {
  id: string;
  name: string;
  author: string;
  updatedBy: string;
  updatedAt: string;
  project: SandboxProject;
}

export interface CollaboratorPresence {
  clientId: string;
  name: string;
  color: string;
  workflowId: string;
  workflowName: string;
  activity?: string;
  joinedAt: number;
}

export interface RemoteCursorState {
  clientId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  selection: SelectionTarget;
  dragging?: {
    kind: 'station' | 'robot' | 'ur' | 'asset' | 'object' | 'route-pt';
    id: string;
    x: number;
    y: number;
    pointIdx?: number;
  } | null;
  updatedAt: number;
}

const CLOUD_CFG_KEY = 'floor9-cloud-sync-config';
const LOCAL_WORKFLOWS_KEY = 'floor9-saved-workflows-v1';

// Prefix used to store multiple named workflows inside `public.floor9_rooms` with ZERO new SQL required!
export const WORKFLOW_ID_PREFIX = 'wf:';

export const USER_AVATAR_COLORS = [
  '#38bdf8', // Sky
  '#22c55e', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
];

/**
 * Load Cloud Sync config from:
 * 1) Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ROOM_ID)
 * 2) URL query parameters (?sb_url=...&sb_key=...&room=...)
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

// Cached Supabase client singleton per (url, key)
let cachedClient: SupabaseClient | null = null;
let cachedKeySig = '';

export function getSupabaseClient(cfg: CloudSyncConfig): SupabaseClient {
  const sig = `${cfg.supabaseUrl}|${cfg.supabaseAnonKey}`;
  if (cachedClient && cachedKeySig === sig) {
    return cachedClient;
  }
  cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      params: { eventsPerSecond: 25 },
    },
  });
  cachedKeySig = sig;
  return cachedClient;
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
  if (!apiKey.startsWith('sb_publishable_')) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export interface CloudRow {
  id: string;
  project_json: SandboxProject & { _author?: string };
  updated_by: string;
  client_id: string;
  updated_at: string;
}

/**
 * List all saved Workflows stored in `public.floor9_rooms` (ids starting with `wf:` plus legacy `floor9-main`)
 */
export async function listCloudWorkflows(cfg: CloudSyncConfig): Promise<SavedWorkflowRecord[]> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?select=*&order=updated_at.desc`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildSupabaseHeaders(cfg.supabaseAnonKey),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Supabase LIST HTTP ${res.status}`);
  }
  const rows = (await res.json()) as CloudRow[];
  return rows
    .filter((r) => r.project_json && r.project_json.version === '2.0')
    .map((r) => ({
      id: r.id,
      name: r.project_json.name || (r.id === cfg.roomId ? 'Workflow หลัก (Floor 9)' : r.id),
      author: r.project_json._author || r.updated_by || 'ทีมงาน',
      updatedBy: r.updated_by || 'ทีมงาน',
      updatedAt: r.updated_at || r.project_json.updatedAt || new Date().toISOString(),
      project: r.project_json,
    }));
}

/**
 * Fetch one specific workflow row by ID
 */
export async function fetchCloudWorkflowById(
  cfg: CloudSyncConfig,
  workflowId: string
): Promise<CloudRow | null> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?id=eq.${encodeURIComponent(workflowId)}&select=*`;
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
 * Save (create or overwrite) a Workflow into `public.floor9_rooms`
 */
export async function saveCloudWorkflow(
  cfg: CloudSyncConfig,
  payload: {
    id: string;
    project: SandboxProject;
    author?: string;
    updatedBy: string;
    clientId: string;
  }
): Promise<void> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?on_conflict=id`;
  const projectWithMeta = {
    ...payload.project,
    _author: payload.author || (payload.project as SandboxProject & { _author?: string })._author || payload.updatedBy,
    updatedAt: new Date().toISOString(),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: buildSupabaseHeaders(cfg.supabaseAnonKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: payload.id,
      project_json: projectWithMeta,
      updated_by: payload.updatedBy,
      client_id: payload.clientId,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase SAVE HTTP ${res.status}`);
  }
}

/**
 * Delete a Workflow by ID from `public.floor9_rooms`
 */
export async function deleteCloudWorkflow(cfg: CloudSyncConfig, workflowId: string): Promise<void> {
  const url = `${cfg.supabaseUrl}/rest/v1/floor9_rooms?id=eq.${encodeURIComponent(workflowId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildSupabaseHeaders(cfg.supabaseAnonKey),
  });
  if (!res.ok) {
    throw new Error(`Supabase DELETE HTTP ${res.status}`);
  }
}

// ---- Offline / Local Fallback Workflow Store (when Supabase isn't configured) ----
export function loadLocalWorkflows(): SavedWorkflowRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_WORKFLOWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedWorkflowRecord[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalWorkflows(list: SavedWorkflowRecord[]) {
  try {
    localStorage.setItem(LOCAL_WORKFLOWS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function createWorkflowId(): string {
  return `${WORKFLOW_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const SUPABASE_SETUP_SQL = `-- รันครั้งเดียวใน Supabase SQL Editor เพื่อสร้างตารางเก็บ Workflow 24/7
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
