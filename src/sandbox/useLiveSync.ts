import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  CloudSyncConfig,
  CollaboratorPresence,
  createWorkflowId,
  deleteCloudWorkflow,
  fetchCloudWorkflowById,
  getSupabaseClient,
  listCloudWorkflows,
  loadCloudConfig,
  loadLocalWorkflows,
  RemoteCursorState,
  saveCloudConfig,
  saveCloudWorkflow,
  SavedWorkflowRecord,
  saveLocalWorkflows,
  USER_AVATAR_COLORS,
} from './cloudSync';
import { createDefaultPreset, normalizeImportedProject } from './presets';
import { SandboxProject, SelectionTarget } from './types';

export type SyncStatus = 'connecting' | 'live' | 'saving' | 'offline';
export type SyncBackend = 'cloud' | 'local' | 'offline';

interface UseLiveSyncOptions {
  project: SandboxProject;
  activeWorkflowId: string;
  selection: SelectionTarget;
  onRemoteProject: (remote: SandboxProject, editorName: string, workflowId: string) => void;
  onRemoteLiveDrag: (drag: NonNullable<RemoteCursorState['dragging']>) => void;
  onSwitchToWorkflow: (wf: SavedWorkflowRecord) => void;
}

const NAME_STORAGE_KEY = 'floor9-editor-name';
const COLOR_STORAGE_KEY = 'floor9-editor-color';

