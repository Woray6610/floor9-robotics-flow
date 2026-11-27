import { KITTING_RECIPES } from './presets';
import {
  KittingPartType,
  RoutePoint,
  SandboxProject,
  SimConvoyVisual,
  SimKittingPart,
  SimKittingState,
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
 * Compute total length of a 2D polyline in map px
 */
export function getPolylineLength2D(pts: RoutePoint[]): number {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return total;
}

/**
 * Sample a 2D polyline at an exact arc-length distance `dist` from the start.
 * If `dist < 0`, extends straight backward behind the start tangent so followers can queue cleanly
 * behind the leader before entering the route without overlapping!
 */
export function samplePolylineAtDistance2D(
  pts: RoutePoint[],
  dist: number
): { x: number; y: number; angle: number } {
  if (pts.length === 0) return { x: 0, y: 0, angle: 0 };
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    total += l;
  }

  if (total < 1e-4) return { x: pts[0].x, y: pts[0].y, angle: 0 };

  // Extend straight behind start tangent if follower hasn't passed start point yet
  if (dist < 0) {
    const firstLen = segLens[0] || 1;
    const dx = (pts[1].x - pts[0].x) / firstLen;
    const dy = (pts[1].y - pts[0].y) / firstLen;
    const angle = Math.atan2(dy, dx);
    return {
      x: pts[0].x + dx * dist,
      y: pts[0].y + dy * dist,
      angle,
    };
  }

  const clampedDist = Math.min(total, dist);
  let accum = 0;
  for (let i = 0; i < segLens.length; i++) {
    const l = segLens[i];
    if (accum + l >= clampedDist || i === segLens.length - 1) {
      const localT = l > 1e-4 ? (clampedDist - accum) / l : 0;
      const x = lerp(pts[i].x, pts[i + 1].x, localT);
      const y = lerp(pts[i].y, pts[i + 1].y, localT);
      const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      return { x, y, angle };
    }
    accum += l;
  }

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  return {
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x),
  };
}

/**
 * Sample a 2D polyline at normalized progress [0..1]
 */
export function samplePolyline2D(
  pts: RoutePoint[],
  progress: number
): { x: number; y: number; angle: number } {
  const total = getPolylineLength2D(pts);
  return samplePolylineAtDistance2D(pts, Math.max(0, Math.min(1, progress)) * total);
}

/**
 * Compute total duration of the active simulation.
 * In kitting mode when fault === 'missingS3', simulation halts at Station A right after QC step
 * so no AMR transport executes.
 */
export function getTotalDuration(project: SandboxProject, mode: SimulationMode): number {
  if (mode === 'modeB') {
    return 16; // Smooth 16s loop for Mode B quick route preview
  }

  const isMissingS3 = Boolean(project.kitting?.enabled && project.kitting.fault === 'missingS3');
  if (isMissingS3) {
    let sum = 0;
    for (const s of project.steps) {
      sum += Math.max(0.5, s.duration);
      if (s.action === 'qc-inspect') {
        // Hold briefly after QC so the red QC HOLD state is clearly visible at A
        return Math.max(1, sum + 1.5);
      }
    }
  }

  const sum = project.steps.reduce((acc, s) => acc + Math.max(0.5, s.duration), 0);
  return Math.max(1, sum);
}

// Local 2D slot offsets inside the compact tray graphic (relative to tray center)
const TRAY_SLOT_OFFSETS: Record<'S1' | 'S2' | 'S3', { dx: number; dy: number }> = {
  S1: { dx: -4.2, dy: 0 },
  S2: { dx: 0, dy: 0 },
  S3: { dx: 4.2, dy: 0 },
};

