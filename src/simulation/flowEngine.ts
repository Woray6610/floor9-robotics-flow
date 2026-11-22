import { DOORWAY_ANCHORS } from '../data/floor9Geometry';
import {
  AnimatedBasketPose,
  AnimatedRobotPose,
  SceneItem,
  SimulationSnapshot,
  StationUrPose,
  TimelineBlock,
} from '../types';

export const SIM_DURATION = 64; // seconds (Concept preview sample cycle)

export const PHASE_MARKERS: { time: number; title: string; summary: string }[] = [
  {
    time: 0,
    title: 'ขั้นที่ 1: M1 รับตะกร้า #1 ที่จุด A',
    summary: 'Photo Sensor ตรวจพบตะกร้า #1 ที่โต๊ะ A → แขน mobile UR บน M1 คีบวางบนหลังรถ (M2 รอที่ B, M3 รอที่จุดรอ B)',
  },
  {
    time: 8,
    title: 'ขั้นที่ 2: M1 วิ่ง A → B ตามทางเดิน',
    summary: 'M1 ขนตะกร้า #1 ออกจากประตูห้อง A ผ่านทางเดินหลักเข้าช่องจอด B1 ขนานกับ M2 ที่จุดส่งต่อ B',
  },
  {
    time: 16,
    title: 'ขั้นที่ 3: ส่งต่อตะกร้า #1 (M1 → M2 ที่จุด B)',
    summary: 'รถสองคันจอดเทียบคู่กันที่จุด B โดยเว้นทางเดินหลักไว้ → แขน mobile UR ย้ายตะกร้า #1 วางบนรถขนส่ง M2',
  },
  {
    time: 22,
    title: 'ขั้นที่ 4: M2 วิ่ง B → C | M1 กลับ A | M3 เลื่อนเข้า B',
    summary: 'M2 วิ่งส่งตะกร้า #1 ไปห้อง C, M1 วิ่งเปล่ากลับ A รับรอบถัดไป และ M3 สลับจากจุดรอ B เข้าช่อง B2',
  },
  {
    time: 32,
    title: 'ขั้นที่ 5: Station UR ยกตะกร้า #1 ลง C/D | M1 รับตะกร้า #2 ที่ A',
    summary: 'แขนประจำ C ยกตะกร้า #1 จาก M2 ลงช่องพัก D1 (หรือโต๊ะ C) พร้อมกันนั้น M1 หยิบตะกร้า #2 ที่ A',
  },
  {
    time: 40,
    title: 'ขั้นที่ 6: M2 กลับเปล่ามารอที่จุดรอ B | M1 วิ่ง A → B',
    summary: 'M2 วิ่งเปล่ากลับจาก C แต่ช่อง B2 มี M3 ใช้งานอยู่จึงจอดรอที่จุดรอ B ส่วน M1 ขนตะกร้า #2 มายัง B1',
  },
  {
    time: 46,
    title: 'ขั้นที่ 7: ส่งต่อตะกร้า #2 (M1 → M3 ที่จุด B)',
    summary: 'M1 ย้ายตะกร้า #2 ให้รถขนส่งคันที่สอง (M3 สีฟ้า) ขณะที่ M2 รอคิวอยู่จุดรอ B',
  },
  {
    time: 52,
    title: 'ขั้นที่ 8: M3 วิ่ง B → C (รอ C สั้นๆ) | M2 เข้า B2 | M1 กลับ A',
    summary: 'M3 วิ่งส่งตะกร้า #2 ไปยัง C (แวะจุดรอ C ช่วงสั้นขณะ UR จัดคิว D) → ส่งลง D2 ส่วน M2 เลื่อนเข้า B2 และ M1 กลับ A',
  },
];