function getOrCreateClientId(): string {
  const key = 'floor9-sandbox-client-id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

function getOrCreateUserColor(): string {
  try {
    const saved = localStorage.getItem(COLOR_STORAGE_KEY);
    if (saved) return saved;
    const picked = USER_AVATAR_COLORS[Math.floor(Math.random() * USER_AVATAR_COLORS.length)];
    localStorage.setItem(COLOR_STORAGE_KEY, picked);
    return picked;
  } catch {
    return USER_AVATAR_COLORS[0];
  }
}

export function useLiveSync({
  project,
  activeWorkflowId,
  selection,
  onRemoteProject,
  onRemoteLiveDrag,
  onSwitchToWorkflow,
}: UseLiveSyncOptions) {
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const [cloudConfig, setCloudConfigState] = useState<CloudSyncConfig | null>(() => loadCloudConfig());
  const [backend, setBackend] = useState<SyncBackend>(cloudConfig ? 'cloud' : 'local');
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Identity (Name + Avatar Color) — prompts on first visit if not set yet
  const [editorName, setEditorNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_STORAGE_KEY)?.trim() || '';
    } catch {
      return '';
    }
  });
  const [editorColor, setEditorColorState] = useState<string>(getOrCreateUserColor);
  const [needsNamePrompt, setNeedsNamePrompt] = useState<boolean>(() => !editorName);

  // Saved Workflows Library
  const [workflows, setWorkflows] = useState<SavedWorkflowRecord[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState<boolean>(false);

  // Realtime Presence (all online teammates across the workspace) & Live Cursors (same workflow only!)
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursorState>>({});

  // Refs for fresh closures inside WebSocket handlers
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);
  const wfChannelRef = useRef<RealtimeChannel | null>(null);
  const isBootstrappedRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastCursorSentMsRef = useRef<number>(0);

  const projectRef = useRef(project);
  projectRef.current = project;
  const activeWfIdRef = useRef(activeWorkflowId);
  activeWfIdRef.current = activeWorkflowId;
  const editorNameRef = useRef(editorName || 'ผู้เยี่ยมชม');
  editorNameRef.current = editorName || 'ผู้เยี่ยมชม';
  const editorColorRef = useRef(editorColor);
  editorColorRef.current = editorColor;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const onRemoteProjectRef = useRef(onRemoteProject);
  onRemoteProjectRef.current = onRemoteProject;
  const onRemoteLiveDragRef = useRef(onRemoteLiveDrag);
  onRemoteLiveDragRef.current = onRemoteLiveDrag;
  const onSwitchToWorkflowRef = useRef(onSwitchToWorkflow);
  onSwitchToWorkflowRef.current = onSwitchToWorkflow;

  const setIdentity = useCallback((name: string, color?: string) => {
    const clean = name.trim();
    if (!clean) return;
    setEditorNameState(clean);
    setNeedsNamePrompt(false);
    try {
      localStorage.setItem(NAME_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
    if (color) {
      setEditorColorState(color);
      try {
        localStorage.setItem(COLOR_STORAGE_KEY, color);
      } catch {
        // ignore
      }
    }
  }, []);

  const setEditorName = useCallback(
    (name: string) => {
      setEditorNameState(name);
      try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
      } catch {
        // ignore
      }
    },
    []
  );

  const updateCloudConfig = useCallback((cfg: CloudSyncConfig | null) => {
    saveCloudConfig(cfg);
    setCloudConfigState(cfg);
    setSyncError(null);
    isBootstrappedRef.current = false;
  }, []);

  // Refresh the list of saved workflows from Cloud (or localStorage fallback)
  const refreshWorkflows = useCallback(async (): Promise<SavedWorkflowRecord[]> => {
    setWorkflowsLoading(true);
    try {
      if (cloudConfig) {
        const list = await listCloudWorkflows(cloudConfig);
        setWorkflows(list);
        return list;
      }
      const localList = loadLocalWorkflows();
      setWorkflows(localList);
      return localList;
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'โหลดรายการ Workflow ไม่สำเร็จ');
      return [];
    } finally {
      setWorkflowsLoading(false);
    }
  }, [cloudConfig]);

  // Save (overwrite existing workflow) or Save As (new workflow ID)
  const saveWorkflow = useCallback(
    async (options: { id?: string; name: string; project: SandboxProject; isNew?: boolean }): Promise<SavedWorkflowRecord | null> => {
      const wfId = options.isNew || !options.id ? createWorkflowId() : options.id;
      const authorName = editorNameRef.current;
      const cleanProj: SandboxProject = {
        ...options.project,
        name: options.name.trim() || options.project.name || 'Workflow ใหม่',
        updatedAt: new Date().toISOString(),
      };

      const record: SavedWorkflowRecord = {
        id: wfId,
        name: cleanProj.name,
        author: authorName,
        updatedBy: authorName,
        updatedAt: cleanProj.updatedAt,
        project: cleanProj,
      };

      try {
        setStatus('saving');
        setSyncError(null);
        if (cloudConfig) {
          await saveCloudWorkflow(cloudConfig, {
            id: wfId,
            project: cleanProj,
            author: options.isNew ? authorName : undefined,
            updatedBy: authorName,
            clientId: clientIdRef.current,
          });
          // Notify teammates on the same workflow & lobby so everyone's workflow list updates!
          wfChannelRef.current?.send({
            type: 'broadcast',
            event: 'project-sync',
            payload: {
              clientId: clientIdRef.current,
              editorName: authorName,
              workflowId: wfId,
              project: cleanProj,
            },
          });
          lobbyChannelRef.current?.send({
            type: 'broadcast',
            event: 'workflows-changed',
            payload: { clientId: clientIdRef.current, action: 'save', workflowId: wfId, name: cleanProj.name, by: authorName },
          });
          await refreshWorkflows();
          setBackend('cloud');
          setStatus('live');
        } else {
          const prev = loadLocalWorkflows().filter((w) => w.id !== wfId);
          const next = [record, ...prev];
          saveLocalWorkflows(next);
          setWorkflows(next);
          setBackend('local');
          setStatus('live');
        }

        setLastSyncedAt(
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        return record;
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'บันทึก Workflow ไม่สำเร็จ');
        setStatus('offline');
        return null;
      }
    },
    [cloudConfig, refreshWorkflows]
  );

  // Delete a saved workflow
  const deleteWorkflow = useCallback(
    async (workflowId: string): Promise<boolean> => {
      try {
        setStatus('saving');
        if (cloudConfig) {
          await deleteCloudWorkflow(cloudConfig, workflowId);
          lobbyChannelRef.current?.send({
            type: 'broadcast',
            event: 'workflows-changed',
            payload: { clientId: clientIdRef.current, action: 'delete', workflowId, by: editorNameRef.current },
          });
          await refreshWorkflows();
          setStatus('live');
        } else {
          const next = loadLocalWorkflows().filter((w) => w.id !== workflowId);
          saveLocalWorkflows(next);
          setWorkflows(next);
          setStatus('live');
        }
        return true;
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'ลบ Workflow ไม่สำเร็จ');
        setStatus('offline');
        return false;
      }
    },
    [cloudConfig, refreshWorkflows]
  );

  // Load a specific workflow cleanly (independent per user!)
  const openWorkflow = useCallback(
    async (workflowId: string): Promise<SavedWorkflowRecord | null> => {
      try {
        if (cloudConfig) {
          const row = await fetchCloudWorkflowById(cloudConfig, workflowId);
          if (row && row.project_json?.version === '2.0') {
            const norm = normalizeImportedProject(row.project_json);
            const rec: SavedWorkflowRecord = {
              id: row.id,
              name: norm.name || row.id,
              author: row.project_json._author || row.updated_by || 'ทีมงาน',
              updatedBy: row.updated_by || 'ทีมงาน',
              updatedAt: row.updated_at || norm.updatedAt,
              project: norm,
            };
            skipNextAutoSaveRef.current = true;
            onSwitchToWorkflowRef.current(rec);
            return rec;
          }
        }
        const local = workflows.find((w) => w.id === workflowId);
        if (local) {
          skipNextAutoSaveRef.current = true;
          onSwitchToWorkflowRef.current({
            ...local,
            project: normalizeImportedProject(local.project),
          });
          return local;
        }
        return null;
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'เปิด Workflow ไม่สำเร็จ');
        return null;
      }
    },
    [cloudConfig, workflows]
  );

  // -------------------------------------------------------------------------
  // 1. Bootstrap Workflow List on Startup
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!cloudConfig) {
        setBackend('local');
        const local = loadLocalWorkflows();
        if (local.length === 0) {
          const seed: SavedWorkflowRecord = {
            id: 'floor9-main',
            name: 'Workflow หลัก (A → B → C / D)',
            author: editorNameRef.current,
            updatedBy: editorNameRef.current,
            updatedAt: new Date().toISOString(),
            project: { ...createDefaultPreset(), name: 'Workflow หลัก (A → B → C / D)' },
          };
          saveLocalWorkflows([seed]);
          setWorkflows([seed]);
        } else {
          setWorkflows(local);
        }
        isBootstrappedRef.current = true;
        setStatus('live');
        return;
      }

      setBackend('cloud');
      setStatus('connecting');
      try {
        const list = await listCloudWorkflows(cloudConfig);
        if (cancelled) return;

        if (list.length > 0) {
          setWorkflows(list);
          // Load URL-specified workflow (?wf=...) or the first/main workflow
          const params = new URLSearchParams(window.location.search);
          const requestedWfId = params.get('wf');
          const initialWf =
            (requestedWfId ? list.find((w) => w.id === requestedWfId) : null) ||
            list.find((w) => w.id === cloudConfig.roomId) ||
            list[0];

          if (initialWf) {
            skipNextAutoSaveRef.current = true;
            onSwitchToWorkflowRef.current({
              ...initialWf,
              project: normalizeImportedProject(initialWf.project),
            });
          }
        } else {
          // Seed initial main workflow on Supabase
          const initialProj = { ...projectRef.current, name: 'Workflow หลัก (A → B → C / D)' };
          await saveCloudWorkflow(cloudConfig, {
            id: cloudConfig.roomId,
            project: initialProj,
            author: editorNameRef.current,
            updatedBy: editorNameRef.current,
            clientId: clientIdRef.current,
          });
          const seededList = await listCloudWorkflows(cloudConfig);
          if (!cancelled) setWorkflows(seededList);
        }

        if (!cancelled) {
          isBootstrappedRef.current = true;
          setStatus('live');
          setLastSyncedAt(
            new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      } catch (err) {
        if (!cancelled) {
          isBootstrappedRef.current = true;
          setSyncError(err instanceof Error ? err.message : 'เชื่อมต่อ Supabase ไม่สำเร็จ');
          setStatus('offline');
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [cloudConfig]);

  // -------------------------------------------------------------------------
  // 2. Global Workspace Presence Channel (Canva-style Online Avatars + Workflow List Sync)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!cloudConfig) {
      setCollaborators([
        {
          clientId: clientIdRef.current,
          name: editorName || 'คุณ',
          color: editorColor,
          workflowId: activeWorkflowId,
          workflowName: project.name,
          joinedAt: Date.now(),
        },
      ]);
      return;
    }

    const sb = getSupabaseClient(cloudConfig);
    const channel = sb.channel('floor9-workspace-lobby', {
      config: {
        presence: { key: clientIdRef.current },
        broadcast: { self: false },
      },
    });
    lobbyChannelRef.current = channel;

    const syncPresenceList = () => {
      const state = channel.presenceState<CollaboratorPresence>();
      const list: CollaboratorPresence[] = [];
      for (const entries of Object.values(state)) {
        if (entries && entries.length > 0) {
          list.push(entries[0]);
        }
      }
      list.sort((a, b) => a.joinedAt - b.joinedAt);
      setCollaborators(list);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresenceList)
      .on('presence', { event: 'join' }, syncPresenceList)
      .on('presence', { event: 'leave' }, syncPresenceList)
      .on('broadcast', { event: 'workflows-changed' }, () => {
        refreshWorkflows();
      })
      .subscribe(async (subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setStatus('live');
          await channel.track({
            clientId: clientIdRef.current,
            name: editorNameRef.current,
            color: editorColorRef.current,
            workflowId: activeWfIdRef.current,
            workflowName: projectRef.current.name,
            joinedAt: Date.now(),
          });
        }
      });

    return () => {
      lobbyChannelRef.current = null;
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudConfig]);

  // Re-track presence whenever our name, color, or active workflow changes!
  useEffect(() => {
    const ch = lobbyChannelRef.current;
    if (!ch) return;
    ch.track({
      clientId: clientIdRef.current,
      name: editorName || 'ผู้เยี่ยมชม',
      color: editorColor,
      workflowId: activeWorkflowId,
      workflowName: project.name,
      joinedAt: Date.now(),
    });
  }, [editorName, editorColor, activeWorkflowId, project.name]);

  // -------------------------------------------------------------------------
  // 3. Per-Workflow Realtime Channel (Live Cursors + Live Selection + Live Dragging + Project Sync)
  //    Each user opens their own workflow independently; users on the SAME workflow collaborate live!
  // -------------------------------------------------------------------------
  useEffect(() => {
    setRemoteCursors({});
    if (!cloudConfig || !activeWorkflowId) return;

    const sb = getSupabaseClient(cloudConfig);
    const channelName = `floor9-wf-${activeWorkflowId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = sb.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });
    wfChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const p = payload as RemoteCursorState;
        if (!p || p.clientId === clientIdRef.current) return;
        setRemoteCursors((prev) => ({
          ...prev,
          [p.clientId]: { ...p, updatedAt: Date.now() },
        }));
        if (p.dragging) {
          skipNextAutoSaveRef.current = true;
          onRemoteLiveDragRef.current(p.dragging);
        }
      })
      .on('broadcast', { event: 'cursor-leave' }, ({ payload }) => {
        const cid = (payload as { clientId?: string })?.clientId;
        if (!cid) return;
        setRemoteCursors((prev) => {
          const copy = { ...prev };
          delete copy[cid];
          return copy;
        });
      })
      .on('broadcast', { event: 'project-sync' }, ({ payload }) => {
        const data = payload as {
          clientId?: string;
          editorName?: string;
          workflowId?: string;
          project?: SandboxProject;
        };
        if (!data || data.clientId === clientIdRef.current) return;
        if (data.workflowId !== activeWfIdRef.current) return;
        if (data.project && data.project.version === '2.0') {
          skipNextAutoSaveRef.current = true;
          setLastSyncedAt(
            new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
          onRemoteProjectRef.current(
            normalizeImportedProject(data.project),
            data.editorName || 'เพื่อนร่วมทีม',
            data.workflowId
          );
        }
      })
      .subscribe();

    // Expire stale cursors (> 10s inactive)
    const gcTimer = window.setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next: Record<string, RemoteCursorState> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.updatedAt < 10000) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 3000);

    return () => {
      window.clearInterval(gcTimer);
      channel.send({
        type: 'broadcast',
        event: 'cursor-leave',
        payload: { clientId: clientIdRef.current },
      });
      wfChannelRef.current = null;
      sb.removeChannel(channel);
    };
  }, [cloudConfig, activeWorkflowId]);

  // -------------------------------------------------------------------------
  // 4. Broadcast Local Cursor / Selection / Live Object Drag (~18 fps throttled)
  // -------------------------------------------------------------------------
  const broadcastPointer = useCallback(
    (
      x: number,
      y: number,
      dragging: RemoteCursorState['dragging'] = null,
      force = false
    ) => {
      const ch = wfChannelRef.current;
      if (!ch) return;
      const now = performance.now();
      if (!force && now - lastCursorSentMsRef.current < 55) return;
      lastCursorSentMsRef.current = now;
      ch.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          clientId: clientIdRef.current,
          name: editorNameRef.current,
          color: editorColorRef.current,
          x,
          y,
          selection: selectionRef.current,
          dragging,
          updatedAt: Date.now(),
        } satisfies RemoteCursorState,
      });
    },
    []
  );

  // Immediately broadcast selection change so teammates see the selection ring instantly
  useEffect(() => {
    const ch = wfChannelRef.current;
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        clientId: clientIdRef.current,
        name: editorNameRef.current,
        color: editorColorRef.current,
        x: -999,
        y: -999,
        selection,
        dragging: null,
        updatedAt: Date.now(),
      } satisfies RemoteCursorState,
    });
  }, [selection]);

  // -------------------------------------------------------------------------
  // 5. Auto-broadcast + persist changes to the active Workflow (debounced 450ms)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isBootstrappedRef.current || !activeWorkflowId) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      const ch = wfChannelRef.current;
      const name = editorNameRef.current;
      // Broadcast immediately to teammates on the same workflow
      ch?.send({
        type: 'broadcast',
        event: 'project-sync',
        payload: {
          clientId: clientIdRef.current,
          editorName: name,
          workflowId: activeWorkflowId,
          project,
        },
      });

      // Persist to Cloud DB (or localStorage)
      if (cloudConfig) {
        try {
          setStatus('saving');
          await saveCloudWorkflow(cloudConfig, {
            id: activeWorkflowId,
            project,
            updatedBy: name,
            clientId: clientIdRef.current,
          });
          setLastSyncedAt(
            new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
          setStatus('live');
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'บันทึกอัตโนมัติไม่สำเร็จ');
          setStatus('offline');
        }
      } else {
        const list = loadLocalWorkflows();
        const idx = list.findIndex((w) => w.id === activeWorkflowId);
        const rec: SavedWorkflowRecord = {
          id: activeWorkflowId,
          name: project.name,
          author: idx >= 0 ? list[idx].author : name,
          updatedBy: name,
          updatedAt: new Date().toISOString(),
          project,
        };
        const next = idx >= 0 ? list.map((w, i) => (i === idx ? rec : w)) : [rec, ...list];
        saveLocalWorkflows(next);
        setWorkflows(next);
      }
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [project, activeWorkflowId, cloudConfig]);

  return {
    clientId: clientIdRef.current,
    backend,
    status,
    onlineCount: Math.max(1, collaborators.length),
    collaborators,
    remoteCursors: Object.values(remoteCursors),
    lastSyncedAt,
    syncError,
    editorName,
    editorColor,
    needsNamePrompt,
    setIdentity,
    setEditorName,
    cloudConfig,
    setCloudConfig: updateCloudConfig,
    workflows,
    workflowsLoading,
    refreshWorkflows,
    saveWorkflow,
    deleteWorkflow,
    openWorkflow,
    broadcastPointer,
  };
}