// Feed nest part offsets around station F (2 rings on left column, 2 blocks on right column)
const FEED_PART_OFFSETS: Record<string, { dx: number; dy: number; type: KittingPartType }> = {
  'ring-0': { dx: -5.5, dy: -4.5, type: 'ring' },
  'ring-1': { dx: -5.5, dy: 4.5, type: 'ring' },
  'block-0': { dx: 5.5, dy: -4.5, type: 'block' },
  'block-1': { dx: 5.5, dy: 4.5, type: 'block' },
};

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
      armEndX: r.kind === 'amr-ur' ? r.x + Math.cos(r.angle) * 8 : undefined,
      armEndY: r.kind === 'amr-ur' ? r.y + Math.sin(r.angle) * 8 : undefined,
      armHoldingObjectId: null,
    };
  }

  const stationURs: Record<string, SimStationURState> = {};
  for (const ur of project.stationURs) {
    stationURs[ur.id] = {
      id: ur.id,
      x: ur.x,
      y: ur.y,
      armEndX: ur.x + 9,
      armEndY: ur.y - 5,
      status: 'สแตนด์บาย',
      holdingObjectId: null,
      holdingPartType: null,
    };
  }

  const kittingCfg = project.kitting?.enabled ? project.kitting : undefined;

  const objects: Record<string, SimObjectState> = {};
  for (const obj of project.objects) {
    const st = obj.initialStationId
      ? project.stations.find((s) => s.id === obj.initialStationId)
      : undefined;
    const isTray = Boolean(obj.isKittingTray || (kittingCfg && obj.id === kittingCfg.trayObjectId));
    objects[obj.id] = {
      id: obj.id,
      name: obj.name,
      color: obj.color,
      x: st ? st.x : obj.x,
      y: st ? st.y : obj.y,
      angle: 0,
      holderType: st ? 'station' : 'free',
      holderLabel: st ? `สถานี ${st.code}` : 'วางอิสระ',
      isKittingTray: isTray,
      traySlots: isTray ? { S1: null, S2: null, S3: null } : undefined,
    };
  }

  // Prepare Kitting runtime state if enabled
  let kittingState: SimKittingState | undefined;
  const feedStation = kittingCfg
    ? project.stations.find((s) => s.id === kittingCfg.feedStationId)
    : undefined;
  const trayStation = kittingCfg
    ? project.stations.find((s) => s.id === kittingCfg.trayStationId)
    : undefined;

  if (kittingCfg && feedStation && trayStation) {
    const recipeDef = KITTING_RECIPES[kittingCfg.order];
    const initialParts: SimKittingPart[] = Object.entries(FEED_PART_OFFSETS).map(([id, off]) => ({
      id,
      type: off.type,
      location: 'feed',
      x: feedStation.x + off.dx,
      y: feedStation.y + off.dy,
    }));

    kittingState = {
      enabled: true,
      order: kittingCfg.order,
      fault: kittingCfg.fault,
      recipe: { S1: recipeDef.S1, S2: recipeDef.S2, S3: recipeDef.S3 },
      actualSlots: { S1: null, S2: null, S3: null },
      parts: initialParts,
      qcStatus: 'pending',
      qcBadgeText: 'รอจัดชุดและตรวจ QC',
      showQcFrame: false,
      scanProgress: 0,
      missingSlots: [],
      trayObjectId: kittingCfg.trayObjectId,
      cameraAssetId: kittingCfg.cameraAssetId,
    };
  }

  // ==================== MODE B: QUICK FREE-LOOP ROUTE PREVIEW ====================
  if (mode === 'modeB') {
    for (const r of project.robots) {
      const route = project.routes.find((rt) => rt.robotId === r.id && rt.points.length >= 2);
      if (!route) continue;
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
        robots[r.id].armEndX = s.x + Math.cos(s.angle) * 8;
        robots[r.id].armEndY = s.y + Math.sin(s.angle) * 8;
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
      kitting: kittingState,
    };
  }

  // ==================== MODE A: STEP-BY-STEP SYSTEM FLOW ====================
  let activeStepIndex = 0;
  let activeStepTitle = project.steps.length > 0 ? project.steps[0].title : 'ยังไม่มี Step งาน';
  let cursor = 0;
  let qcHaltedFlow = false;
  let activeConvoy: SimConvoyVisual | undefined;

  for (let i = 0; i < project.steps.length; i++) {
    const step = project.steps[i];
    const dur = Math.max(0.5, step.duration);
    const stepStart = cursor;
    const stepEnd = cursor + dur;
    cursor = stepEnd;

    if (qcHaltedFlow) {
      break;
    }

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
    if (step.action === 'ur-kit' && kittingState && kittingCfg && feedStation && trayStation) {
      const urId = step.urId || kittingCfg.urId;
      const urState = stationURs[urId];
      const trayObj = objects[step.objectId || kittingCfg.trayObjectId];
      const homeX = urState ? urState.x - 7 : 0;
      const homeY = urState ? urState.y + 6 : 0;

      // Build deterministic pick plan for S1, S2, S3 from recipe
      let ringIdx = 0;
      let blockIdx = 0;
      const slotPlan = (['S1', 'S2', 'S3'] as const).map((slotId, idx) => {
        const partType = kittingState!.recipe[slotId];
        const partId = partType === 'ring' ? `ring-${ringIdx++}` : `block-${blockIdx++}`;
        const skipped = kittingCfg.fault === 'missingS3' && slotId === 'S3';
        return {
          slotId,
          partType,
          partId,
          skipped,
          subStart: idx / 3,
          subEnd: (idx + 1) / 3,
        };
      });

      const trayX = trayObj ? trayObj.x : trayStation.x;
      const trayY = trayObj ? trayObj.y : trayStation.y;

      if (urState) {
        urState.armEndX = homeX;
        urState.armEndY = homeY;
        urState.holdingPartType = null;
        if (isActive) {
          urState.status = `UR-A กำลังจัดชุดออเดอร์ ${kittingCfg.order}`;
        }
      }

      for (const job of slotPlan) {
        const part = kittingState.parts.find((pt) => pt.id === job.partId);
        if (!part) continue;
        const feedOff = FEED_PART_OFFSETS[job.partId];
        const feedX = feedStation.x + feedOff.dx;
        const feedY = feedStation.y + feedOff.dy;
        const slotOff = TRAY_SLOT_OFFSETS[job.slotId];
        const destX = trayX + slotOff.dx;
        const destY = trayY + slotOff.dy;

        if (job.skipped) {
          part.location = 'feed';
          part.slotId = undefined;
          part.x = feedX;
          part.y = feedY;
          continue;
        }

        if (isCompleted || p >= job.subEnd) {
          part.location = 'tray';
          part.slotId = job.slotId;
          part.x = destX;
          part.y = destY;
          kittingState.actualSlots[job.slotId] = job.partType;
        } else if (p >= job.subStart) {
          const lp = (p - job.subStart) / (job.subEnd - job.subStart);
          if (lp < 0.3) {
            const k = smoothstep(lp / 0.3);
            if (urState) {
              urState.armEndX = lerp(homeX, feedX, k);
              urState.armEndY = lerp(homeY, feedY, k);
              urState.holdingPartType = null;
            }
            part.location = 'feed';
            part.x = feedX;
            part.y = feedY;
          } else if (lp < 0.78) {
            const k = smoothstep((lp - 0.3) / 0.48);
            const cx = lerp(feedX, destX, k);
            const cy = lerp(feedY, destY, k);
            if (urState) {
              urState.armEndX = cx;
              urState.armEndY = cy;
              urState.holdingPartType = job.partType;
            }
            part.location = 'ur';
            part.x = cx;
            part.y = cy;
          } else {
            const k = smoothstep((lp - 0.78) / 0.22);
            if (urState) {
              urState.armEndX = lerp(destX, homeX, k);
              urState.armEndY = lerp(destY, homeY, k);
              urState.holdingPartType = null;
            }
            part.location = 'tray';
            part.slotId = job.slotId;
            part.x = destX;
            part.y = destY;
            kittingState.actualSlots[job.slotId] = job.partType;
          }
        }
      }

      // Sync traySlots onto the tray object
      if (trayObj) {
        trayObj.traySlots = { ...kittingState.actualSlots };
      }
    } else if (step.action === 'qc-inspect' && kittingState) {
      // Evaluate simulated QC purely from ACTUAL slot contents vs selected recipe!
      const missing: ('S1' | 'S2' | 'S3')[] = [];
      let mismatch = false;
      for (const slotId of ['S1', 'S2', 'S3'] as const) {
        const actual = kittingState.actualSlots[slotId];
        if (actual === null) {
          missing.push(slotId);
        } else if (actual !== kittingState.recipe[slotId]) {
          mismatch = true;
        }
      }

      const passed = missing.length === 0 && !mismatch;
      kittingState.missingSlots = missing;

      if (isActive) {
        kittingState.qcStatus = 'inspecting';
        kittingState.showQcFrame = true;
        kittingState.scanProgress = p;
        kittingState.qcBadgeText = 'กำลังตรวจจำลอง S1–S3...';
      } else if (isCompleted) {
        kittingState.scanProgress = 1;
        if (passed) {
          kittingState.qcStatus = 'pass';
          kittingState.showQcFrame = true;
          kittingState.qcBadgeText = 'QC ผ่าน (ตรวจจำลอง)';
          kittingState.qcReason = `ออเดอร์ ${kittingState.order} ครบ 3 ช่องตามสูตร`;
        } else {
          kittingState.qcStatus = 'hold';
          kittingState.showQcFrame = true;
          const missLabel = missing.length > 0 ? `ขาด ${missing.join(', ')}` : 'ชิ้นส่วนไม่ตรงสูตร';
          kittingState.qcBadgeText = `QC ค้าง • ${missLabel}`;
          kittingState.qcReason = `ตรวจจำลองพบ${missLabel} — หยุดถาดไว้ที่ A ไม่ส่งต่อ AMR`;
          activeStepIndex = i;
          activeStepTitle = `${kittingState.qcBadgeText} — ค้างถาดไว้ที่จุด A`;
          qcHaltedFlow = true; // Stop all subsequent AMR pick/move steps!
        }
      }
    } else if (step.action === 'move' && step.robotId && step.routeId) {
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
          rState.armEndX = sampled.x + Math.cos(sampled.angle) * 8;
          rState.armEndY = sampled.y + Math.sin(sampled.angle) * 8;
        }
        if (isActive) {
          rState.status = step.title;
        }
        // Any object/tray currently carried by this AMR rides on its deck!
        if (rState.carryingObjectId && objects[rState.carryingObjectId]) {
          const obj = objects[rState.carryingObjectId];
          obj.x = rState.x;
          obj.y = rState.y;
          obj.angle = rState.angle;
          obj.holderType = 'amr';
          obj.holderLabel = `บนหลังรถ ${rMeta?.name ?? rState.id}`;
        }
      }
    } else if (step.action === 'convoy-move' && step.routeId) {
      // Single-lane platoon / convoy: ordered AMRs follow the exact same polyline with safe arc-length spacing!
      const rawIds =
        step.convoyRobotIds && step.convoyRobotIds.length > 0
          ? step.convoyRobotIds
          : [step.robotId, step.targetRobotId].filter((id): id is string => Boolean(id));
      const convoyIds = Array.from(new Set(rawIds)).filter((id) => Boolean(robots[id]));
      const route = project.routes.find((rt) => rt.id === step.routeId);
      const spacing = Math.max(16, step.convoySpacing ?? 24);

      if (convoyIds.length > 0 && route && route.points.length >= 2) {
        const pts = step.reverseRoute ? [...route.points].reverse() : route.points;
        const routeLen = getPolylineLength2D(pts);
        const leadDist = smoothstep(p) * routeLen;

        convoyIds.forEach((rid, idx) => {
          const rState = robots[rid];
          const rMeta = project.robots.find((rm) => rm.id === rid);
          if (!rState) return;

          // Leader travels 0 -> routeLen; follower k trails behind by k * spacing
          // At arrival (p=1), leader stops at route end and followers park in single-file behind it!
          const memberDist = leadDist - idx * spacing;
          const sampled = samplePolylineAtDistance2D(pts, memberDist);

          rState.x = sampled.x;
          rState.y = sampled.y;
          rState.angle = sampled.angle;
          if (rMeta?.kind === 'amr-ur') {
            rState.armEndX = sampled.x + Math.cos(sampled.angle) * 8;
            rState.armEndY = sampled.y + Math.sin(sampled.angle) * 8;
          }
          if (isActive) {
            rState.status =
              idx === 0
                ? `ขบวน #1 (คันนำ): ${step.title}`
                : `ขบวน #${idx + 1} (ตามหลัง): ${step.title}`;
          }

          if (rState.carryingObjectId && objects[rState.carryingObjectId]) {
            const obj = objects[rState.carryingObjectId];
            obj.x = rState.x;
            obj.y = rState.y;
            obj.angle = rState.angle;
            obj.holderType = 'amr';
            obj.holderLabel = `บนหลังรถ ${rMeta?.name ?? rState.id}`;
          }
        });

        if (isActive || isCompleted) {
          activeConvoy = {
            stepId: step.id,
            robotIds: convoyIds,
            color: route.color || '#38bdf8',
            active: isActive,
            spacing,
          };
        }
      }
    } else if (step.action === 'pick-station' && step.robotId && step.stationId) {
      const rState = robots[step.robotId];
      const rMeta = project.robots.find((rm) => rm.id === step.robotId);
      const station = project.stations.find((s) => s.id === step.stationId);
      const obj = step.objectId ? objects[step.objectId] : undefined;

      if (rState && station) {
        if (isActive) rState.status = step.title;
        const restX = rState.x + Math.cos(rState.angle) * 8;
        const restY = rState.y + Math.sin(rState.angle) * 8;

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
        const restX = fromR.x + Math.cos(fromR.angle) * 8;
        const restY = fromR.y + Math.sin(fromR.angle) * 8;

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
        const homeX = urState.x + 9;
        const homeY = urState.y - 5;

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

  // Keep tray-seated parts synced tightly with the tray's live coordinates & hide QC frame once tray leaves Station A
  if (kittingState && trayStation) {
    const trayObj = objects[kittingState.trayObjectId];
    if (trayObj) {
      const trayStillAtA =
        trayObj.holderType === 'station' &&
        Math.hypot(trayObj.x - trayStation.x, trayObj.y - trayStation.y) < 3;
      if (!trayStillAtA) {
        kittingState.showQcFrame = false;
      }
      for (const pt of kittingState.parts) {
        if (pt.location === 'tray' && pt.slotId) {
          const off = TRAY_SLOT_OFFSETS[pt.slotId];
          pt.x = trayObj.x + off.dx;
          pt.y = trayObj.y + off.dy;
        }
      }
      trayObj.traySlots = { ...kittingState.actualSlots };
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
    kitting: kittingState,
    activeConvoy,
  };
}