export const TIMELINE_TRACKS: {
  id: string;
  label: string;
  color: string;
  blocks: TimelineBlock[];
}[] = [
  {
    id: 'm1',
    label: 'M1 (Mobile UR)',
    color: '#22c55e',
    blocks: [
      { start: 0, end: 8, type: 'pickup', label: 'รับที่ A (#1)', detail: 'mobile UR หยิบตะกร้า #1 ขึ้นรถ' },
      { start: 8, end: 16, type: 'transit', label: 'วิ่ง A→B', detail: 'M1 ขนตะกร้า #1 ไปจุดส่งต่อ B' },
      { start: 16, end: 22, type: 'transfer', label: 'ส่งให้ M2', detail: 'mobile UR ย้ายตะกร้า #1 ให้ M2' },
      { start: 22, end: 32, type: 'return', label: 'กลับ B→A', detail: 'M1 วิ่งเปล่ากลับจุด A' },
      { start: 32, end: 38, type: 'pickup', label: 'รับที่ A (#2)', detail: 'mobile UR หยิบตะกร้า #2 ขึ้นรถ' },
      { start: 38, end: 46, type: 'transit', label: 'วิ่ง A→B', detail: 'M1 ขนตะกร้า #2 ไปจุดส่งต่อ B' },
      { start: 46, end: 52, type: 'transfer', label: 'ส่งให้ M3', detail: 'mobile UR ย้ายตะกร้า #2 ให้ M3' },
      { start: 52, end: 64, type: 'return', label: 'กลับ B→A', detail: 'M1 วิ่งเปล่ากลับจุด A เตรียมรอบใหม่' },
    ],
  },
  {
    id: 'm2',
    label: 'M2 (Transport #1)',
    color: '#f97316',
    blocks: [
      { start: 0, end: 16, type: 'wait', label: 'รอรับที่ B2', detail: 'จอดรอ M1 ในช่อง B2' },
      { start: 16, end: 22, type: 'transfer', label: 'รับจาก M1', detail: 'รับตะกร้า #1 จาก M1 ที่จุด B' },
      { start: 22, end: 32, type: 'transit', label: 'วิ่ง B→C', detail: 'ขนตะกร้า #1 ไปส่งสถานี C' },
      { start: 32, end: 39, type: 'unload', label: 'ส่งลงที่ C', detail: 'Station UR ยกตะกร้า #1 ลง C/D1' },
      { start: 39, end: 47, type: 'return', label: 'กลับ C→รอ B', detail: 'วิ่งเปล่ากลับจาก C' },
      { start: 47, end: 53, type: 'wait', label: 'รอ B ว่าง', detail: 'รอจุดรอ B เพราะ M3 กำลังรับของที่ B2' },
      { start: 53, end: 57, type: 'return', label: 'เข้าช่อง B2', detail: 'เลื่อนเข้าช่อง B2 แทน M3' },
      { start: 57, end: 64, type: 'wait', label: 'รอรับที่ B2', detail: 'พร้อมรับตะกร้ารอบถัดไปที่ B2' },
    ],
  },
  {
    id: 'm3',
    label: 'M3 (Transport #2)',
    color: '#38bdf8',
    blocks: [
      { start: 0, end: 23, type: 'wait', label: 'รอ B ว่าง', detail: 'จอดรอที่จุดรอ B ระหว่าง M2 ใช้งาน B2' },
      { start: 23, end: 27, type: 'return', label: 'เข้าช่อง B2', detail: 'เลื่อนเข้าช่อง B2 สลับรอบต่อจาก M2' },
      { start: 27, end: 46, type: 'wait', label: 'รอ M1 ที่ B2', detail: 'รอ M1 นำตะกร้า #2 มาส่งต่อ' },
      { start: 46, end: 52, type: 'transfer', label: 'รับจาก M1', detail: 'รับตะกร้า #2 จาก M1 ที่จุด B' },
      { start: 52, end: 56.5, type: 'transit', label: 'วิ่ง B→รอ C', detail: 'ขนตะกร้า #2 ไปยังห้อง C' },
      { start: 56.5, end: 58.5, type: 'wait', label: 'รอ C ว่าง', detail: 'รอชั่วคราวที่จุดรอ C ระหว่าง UR จัดคิว D' },
      { start: 58.5, end: 61, type: 'transit', label: 'เข้าจุด C', detail: 'เข้าจอดเทียบที่สถานี C' },
      { start: 61, end: 64, type: 'unload', label: 'ส่งลงที่ C', detail: 'Station UR ยกตะกร้า #2 ลงช่อง D2' },
    ],
  },
  {
    id: 'ur-c',
    label: 'Station C UR',
    color: '#a855f7',
    blocks: [
      { start: 0, end: 32, type: 'idle', label: 'สแตนด์บาย', detail: 'รอรถขนส่งเข้าเทียบสถานี C' },
      { start: 32, end: 39, type: 'unload', label: 'จัดลง D1/C', detail: 'ยกตะกร้า #1 จาก M2 วางช่อง D1' },
      { start: 39, end: 55, type: 'idle', label: 'สแตนด์บาย', detail: 'พร้อมรับรอบถัดไป' },
      { start: 55, end: 58.5, type: 'transfer', label: 'จัดคิว D→C', detail: 'หยิบตะกร้า #1 จาก D1 ออกโต๊ะจ่าย C' },
      { start: 58.5, end: 61, type: 'idle', label: 'พร้อมรับ M3', detail: 'เปิดช่องให้ M3 เข้าเทียบ C' },
      { start: 61, end: 64, type: 'unload', label: 'จัดลง D2/C', detail: 'ยกตะกร้า #2 จาก M3 วางช่อง D2' },
    ],
  },
];

function lerp(a: number, b: number, t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return a + (b - a) * c;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const s = smoothstep(t);
  return [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)];
}

/**
 * Sample position and heading along a 2D polyline [x, z][] with smooth progress t in [0, 1]
 */
