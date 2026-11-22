import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloudSyncConfig,
  fetchCloudRoom,
  loadCloudConfig,
  saveCloudConfig,
  upsertCloudRoom,
} from './cloudSync';
import { SandboxProject } from './types';

export type SyncStatus = 'connecting' | 'live' | 'saving' | 'offline';
export type SyncBackend = 'cloud' | 'local' | 'offline';

interface UseLiveSyncOptions {
  project: SandboxProject;
  onRemoteProject: (remote: SandboxProject, editorName: string) => void;
}

function getOrCreateClientId(): string {
  const key = 'floor9-sandbox-client-id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useLiveSync({ project, onRemoteProject }: UseLiveSyncOptions) {
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const [cloudConfig, setCloudConfigState] = useState<CloudSyncConfig | null>(() => loadCloudConfig());
  const [backend, setBackend] = useState<SyncBackend>(cloudConfig ? 'cloud' : 'local');
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [editorName, setEditorName] = useState<string>(() => {
    return localStorage.getItem('floor9-editor-name') || 'Woray';
  });

  const isBootstrappedRef = useRef(false);
  const skipNextPushRef = useRef(false);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const onRemoteRef = useRef(onRemoteProject);
  onRemoteRef.current = onRemoteProject;
  const projectRef = useRef(project);
  projectRef.current = project;

  const updateEditorName = useCallback((name: string) => {
    setEditorName(name);
    try {
      localStorage.setItem('floor9-editor-name', name);
    } catch {
      // ignore
    }
  }, []);

  const updateCloudConfig = useCallback((cfg: CloudSyncConfig | null) => {
    saveCloudConfig(cfg);
    setCloudConfigState(cfg);
    setSyncError(null);
    isBootstrappedRef.current = false;
    lastRemoteUpdatedAtRef.current = null;
  }, []);

  // Push current project to whichever backend is active (Cloud Supabase or Local Vite Server)
  const pushProject = useCallback(
    async (proj: SandboxProject) => {
      const name = editorName.trim() || 'ทีมงาน';

      if (cloudConfig) {
        try {
          setStatus('saving');
          setSyncError(null);
          await upsertCloudRoom(cloudConfig, {
            project: proj,
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
          setBackend('cloud');
          setStatus('live');
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'เชื่อมต่อ Supabase ไม่สำเร็จ');
          setStatus('offline');
        }
        return;
      }

      // Local Vite Live Sync Server fallback
      try {
        setStatus('saving');
        setSyncError(null);
        const res = await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientIdRef.current,
            editorName: name,
            project: proj,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { onlineCount?: number };
        if (typeof data.onlineCount === 'number') {
          setOnlineCount(Math.max(1, data.onlineCount));
        }
        setLastSyncedAt(
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setBackend('local');
        setStatus('live');
      } catch {
        setBackend('offline');
        setStatus('offline');
      }
    },
    [cloudConfig, editorName]
  );

  // 1. Bootstrap & Subscribe (switches cleanly when cloudConfig changes)
  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: number | null = null;

    async function initCloud(cfg: CloudSyncConfig) {
      setBackend('cloud');
      setStatus('connecting');
      setSyncError(null);

      try {
        const row = await fetchCloudRoom(cfg);
        if (cancelled) return;

        if (row && row.project_json && row.project_json.version === '2.0') {
          lastRemoteUpdatedAtRef.current = row.updated_at;
          skipNextPushRef.current = true;
          onRemoteRef.current(row.project_json, 'Cloud 24/7');
        } else {
          await upsertCloudRoom(cfg, {
            project: projectRef.current,
            updatedBy: editorName.trim() || 'Woray',
            clientId: clientIdRef.current,
          });
        }

        isBootstrappedRef.current = true;
        setStatus('live');
        setLastSyncedAt(
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (err) {
        if (!cancelled) {
          isBootstrappedRef.current = true;
          setSyncError(err instanceof Error ? err.message : 'เชื่อมต่อ Cloud ไม่สำเร็จ');
          setStatus('offline');
        }
        return;
      }

      // Lightweight 2.5s cloud polling for live teammate sync (works on any static host, zero WebSocket/firewall issues)
      pollTimer = window.setInterval(async () => {
        if (cancelled) return;
        try {
          const row = await fetchCloudRoom(cfg);
          if (cancelled || !row) return;
          if (
            row.updated_at &&
            row.updated_at !== lastRemoteUpdatedAtRef.current &&
            row.client_id !== clientIdRef.current &&
            row.project_json?.version === '2.0'
          ) {
            lastRemoteUpdatedAtRef.current = row.updated_at;
            skipNextPushRef.current = true;
            setLastSyncedAt(
              new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
            onRemoteRef.current(row.project_json, row.updated_by || 'เพื่อนร่วมทีม (Cloud)');
          }
          setStatus('live');
          setSyncError(null);
        } catch {
          if (!cancelled) setStatus('connecting');
        }
      }, 2500);
    }

    async function initLocal() {
      setBackend('local');
      setStatus('connecting');
      setSyncError(null);

      try {
        const res = await fetch('/api/project', { cache: 'no-store' });
        if (!res.ok) throw new Error('Local API unavailable');
        const data = (await res.json()) as {
          project: SandboxProject | null;
          onlineCount?: number;
        };
        if (cancelled) return;

        if (typeof data.onlineCount === 'number') {
          setOnlineCount(Math.max(1, data.onlineCount));
        }

        if (data.project && data.project.version === '2.0') {
          skipNextPushRef.current = true;
          onRemoteRef.current(data.project, 'เซิร์ฟเวอร์กลาง');
        } else {
          await pushProject(projectRef.current);
        }
        isBootstrappedRef.current = true;
        setStatus('live');
      } catch {
        if (!cancelled) {
          isBootstrappedRef.current = true;
          setBackend('offline');
          setStatus('offline');
        }
        return;
      }

      if (cancelled) return;

      try {
        es = new EventSource(`/api/events?clientId=${encodeURIComponent(clientIdRef.current)}`);

        es.addEventListener('connected', () => {
          if (!cancelled) setStatus('live');
        });

        es.addEventListener('presence', (evt) => {
          try {
            const payload = JSON.parse((evt as MessageEvent).data) as { onlineCount?: number };
            if (!cancelled && typeof payload.onlineCount === 'number') {
              setOnlineCount(Math.max(1, payload.onlineCount));
            }
          } catch {
            // ignore
          }
        });

        es.addEventListener('project-update', (evt) => {
          try {
            const payload = JSON.parse((evt as MessageEvent).data) as {
              clientId?: string;
              editorName?: string;
              project?: SandboxProject;
            };
            if (payload.clientId === clientIdRef.current) return;
            if (payload.project && payload.project.version === '2.0') {
              skipNextPushRef.current = true;
              setLastSyncedAt(
                new Date().toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
              onRemoteRef.current(payload.project, payload.editorName || 'เพื่อนร่วมทีม');
            }
          } catch {
            // ignore
          }
        });

        es.onerror = () => {
          if (!cancelled) setStatus('connecting');
        };
      } catch {
        if (!cancelled) setStatus('offline');
      }
    }

    if (cloudConfig) {
      initCloud(cloudConfig);
    } else {
      initLocal();
    }

    return () => {
      cancelled = true;
      if (es) es.close();
      if (pollTimer) window.clearInterval(pollTimer);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudConfig]);

  // 2. Auto-push local edits to active backend (debounced)
  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (pushTimerRef.current) {
      window.clearTimeout(pushTimerRef.current);
    }
    pushTimerRef.current = window.setTimeout(() => {
      pushProject(project);
    }, 300);

    return () => {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [project, pushProject]);

  return {
    backend,
    status,
    onlineCount,
    lastSyncedAt,
    syncError,
    editorName,
    setEditorName: updateEditorName,
    cloudConfig,
    setCloudConfig: updateCloudConfig,
  };
}
