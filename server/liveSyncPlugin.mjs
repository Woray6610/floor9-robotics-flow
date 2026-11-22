import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight Live Shared Sync Plugin for Floor 9 System Flow Sandbox.
 * Runs directly inside Vite Dev & Preview server — zero external DB or extra ports needed!
 * - Persists the shared project state to `data/shared-layout.json`
 * - Broadcasts real-time updates + online user count to all connected clients via SSE (`/api/events`)
 * - Accepts updates via `POST /api/project` with sender clientId so the sender doesn't overwrite itself
 */
export function liveSyncPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dataFile = path.join(dataDir, 'shared-layout.json');
  const clients = new Map();

  let latestRevision = 0;
  let cachedProjectJson = null;

  function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  function loadInitialProject() {
    if (cachedProjectJson !== null) return cachedProjectJson;
    try {
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        JSON.parse(raw);
        cachedProjectJson = raw;
        return raw;
      }
    } catch {
      // Ignore corrupt file; client will seed from Preset 1
    }
    return null;
  }

  function broadcastEvent(eventName, payload, excludeClientId) {
    const dataStr = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [id, client] of clients.entries()) {
      if (excludeClientId && id === excludeClientId) continue;
      try {
        client.res.write(dataStr);
      } catch {
        clients.delete(id);
      }
    }
  }

  function broadcastPresence() {
    broadcastEvent('presence', {
      onlineCount: clients.size,
      revision: latestRevision,
    });
  }

  function readRequestBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalBytes = 0;
      const MAX_BYTES = 5 * 1024 * 1024;
      req.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_BYTES) {
          reject(new Error('Payload too large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      req.on('error', reject);
    });
  }

  function attachMiddleware(middlewares) {
    middlewares.use(async (req, res, next) => {
      const url = req.url ?? '';

      // 1. GET /api/project -> returns current shared layout + revision + onlineCount
      if (req.method === 'GET' && url.startsWith('/api/project')) {
        const raw = loadInitialProject();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify({
            revision: latestRevision,
            onlineCount: clients.size,
            project: raw ? JSON.parse(raw) : null,
          })
        );
        return;
      }

      // 2. POST /api/project -> saves shared layout and broadcasts to all other connected browsers
      if (req.method === 'POST' && url.startsWith('/api/project')) {
        try {
          const bodyText = await readRequestBody(req);
          const parsed = JSON.parse(bodyText);
          if (!parsed.project || typeof parsed.project !== 'object') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing project payload' }));
            return;
          }

          ensureDataDir();
          const projectStr = JSON.stringify(parsed.project, null, 2);
          fs.writeFileSync(dataFile, projectStr, 'utf-8');
          cachedProjectJson = projectStr;
          latestRevision += 1;

          broadcastEvent(
            'project-update',
            {
              revision: latestRevision,
              clientId: parsed.clientId ?? 'unknown',
              editorName: parsed.editorName ?? 'เพื่อนร่วมทีม',
              project: parsed.project,
            },
            parsed.clientId
          );

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              ok: true,
              revision: latestRevision,
              onlineCount: clients.size,
            })
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
        return;
      }

      // 3. GET /api/events -> SSE real-time stream
      if (req.method === 'GET' && url.startsWith('/api/events')) {
        const queryIdx = url.indexOf('?');
        const params = new URLSearchParams(queryIdx >= 0 ? url.slice(queryIdx + 1) : '');
        const clientId =
          params.get('clientId') || `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        res.write(`event: connected\ndata: ${JSON.stringify({ clientId, revision: latestRevision })}\n\n`);

        clients.set(clientId, { id: clientId, res });
        broadcastPresence();

        const heartbeat = setInterval(() => {
          try {
            res.write(`: ping\n\n`);
          } catch {
            clearInterval(heartbeat);
            clients.delete(clientId);
          }
        }, 20000);

        req.on('close', () => {
          clearInterval(heartbeat);
          clients.delete(clientId);
          broadcastPresence();
        });
        return;
      }

      next();
    });
  }

  return {
    name: 'floor9-live-sync',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}
