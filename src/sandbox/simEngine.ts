import {
  RoutePoint,
  SandboxProject,
  SimObjectState,
  SimRobotState,
  SimStationURState,
  SimulationFrame,
  SimulationMode,
} from './types';

function lerp(a: number, b: number, t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return a + (b - a) * c;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Sample a 2D polyline at normalized progress [0..1]
 */
export function samplePolyline2D(
  pts: RoutePoint[],
  progress: number
): { x: number; y: number; angle: number } {
  if (pts.length === 0) return { x: 0, y: 0, angle: 0 };
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };

  const clamped = Math.max(0, Math.min(1, progress));
  const segLens: number[] = [];
  let total = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    total += l;
  }

  if (total < 1e-4) return { x: pts[0].x, y: pts[0].y, angle: 0 };

  const targetDist = clamped * total;
  let accum = 0;

  for (let i = 0; i < segLens.length; i++) {
    const l = segLens[i];
    if (accum + l >= targetDist || i === segLens.length - 1) {
      const localT = l > 1e-4 ? (targetDist - accum) / l : 0;
      const x = lerp(pts[i].x, pts[i + 1].x, localT);
      const y = lerp(pts[i].y, pts[i + 1].y, localT);
      const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      return { x, y, angle };
    }
    accum += l;
  }

  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

export function getTotalDuration(project: SandboxProject, mode: SimulationMode): number {
  if (mode === 'modeB') {
    return 16; // Smooth 16s loop for Mode B quick route preview
  }
  const sum = project.steps.reduce((acc, s) => acc + Math.max(0.5, s.duration), 0);
  return Math.max(1, sum);
}

/**
 * Evaluate full deterministic 2D simulation frame at `rawTime`
 */