function samplePolyline(
  pts: [number, number][],
  progress: number
): { x: number; z: number; rotY: number } {
  const clamped = Math.max(0, Math.min(1, progress));
  if (pts.length === 0) return { x: 0, z: 0, rotY: 0 };
  if (pts.length === 1) return { x: pts[0][0], z: pts[0][1], rotY: 0 };

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dz);
    segLens.push(l);
    total += l;
  }
  if (total < 1e-5) return { x: pts[0][0], z: pts[0][1], rotY: 0 };

  const targetDist = clamped * total;
  let accum = 0;
  for (let i = 0; i < segLens.length; i++) {
    const l = segLens[i];
    if (accum + l >= targetDist || i === segLens.length - 1) {
      const localT = l > 1e-5 ? (targetDist - accum) / l : 0;
      const x = lerp(pts[i][0], pts[i + 1][0], localT);
      const z = lerp(pts[i][1], pts[i + 1][1], localT);
      const dx = pts[i + 1][0] - pts[i][0];
      const dz = pts[i + 1][1] - pts[i][1];
      const rotY = Math.atan2(dx, dz);
      return { x, z, rotY };
    }
    accum += l;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], z: last[1], rotY: 0 };
}

function getItemPos(items: SceneItem[], id: string, fallback: [number, number, number]): [number, number, number] {
  const found = items.find((it) => it.id === id);
  return found ? found.position : fallback;
}

/**
 * Compute full deterministic simulation snapshot at time `t` using live station coordinates.
 */