export function evaluateSandbox(
  project: SandboxProject,
  mode: SimulationMode,
  rawTime: number
): SimulationFrame {
  const totalDuration = getTotalDuration(project, mode);
  const time = ((rawTime % totalDuration) + totalDuration) % totalDuration;

  // Base states from layout positions
  const robots: Record<string, SimRobotState> = {};
  for (const r of project.robots) {
    robots[r.id] = {
      id: r.id,
      x: r.x,
      y: r.y,
      angle: r.angle,
      status: 'พร้อมทำงาน',
      carryingObjectId: null,
      armEndX: r.kind === 'amr-ur' ? r.x + Math.cos(r.angle) * 14 : undefined,
      armEndY: r.kind === 'amr-ur' ? r.y + Math.sin(r.angle) * 14 : undefined,
      armHoldingObjectId: null,
    };
  }

  const stationURs: Record<string, SimStationURState> = {};
  for (const ur of project.stationURs) {
    stationURs[ur.id] = {
      id: ur.id,
      x: ur.x,
      y: ur.y,
      armEndX: ur.x + 16,
      armEndY: ur.y - 8,
      status: 'สแตนด์บาย',
      holdingObjectId: null,
    };
  }

  const objects: Record<string, SimObjectState> = {};
  for (const obj of project.objects) {
    const st = obj.initialStationId
      ? project.stations.find((s) => s.id === obj.initialStationId)
      : undefined;
    objects[obj.id] = {
      id: obj.id,
      name: obj.name,
      color: obj.color,
      x: st ? st.x : obj.x,
      y: st ? st.y : obj.y,
      angle: 0,
      holderType: st ? 'station' : 'free',
      holderLabel: st ? `สถานี ${st.code}` : 'วางอิสระ',
    };
  }

  // ==================== MODE B: QUICK FREE-LOOP ROUTE PREVIEW ====================
  if (mode === 'modeB') {
    for (const r of project.robots) {
      const route = project.routes.find((rt) => rt.robotId === r.id && rt.points.length >= 2);
      if (!route) continue;
      // Ping-pong along route (0..0.5 forward, 0.5..1 backward)
      const cycle = (time / totalDuration) % 1;
      let pts = route.points;
      let localP = 0;
      let dirLabel = 'ขาไป';
      if (cycle < 0.5) {
        localP = smoothstep(cycle / 0.5);
        dirLabel = 'ขาไปตามเส้นทาง';
      } else {
        pts = [...route.points].reverse();
        localP = smoothstep((cycle - 0.5) / 0.5);
        dirLabel = 'ขากลับตามเส้นทาง';
      }
      const s = samplePolyline2D(pts, localP);
      robots[r.id].x = s.x;
      robots[r.id].y = s.y;
      robots[r.id].angle = s.angle;
      robots[r.id].status = `${dirLabel} (${route.name})`;
      if (r.kind === 'amr-ur') {
        robots[r.id].armEndX = s.x + Math.cos(s.angle) * 14;
        robots[r.id].armEndY = s.y + Math.sin(s.angle) * 14;
      }
    }

    return {
      mode,
      time,
      totalDuration,
      activeStepIndex: 0,
      activeStepTitle: 'โหมด B: วิ่งวนตามเส้นทางที่วาดไว้ (Quick Route Loop)',
      robots,
      stationURs,
      objects,
    };
  }

  // ==================== MODE A: STEP-BY-STEP SYSTEM FLOW ====================
  let activeStepIndex = 0;
  let activeStepTitle = project.steps.length > 0 ? project.steps[0].title : 'ยังไม่มี Step งาน';
  let cursor = 0;

  for (let i = 0; i < project.steps.length; i++) {
    const step = project.steps[i];
    const dur = Math.max(0.5, step.duration);
    const stepStart = cursor;
    const stepEnd = cursor + dur;
    cursor = stepEnd;

    const isCompleted = time >= stepEnd;
    const isActive = time >= stepStart && time < stepEnd;

    if (!isCompleted && !isActive) {
      break;
    }

    const p = isCompleted ? 1 : (time - stepStart) / dur;
    if (isActive) {
      activeStepIndex = i;
      activeStepTitle = step.title;
    }

    // ---- Execute Step Effect ----
    if (step.action === 'move' && step.robotId && step.routeId) {
      const rState = robots[step.robotId];
      const route = project.routes.find((rt) => rt.id === step.routeId);
      const rMeta = project.robots.find((rm) => rm.id === step.robotId);
      if (rState && route && route.points.length >= 2) {
        const pts = step.reverseRoute ? [...route.points].reverse() : route.points;
        const sampled = samplePolyline2D(pts, smoothstep(p));
        rState.x = sampled.x;
        rState.y = sampled.y;
        rState.angle = sampled.angle;
        if (rMeta?.kind === 'amr-ur') {
          rState.armEndX = sampled.x + Math.cos(sampled.angle) * 14;
          rState.armEndY = sampled.y + Math.sin(sampled.angle) * 14;
        }
        if (isActive) {
          rState.status = step.title;
        }
        // Any object currently carried by this AMR rides on its deck!
        if (rState.carryingObjectId && objects[rState.carryingObjectId]) {
          const obj = objects[rState.carryingObjectId];
          obj.x = rState.x;
          obj.y = rState.y;
          obj.angle = rState.angle;
          obj.holderType = 'amr';
          obj.holderLabel = `บนหลังรถ ${rMeta?.name ?? rState.id}`;
        }
      }
    } else if (step.action === 'pick-station' && step.robotId && step.stationId) {
      const rState = robots[step.robotId];
      const rMeta = project.robots.find((rm) => rm.id === step.robotId);
      const station = project.stations.find((s) => s.id === step.stationId);
      const obj = step.objectId ? objects[step.objectId] : undefined;

      if (rState && station) {
        if (isActive) rState.status = step.title;
        const restX = rState.x + Math.cos(rState.angle) * 14;
        const restY = rState.y + Math.sin(rState.angle) * 14;

        if (isCompleted) {
          rState.armEndX = restX;
          rState.armEndY = restY;
          rState.armHoldingObjectId = null;
          if (obj) {
            rState.carryingObjectId = obj.id;
            obj.x = rState.x;
            obj.y = rState.y;
            obj.angle = rState.angle;
            obj.holderType = 'amr';
            obj.holderLabel = `บนหลังรถ ${rMeta?.name ?? rState.id}`;
          }
        } else {
          // 0..0.35 reach to station, 0.35..0.80 carry object to AMR deck, 0.80..1.0 retract
          if (p < 0.35) {
            const k = smoothstep(p / 0.35);
            rState.armEndX = lerp(restX, station.x, k);
            rState.armEndY = lerp(restY, station.y, k);
          } else if (p < 0.8) {
            const k = smoothstep((p - 0.35) / 0.45);
            const ex = lerp(station.x, rState.x, k);
            const ey = lerp(station.y, rState.y, k);
            rState.armEndX = ex;
            rState.armEndY = ey;
            if (obj) {
              rState.armHoldingObjectId = obj.id;
              obj.x = ex;
              obj.y = ey;
              obj.holderType = 'ur-mobile';
              obj.holderLabel = `แขน UR บน ${rMeta?.name ?? ''} กำลังคีบ`;
            }
          } else {
            const k = smoothstep((p - 0.8) / 0.2);
            rState.armEndX = lerp(rState.x, restX, k);
            rState.armEndY = lerp(rState.y, restY, k);
            rState.armHoldingObjectId = null;
            if (obj) {
              rState.carryingObjectId = obj.id;
              obj.x = rState.x;
              obj.y = rState.y;
              obj.angle = rState.angle;
              obj.holderType = 'amr';
              obj.holderLabel = `บนหลังรถ ${rMeta?.name ?? ''}`;
            }
          }
        }
      }
    } else if (step.action === 'transfer-amr' && step.robotId && step.targetRobotId) {
      const fromR = robots[step.robotId];
      const toR = robots[step.targetRobotId];
      const fromMeta = project.robots.find((rm) => rm.id === step.robotId);
      const toMeta = project.robots.find((rm) => rm.id === step.targetRobotId);
      const obj = step.objectId ? objects[step.objectId] : undefined;

      if (fromR && toR) {
        if (isActive) {
          fromR.status = step.title;
          toR.status = `รับของจาก ${fromMeta?.name ?? ''}`;
        }
        const restX = fromR.x + Math.cos(fromR.angle) * 14;
        const restY = fromR.y + Math.sin(fromR.angle) * 14;

        if (isCompleted) {
          fromR.armEndX = restX;
          fromR.armEndY = restY;
          fromR.armHoldingObjectId = null;
          fromR.carryingObjectId = null;
          if (obj) {
            toR.carryingObjectId = obj.id;
            obj.x = toR.x;
            obj.y = toR.y;
            obj.angle = toR.angle;
            obj.holderType = 'amr';
            obj.holderLabel = `บนหลังรถ ${toMeta?.name ?? ''}`;
          }
        } else {
          if (p < 0.25) {
            const k = smoothstep(p / 0.25);
            fromR.armEndX = lerp(restX, fromR.x, k);
            fromR.armEndY = lerp(restY, fromR.y, k);
          } else if (p < 0.8) {
            const k = smoothstep((p - 0.25) / 0.55);
            const ex = lerp(fromR.x, toR.x, k);
            const ey = lerp(fromR.y, toR.y, k);
            fromR.armEndX = ex;
            fromR.armEndY = ey;
            fromR.carryingObjectId = null;
            if (obj) {
              fromR.armHoldingObjectId = obj.id;
              obj.x = ex;
              obj.y = ey;
              obj.holderType = 'ur-mobile';
              obj.holderLabel = `แขน UR ส่งต่อ ${fromMeta?.name ?? ''} → ${toMeta?.name ?? ''}`;
            }
          } else {
            const k = smoothstep((p - 0.8) / 0.2);
            fromR.armEndX = lerp(toR.x, restX, k);
            fromR.armEndY = lerp(toR.y, restY, k);
            fromR.armHoldingObjectId = null;
            if (obj) {
              toR.carryingObjectId = obj.id;
              obj.x = toR.x;
              obj.y = toR.y;
              obj.angle = toR.angle;
              obj.holderType = 'amr';
              obj.holderLabel = `บนหลังรถ ${toMeta?.name ?? ''}`;
            }
          }
        }
      }
    } else if (step.action === 'ur-unload' && step.urId && step.robotId && step.stationId) {
      const urState = stationURs[step.urId];
      const urMeta = project.stationURs.find((u) => u.id === step.urId);
      const rState = robots[step.robotId];
      const station = project.stations.find((s) => s.id === step.stationId);
      const obj = step.objectId ? objects[step.objectId] : undefined;

      if (urState && rState && station) {
        if (isActive) {
          urState.status = step.title;
          rState.status = `รอ ${urMeta?.name ?? 'UR'} ยกของลง`;
        }
        const homeX = urState.x + 16;
        const homeY = urState.y - 8;

        if (isCompleted) {
          urState.armEndX = homeX;
          urState.armEndY = homeY;
          urState.holdingObjectId = null;
          rState.carryingObjectId = null;
          if (obj) {
            obj.x = station.x;
            obj.y = station.y;
            obj.angle = 0;
            obj.holderType = 'station';
            obj.holderLabel = `สถานี ${station.code}`;
          }
        } else {
          if (p < 0.3) {
            const k = smoothstep(p / 0.3);
            urState.armEndX = lerp(homeX, rState.x, k);
            urState.armEndY = lerp(homeY, rState.y, k);
          } else if (p < 0.8) {
            const k = smoothstep((p - 0.3) / 0.5);
            const ex = lerp(rState.x, station.x, k);
            const ey = lerp(rState.y, station.y, k);
            urState.armEndX = ex;
            urState.armEndY = ey;
            rState.carryingObjectId = null;
            if (obj) {
              urState.holdingObjectId = obj.id;
              obj.x = ex;
              obj.y = ey;
              obj.holderType = 'ur-station';
              obj.holderLabel = `แขน ${urMeta?.name ?? 'UR'} กำลังยกลง ${station.code}`;
            }
          } else {
            const k = smoothstep((p - 0.8) / 0.2);
            urState.armEndX = lerp(station.x, homeX, k);
            urState.armEndY = lerp(station.y, homeY, k);
            urState.holdingObjectId = null;
            if (obj) {
              obj.x = station.x;
              obj.y = station.y;
              obj.angle = 0;
              obj.holderType = 'station';
              obj.holderLabel = `สถานี ${station.code}`;
            }
          }
        }
      }
    } else if (step.action === 'wait' && step.robotId && isActive) {
      const rState = robots[step.robotId];
      if (rState) rState.status = step.title;
    }
  }

  return {
    mode,
    time,
    totalDuration,
    activeStepIndex,
    activeStepTitle,
    robots,
    stationURs,
    objects,
  };
}