export function evaluateSimulation(
  rawTime: number,
  items: SceneItem[],
  showBufferD: boolean
): SimulationSnapshot {
  const t = ((rawTime % SIM_DURATION) + SIM_DURATION) % SIM_DURATION;

  const posA = getItemPos(items, 'station-a', [10.88, 0, 6.28]);
  const posB = getItemPos(items, 'station-b', [6.48, 0, -1.72]);
  const posC = getItemPos(items, 'station-c', [18.72, 0, 1.16]);
  const posD = getItemPos(items, 'station-d', [18.24, 0, 3.64]);
  const posWaitB = getItemPos(items, 'wait-b', [5.76, 0, 1.64]);
  const posWaitC = getItemPos(items, 'wait-c', [24.32, 0, -3.88]);
  const posUrC = getItemPos(items, 'ur-station-c', [18.32, 0, 1.16]);

  // Derived key docking coordinates relative to live station positions
  const dockA: [number, number] = [posA[0] + 1.45, posA[2]];
  const tableABasket: [number, number, number] = [posA[0] + 0.15, 0.94, posA[2]];

  const slotB1: [number, number] = [posB[0] + 0.68, posB[2]]; // M1 mobile-UR slot
  const slotB2: [number, number] = [posB[0] - 0.68, posB[2]]; // M2/M3 transport slot

  const dockC: [number, number] = [posC[0] + 1.25, posC[2]];
  const tableCBasket: [number, number, number] = [posC[0] - 0.55, 0.94, posC[2] - 0.55];

  // Buffer D slots (3 slots across D width)
  const slotD1: [number, number, number] = showBufferD
    ? [posD[0] - 0.62, 0.96, posD[2]]
    : [tableCBasket[0] - 0.48, 0.94, tableCBasket[2]];
  const slotD2: [number, number, number] = showBufferD
    ? [posD[0], 0.96, posD[2]]
    : [tableCBasket[0] + 0.48, 0.94, tableCBasket[2]];

  // Corridor-aware routes (A <-> B and B <-> C)
  const roomADoor = DOORWAY_ANCHORS.roomATopDoor;
  const roomACorr = DOORWAY_ANCHORS.roomATopCorridor;
  const corrJuncB: [number, number] = [slotB1[0], roomACorr[1]];
  const roomCDoor = DOORWAY_ANCHORS.roomCTopDoor;
  const roomCCorr = DOORWAY_ANCHORS.roomCTopCorridor;

  const routeAB: [number, number][] = [
    dockA,
    [roomADoor[0], Math.min(dockA[1], posA[2] - 1.2)],
    roomADoor,
    roomACorr,
    corrJuncB,
    slotB1,
  ];
  const routeBA: [number, number][] = [...routeAB].reverse();

  const routeBC: [number, number][] = [
    slotB2,
    [slotB2[0], roomACorr[1]],
    roomCCorr,
    roomCDoor,
    [roomCDoor[0], dockC[1] - 0.6],
    dockC,
  ];
  const routeBToWaitC: [number, number][] = [
    slotB2,
    [slotB2[0], roomACorr[1]],
    roomCCorr,
    [posWaitC[0], posWaitC[2]],
  ];
  const routeWaitCToC: [number, number][] = [
    [posWaitC[0], posWaitC[2]],
    roomCCorr,
    roomCDoor,
    [roomCDoor[0], dockC[1] - 0.6],
    dockC,
  ];
  const routeCToWaitB: [number, number][] = [
    dockC,
    [roomCDoor[0], dockC[1] - 0.6],
    roomCDoor,
    roomCCorr,
    [slotB2[0] - 0.35, roomACorr[1]],
    [posWaitB[0] - 0.45, posB[2] + 0.6],
    [posWaitB[0], posWaitB[2]],
  ];
  const routeWaitBToB2: [number, number][] = [
    [posWaitB[0], posWaitB[2]],
    slotB2,
  ];

  // ================= M1 (GREEN — MOBILE UR) =================
  let m1Pose: AnimatedRobotPose = {
    id: 'amr-m1',
    name: 'M1',
    color: '#22c55e',
    x: dockA[0],
    z: dockA[1],
    rotationY: Math.PI,
    action: 'pickup',
    statusText: 'รับตะกร้าที่ A',
    carryingBasketId: null,
    armTargetLocal: null,
    gripperClosed: false,
  };

  if (t < 8) {
    // Pickup Basket #1 at A
    const p = t / 8;
    const toTable: [number, number, number] = [tableABasket[0] - dockA[0], 0.55, tableABasket[2] - dockA[1]];
    const aboveTable: [number, number, number] = [toTable[0], 0.95, toTable[2]];
    const onDeck: [number, number, number] = [0, 0.56, 0.25];
    let armTarget: [number, number, number] = aboveTable;
    let closed = false;
    if (p < 0.25) {
      armTarget = lerpVec3([0, 0.85, 0], toTable, p / 0.25);
    } else if (p < 0.45) {
      armTarget = lerpVec3(toTable, aboveTable, (p - 0.25) / 0.2);
      closed = true;
    } else if (p < 0.8) {
      armTarget = lerpVec3(aboveTable, onDeck, (p - 0.45) / 0.35);
      closed = true;
    } else {
      armTarget = lerpVec3(onDeck, [0, 0.85, 0], (p - 0.8) / 0.2);
      closed = false;
    }
    m1Pose = {
      ...m1Pose,
      x: dockA[0],
      z: dockA[1],
      rotationY: Math.PI,
      action: 'pickup',
      statusText: 'กำลังคีบตะกร้า #1 ที่ A',
      carryingBasketId: p >= 0.78 ? 'basket-1' : null,
      armTargetLocal: armTarget,
      gripperClosed: closed,
    };
  } else if (t < 16) {
    const s = samplePolyline(routeAB, smoothstep((t - 8) / 8));
    m1Pose = {
      ...m1Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'transit',
      statusText: 'วิ่งส่ง A → B (#1)',
      carryingBasketId: 'basket-1',
      armTargetLocal: [0, 0.82, -0.05],
      gripperClosed: false,
    };
  } else if (t < 22) {
    // Transfer Basket #1 to M2 at B
    const p = (t - 16) / 6;
    const onOwnDeck: [number, number, number] = [0, 0.56, 0.2];
    const midLift: [number, number, number] = [-0.68, 1.05, 0];
    const onM2Deck: [number, number, number] = [slotB2[0] - slotB1[0], 0.58, slotB2[1] - slotB1[1]];
    let armTarget: [number, number, number] = onOwnDeck;
    let closed = false;
    if (p < 0.25) {
      armTarget = lerpVec3([0, 0.82, 0], onOwnDeck, p / 0.25);
    } else if (p < 0.55) {
      armTarget = lerpVec3(onOwnDeck, midLift, (p - 0.25) / 0.3);
      closed = true;
    } else if (p < 0.85) {
      armTarget = lerpVec3(midLift, onM2Deck, (p - 0.55) / 0.3);
      closed = true;
    } else {
      armTarget = lerpVec3(onM2Deck, [0, 0.85, 0], (p - 0.85) / 0.15);
      closed = false;
    }
    m1Pose = {
      ...m1Pose,
      x: slotB1[0],
      z: slotB1[1],
      rotationY: 0,
      action: 'transfer',
      statusText: 'ส่งต่อตะกร้า #1 → M2',
      carryingBasketId: p < 0.25 ? 'basket-1' : null,
      armTargetLocal: armTarget,
      gripperClosed: closed,
    };
  } else if (t < 32) {
    const s = samplePolyline(routeBA, smoothstep((t - 22) / 10));
    m1Pose = {
      ...m1Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'return',
      statusText: 'กลับเปล่า B → A',
      carryingBasketId: null,
      armTargetLocal: [0, 0.82, -0.05],
      gripperClosed: false,
    };
  } else if (t < 38) {
    // Pickup Basket #2 at A
    const p = (t - 32) / 6;
    const toTable: [number, number, number] = [tableABasket[0] - dockA[0], 0.55, tableABasket[2] - dockA[1]];
    const aboveTable: [number, number, number] = [toTable[0], 0.95, toTable[2]];
    const onDeck: [number, number, number] = [0, 0.56, 0.25];
    let armTarget: [number, number, number] = aboveTable;
    let closed = false;
    if (p < 0.25) {
      armTarget = lerpVec3([0, 0.85, 0], toTable, p / 0.25);
    } else if (p < 0.5) {
      armTarget = lerpVec3(toTable, aboveTable, (p - 0.25) / 0.25);
      closed = true;
    } else if (p < 0.82) {
      armTarget = lerpVec3(aboveTable, onDeck, (p - 0.5) / 0.32);
      closed = true;
    } else {
      armTarget = lerpVec3(onDeck, [0, 0.85, 0], (p - 0.82) / 0.18);
      closed = false;
    }
    m1Pose = {
      ...m1Pose,
      x: dockA[0],
      z: dockA[1],
      rotationY: Math.PI,
      action: 'pickup',
      statusText: 'กำลังคีบตะกร้า #2 ที่ A',
      carryingBasketId: p >= 0.8 ? 'basket-2' : null,
      armTargetLocal: armTarget,
      gripperClosed: closed,
    };
  } else if (t < 46) {
    const s = samplePolyline(routeAB, smoothstep((t - 38) / 8));
    m1Pose = {
      ...m1Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'transit',
      statusText: 'วิ่งส่ง A → B (#2)',
      carryingBasketId: 'basket-2',
      armTargetLocal: [0, 0.82, -0.05],
      gripperClosed: false,
    };
  } else if (t < 52) {
    // Transfer Basket #2 to M3 at B
    const p = (t - 46) / 6;
    const onOwnDeck: [number, number, number] = [0, 0.56, 0.2];
    const midLift: [number, number, number] = [-0.68, 1.05, 0];
    const onM3Deck: [number, number, number] = [slotB2[0] - slotB1[0], 0.58, slotB2[1] - slotB1[1]];
    let armTarget: [number, number, number] = onOwnDeck;
    let closed = false;
    if (p < 0.25) {
      armTarget = lerpVec3([0, 0.82, 0], onOwnDeck, p / 0.25);
    } else if (p < 0.55) {
      armTarget = lerpVec3(onOwnDeck, midLift, (p - 0.25) / 0.3);
      closed = true;
    } else if (p < 0.85) {
      armTarget = lerpVec3(midLift, onM3Deck, (p - 0.55) / 0.3);
      closed = true;
    } else {
      armTarget = lerpVec3(onM3Deck, [0, 0.85, 0], (p - 0.85) / 0.15);
      closed = false;
    }
    m1Pose = {
      ...m1Pose,
      x: slotB1[0],
      z: slotB1[1],
      rotationY: 0,
      action: 'transfer',
      statusText: 'ส่งต่อตะกร้า #2 → M3',
      carryingBasketId: p < 0.25 ? 'basket-2' : null,
      armTargetLocal: armTarget,
      gripperClosed: closed,
    };
  } else {
    const s = samplePolyline(routeBA, smoothstep((t - 52) / 10));
    m1Pose = {
      ...m1Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'return',
      statusText: 'กลับเปล่า B → A',
      carryingBasketId: null,
      armTargetLocal: [0, 0.82, -0.05],
      gripperClosed: false,
    };
  }

  // ================= M2 (ORANGE — TRANSPORT #1) =================
  let m2Pose: AnimatedRobotPose = {
    id: 'amr-m2',
    name: 'M2',
    color: '#f97316',
    x: slotB2[0],
    z: slotB2[1],
    rotationY: Math.PI,
    action: 'wait',
    statusText: 'รอรับตะกร้าที่ B2',
    carryingBasketId: null,
  };

  if (t < 16) {
    m2Pose = {
      ...m2Pose,
      x: slotB2[0],
      z: slotB2[1],
      rotationY: Math.PI,
      action: 'wait',
      statusText: 'พร้อมรับที่ B2',
    };
  } else if (t < 22) {
    const p = (t - 16) / 6;
    m2Pose = {
      ...m2Pose,
      x: slotB2[0],
      z: slotB2[1],
      rotationY: Math.PI,
      action: 'transfer',
      statusText: 'รับตะกร้า #1 จาก M1',
      carryingBasketId: p >= 0.82 ? 'basket-1' : null,
    };
  } else if (t < 32) {
    const s = samplePolyline(routeBC, smoothstep((t - 22) / 10));
    m2Pose = {
      ...m2Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'transit',
      statusText: 'วิ่งส่ง B → C (#1)',
      carryingBasketId: 'basket-1',
    };
  } else if (t < 39) {
    const p = (t - 32) / 7;
    m2Pose = {
      ...m2Pose,
      x: dockC[0],
      z: dockC[1],
      rotationY: 0,
      action: 'unload',
      statusText: 'รอ Station UR ยกลง C',
      carryingBasketId: p < 0.25 ? 'basket-1' : null,
    };
  } else if (t < 47) {
    const s = samplePolyline(routeCToWaitB, smoothstep((t - 39) / 8));
    m2Pose = {
      ...m2Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'return',
      statusText: 'วิ่งเปล่ากลับ C → จุดรอ B',
      carryingBasketId: null,
    };
  } else if (t < 53) {
    m2Pose = {
      ...m2Pose,
      x: posWaitB[0],
      z: posWaitB[2],
      rotationY: Math.PI,
      action: 'wait',
      statusText: 'รอจุด B ว่าง (M3 ใช้งาน)',
      waitingFor: 'Station B',
      carryingBasketId: null,
    };
  } else if (t < 57) {
    const s = samplePolyline(routeWaitBToB2, smoothstep((t - 53) / 4));
    m2Pose = {
      ...m2Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'return',
      statusText: 'เลื่อนเข้าช่อง B2',
      carryingBasketId: null,
    };
  } else {
    m2Pose = {
      ...m2Pose,
      x: slotB2[0],
      z: slotB2[1],
      rotationY: Math.PI,
      action: 'wait',
      statusText: 'พร้อมรับรอบถัดไปที่ B2',
      carryingBasketId: null,
    };
  }

  // ================= M3 (BLUE — TRANSPORT #2) =================
  let m3Pose: AnimatedRobotPose = {
    id: 'amr-m3',
    name: 'M3',
    color: '#38bdf8',
    x: posWaitB[0],
    z: posWaitB[2],
    rotationY: Math.PI,
    action: 'wait',
    statusText: 'รอคิวที่จุดรอ B',
    waitingFor: 'Station B',
    carryingBasketId: null,
  };

  if (t < 23) {
    m3Pose = {
      ...m3Pose,
      x: posWaitB[0],
      z: posWaitB[2],
      rotationY: Math.PI,
      action: 'wait',
      statusText: 'รอ B ว่าง (M2 ใช้งาน)',
      waitingFor: 'Station B',
    };
  } else if (t < 27) {
    const s = samplePolyline(routeWaitBToB2, smoothstep((t - 23) / 4));
    m3Pose = {
      ...m3Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'return',
      statusText: 'สลับเข้าช่อง B2',
      waitingFor: undefined,
    };
  } else if (t < 46) {
    m3Pose = {
      ...m3Pose,
      x: slotB2[0],
      z: slotB2[1],
      rotationY: Math.PI,
      action: 'wait',
      statusText: 'รอ M1 นำตะกร้า #2 มาส่ง',
      waitingFor: undefined,
    };
  } else if (t < 52) {
    const p = (t - 46) / 6;
    m3Pose = {
      ...m3Pose,
      x: slotB2[0],
      z: slotB2[1],
      rotationY: Math.PI,
      action: 'transfer',
      statusText: 'รับตะกร้า #2 จาก M1',
      waitingFor: undefined,
      carryingBasketId: p >= 0.82 ? 'basket-2' : null,
    };
  } else if (t < 56.5) {
    const s = samplePolyline(routeBToWaitC, smoothstep((t - 52) / 4.5));
    m3Pose = {
      ...m3Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'transit',
      statusText: 'วิ่งส่ง B → C (#2)',
      waitingFor: undefined,
      carryingBasketId: 'basket-2',
    };
  } else if (t < 58.5) {
    m3Pose = {
      ...m3Pose,
      x: posWaitC[0],
      z: posWaitC[2],
      rotationY: -Math.PI / 2,
      action: 'wait',
      statusText: 'รอสถานี C ว่าง (UR จัดคิว)',
      waitingFor: 'Station C',
      carryingBasketId: 'basket-2',
    };
  } else if (t < 61) {
    const s = samplePolyline(routeWaitCToC, smoothstep((t - 58.5) / 2.5));
    m3Pose = {
      ...m3Pose,
      x: s.x,
      z: s.z,
      rotationY: s.rotY,
      action: 'transit',
      statusText: 'เข้าจอดเทียบสถานี C',
      waitingFor: undefined,
      carryingBasketId: 'basket-2',
    };
  } else {
    const p = (t - 61) / 3;
    m3Pose = {
      ...m3Pose,
      x: dockC[0],
      z: dockC[1],
      rotationY: 0,
      action: 'unload',
      statusText: 'รอ Station UR ยกลง C/D2',
      waitingFor: undefined,
      carryingBasketId: p < 0.28 ? 'basket-2' : null,
    };
  }

  // ================= STATION C UR =================
  const urHome: [number, number, number] = [posUrC[0] + 0.35, 1.35, posUrC[2]];
  const dockCBasket: [number, number, number] = [dockC[0], 0.58, dockC[1]];
  let stationUr: StationUrPose = {
    action: 'idle',
    statusText: 'สแตนด์บายที่สถานี C',
    targetWorld: urHome,
    gripperClosed: false,
  };

  if (t >= 32 && t < 39) {
    const p = (t - 32) / 7;
    const midLift: [number, number, number] = [posUrC[0] + 0.2, 1.45, (dockC[1] + slotD1[2]) / 2];
    let target = urHome;
    let closed = false;
    if (p < 0.25) {
      target = lerpVec3(urHome, dockCBasket, p / 0.25);
    } else if (p < 0.55) {
      target = lerpVec3(dockCBasket, midLift, (p - 0.25) / 0.3);
      closed = true;
    } else if (p < 0.85) {
      target = lerpVec3(midLift, slotD1, (p - 0.55) / 0.3);
      closed = true;
    } else {
      target = lerpVec3(slotD1, urHome, (p - 0.85) / 0.15);
      closed = false;
    }
    stationUr = {
      action: 'unload',
      statusText: showBufferD ? 'ยกตะกร้า #1 → ช่องพัก D1' : 'ยกตะกร้า #1 → โต๊ะ C',
      targetWorld: target,
      gripperClosed: closed,
    };
  } else if (t >= 55 && t < 58.5 && showBufferD) {
    // Demonstrate queue dispatch from Buffer D1 -> Table C while M3 waits at Wait-C!
    const p = (t - 55) / 3.5;
    const midLift: [number, number, number] = [posUrC[0] - 0.2, 1.4, posUrC[2]];
    let target = urHome;
    let closed = false;
    if (p < 0.25) {
      target = lerpVec3(urHome, slotD1, p / 0.25);
    } else if (p < 0.55) {
      target = lerpVec3(slotD1, midLift, (p - 0.25) / 0.3);
      closed = true;
    } else if (p < 0.85) {
      target = lerpVec3(midLift, tableCBasket, (p - 0.55) / 0.3);
      closed = true;
    } else {
      target = lerpVec3(tableCBasket, urHome, (p - 0.85) / 0.15);
      closed = false;
    }
    stationUr = {
      action: 'transfer',
      statusText: 'จัดคิวหยิบ #1 จาก D1 → โต๊ะ C',
      targetWorld: target,
      gripperClosed: closed,
    };
  } else if (t >= 61) {
    const p = (t - 61) / 3;
    const midLift: [number, number, number] = [posUrC[0] + 0.15, 1.45, (dockC[1] + slotD2[2]) / 2];
    let target = urHome;
    let closed = false;
    if (p < 0.28) {
      target = lerpVec3(urHome, dockCBasket, p / 0.28);
    } else if (p < 0.62) {
      target = lerpVec3(dockCBasket, midLift, (p - 0.28) / 0.34);
      closed = true;
    } else {
      target = lerpVec3(midLift, slotD2, (p - 0.62) / 0.38);
      closed = true;
    }
    stationUr = {
      action: 'unload',
      statusText: showBufferD ? 'ยกตะกร้า #2 → ช่องพัก D2' : 'ยกตะกร้า #2 → โต๊ะ C',
      targetWorld: target,
      gripperClosed: closed,
    };
  }

  // ================= BASKETS & OWNERSHIP =================
  const baskets: AnimatedBasketPose[] = [];

  // Basket #1 trajectory
  let b1Pos: [number, number, number] = tableABasket;
  let b1Owner = 'โต๊ะจุด A (รอรับ)';
  let b1Rot = 0;

  if (t < 2) {
    b1Pos = tableABasket;
    b1Owner = 'โต๊ะจุด A (Photo Sensor ตรวจพบ)';
  } else if (t < 6.4) {
    // Carried by M1 mobile UR gripper from Table A -> M1 deck
    const gLocal = m1Pose.armTargetLocal ?? [0, 0.7, 0];
    b1Pos = [m1Pose.x + gLocal[0], gLocal[1] + 0.35, m1Pose.z + gLocal[2]];
    b1Owner = 'แขน mobile UR (M1 กำลังคีบ)';
  } else if (t < 17.5) {
    // On M1 deck
    b1Pos = [m1Pose.x, 0.56, m1Pose.z];
    b1Rot = m1Pose.rotationY;
    b1Owner = 'บนรถ M1 (กำลังวิ่ง A → B)';
  } else if (t < 21.1) {
    // Transferred by M1 mobile UR gripper -> M2 deck
    const gLocal = m1Pose.armTargetLocal ?? [0, 0.7, 0];
    b1Pos = [m1Pose.x + gLocal[0], gLocal[1] + 0.35, m1Pose.z + gLocal[2]];
    b1Owner = 'แขน mobile UR (กำลังส่งต่อ M1 → M2)';
  } else if (t < 33.75) {
    // On M2 deck
    b1Pos = [m2Pose.x, 0.56, m2Pose.z];
    b1Rot = m2Pose.rotationY;
    b1Owner = t < 32 ? 'บนรถ M2 (กำลังวิ่ง B → C)' : 'บนรถ M2 (เทียบสถานี C)';
  } else if (t < 37.95) {
    // Carried by Station C UR -> Slot D1 / Table C
    const st = stationUr.targetWorld ?? urHome;
    b1Pos = [st[0], st[1] - 0.14, st[2]];
    b1Owner = 'แขน Station C UR (กำลังวางลงช่อง D1)';
  } else if (t < 55.9 || !showBufferD) {
    b1Pos = slotD1;
    b1Owner = showBufferD ? 'ช่องพัก D1 (รอคิวจ่าย)' : 'โต๊ะรับปลายทาง C';
  } else if (t < 57.95) {
    const st = stationUr.targetWorld ?? urHome;
    b1Pos = [st[0], st[1] - 0.14, st[2]];
    b1Owner = 'แขน Station C UR (จัดคิว D1 → โต๊ะ C)';
  } else {
    b1Pos = tableCBasket;
    b1Owner = 'โต๊ะรับปลายทาง C (ส่งมอบสำเร็จ)';
  }

  baskets.push({
    id: 'basket-1',
    label: 'ตะกร้า #1',
    color: '#fbbf24',
    position: b1Pos,
    rotationY: b1Rot,
    owner: b1Owner,
  });

  // Basket #2 trajectory (arrives on Table A after Basket #1 departs, picked up at t=32)
  let b2Pos: [number, number, number] = [posA[0] - 0.42, 0.94, posA[2]];
  let b2Owner = 'คิวรอที่โต๊ะ A';
  let b2Rot = 0;

  if (t < 10) {
    b2Pos = [posA[0] - 0.42, 0.94, posA[2]];
    b2Owner = 'คิวสำรองข้างโต๊ะ A';
  } else if (t < 33.5) {
    b2Pos = tableABasket;
    b2Owner = 'โต๊ะจุด A (Photo Sensor ตรวจพบ #2)';
  } else if (t < 36.9) {
    const gLocal = m1Pose.armTargetLocal ?? [0, 0.7, 0];
    b2Pos = [m1Pose.x + gLocal[0], gLocal[1] + 0.35, m1Pose.z + gLocal[2]];
    b2Owner = 'แขน mobile UR (M1 กำลังคีบ #2)';
  } else if (t < 47.5) {
    b2Pos = [m1Pose.x, 0.56, m1Pose.z];
    b2Rot = m1Pose.rotationY;
    b2Owner = 'บนรถ M1 (กำลังวิ่ง A → B)';
  } else if (t < 51.1) {
    const gLocal = m1Pose.armTargetLocal ?? [0, 0.7, 0];
    b2Pos = [m1Pose.x + gLocal[0], gLocal[1] + 0.35, m1Pose.z + gLocal[2]];
    b2Owner = 'แขน mobile UR (กำลังส่งต่อ M1 → M3)';
  } else if (t < 61.85) {
    b2Pos = [m3Pose.x, 0.56, m3Pose.z];
    b2Rot = m3Pose.rotationY;
    b2Owner =
      t >= 56.5 && t < 58.5
        ? 'บนรถ M3 (จอดรอจุดรอ C)'
        : 'บนรถ M3 (กำลังวิ่ง B → C)';
  } else {
    const st = stationUr.targetWorld ?? slotD2;
    b2Pos = [st[0], st[1] - 0.14, st[2]];
    b2Owner = showBufferD ? 'แขน Station C UR (กำลังวางช่อง D2)' : 'แขน Station C UR (กำลังวางโต๊ะ C)';
  }

  baskets.push({
    id: 'basket-2',
    label: 'ตะกร้า #2',
    color: '#34d399',
    position: b2Pos,
    rotationY: b2Rot,
    owner: b2Owner,
  });

  // Basket #3 staged waiting at A after t=38
  baskets.push({
    id: 'basket-3',
    label: 'ตะกร้า #3',
    color: '#c084fc',
    position: t < 38 ? [posA[0] - 0.48, 0.94, posA[2] + 0.32] : tableABasket,
    rotationY: 0,
    owner: t < 38 ? 'คิวรอที่โต๊ะ A' : 'โต๊ะจุด A (พร้อมรับรอบถัดไป)',
  });

  // Find current phase marker
  let phaseIndex = 0;
  for (let i = PHASE_MARKERS.length - 1; i >= 0; i--) {
    if (t >= PHASE_MARKERS[i].time) {
      phaseIndex = i;
      break;
    }
  }

  const photoSensorTriggered = t < 2.2 || (t >= 10 && t < 33.8) || t >= 38;
  const activeWaitingB = m2Pose.waitingFor === 'Station B' || m3Pose.waitingFor === 'Station B';
  const activeWaitingC = m3Pose.waitingFor === 'Station C';

  return {
    time: t,
    duration: SIM_DURATION,
    phaseIndex,
    phaseTitle: PHASE_MARKERS[phaseIndex].title,
    phaseSummary: PHASE_MARKERS[phaseIndex].summary,
    robots: { m1: m1Pose, m2: m2Pose, m3: m3Pose },
    stationUr,
    baskets,
    photoSensorTriggered,
    activeWaitingB,
    activeWaitingC,
    routeAB,
    routeBC,
  };
}
