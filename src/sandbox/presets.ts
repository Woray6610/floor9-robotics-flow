import { KittingOrder, KittingPartType, SandboxProject } from './types';

export const MAP_WIDTH = 1024;
export const MAP_HEIGHT = 490;

export const KITTING_RECIPES: Record<
  KittingOrder,
  { S1: KittingPartType; S2: KittingPartType; S3: KittingPartType; label: string }
> = {
  A: {
    S1: 'ring',
    S2: 'block',
    S3: 'ring',
    label: 'ออเดอร์ A (แหวน – บล็อก – แหวน)',
  },
  B: {
    S1: 'block',
    S2: 'ring',
    S3: 'block',
    label: 'ออเดอร์ B (บล็อก – แหวน – บล็อก)',
  },
};

export const STATION_PALETTE = [
  '#22c55e', // Green (A)
  '#f59e0b', // Amber (B)
  '#38bdf8', // Sky (C)
  '#a855f7', // Purple (D)
  '#ec4899', // Pink (E)
  '#14b8a6', // Teal (F)
  '#f43f5e', // Rose (G)
  '#eab308', // Yellow (Wait)
];

export const ROBOT_PALETTE = [
  '#22c55e', // M1 Green
  '#f97316', // M2 Orange
  '#38bdf8', // M3 Blue
  '#a855f7', // M4 Purple
  '#ec4899', // M5 Pink
];

/**
 * Default Preset #1 — Floor 9 A -> B -> C -> D Flow
 * Coordinates aligned directly to floor9-clean-plan.png (1024 x 490)
 */
export function createDefaultPreset(): SandboxProject {
  return {
    version: '2.0',
    name: 'Floor 9 — Preset 1 (A → B → C / D)',
    updatedAt: new Date().toISOString(),
    stations: [
      {
        id: 'st-a',
        code: 'A',
        name: 'จุดรับตะกร้า A (Pickup)',
        kind: 'station',
        x: 660,
        y: 318,
        color: '#22c55e',
        note: 'โต๊ะวางตะกร้าตั้งต้นในห้อง Lab 1 พร้อม Photo Sensor',
      },
      {
        id: 'st-b',
        code: 'B',
        name: 'จุดส่งต่อ B (Transfer Bay)',
        kind: 'station',
        x: 600,
        y: 235,
        color: '#f59e0b',
        note: 'จุดจอดเทียบคู่ระหว่าง M1 (AMR+UR) และ M2/M3 (AMR ขนส่ง)',
      },
      {
        id: 'st-c',
        code: 'C',
        name: 'จุดปลายทาง C (Station C)',
        kind: 'station',
        x: 758,
        y: 268,
        color: '#38bdf8',
        note: 'จุดส่งตะกร้าปลายทางในห้อง Lab 2 ข้างแขน UR ตั้งโต๊ะ',
      },
      {
        id: 'st-d',
        code: 'D',
        name: 'ช่องพักตะกร้า D (Buffer)',
        kind: 'buffer',
        x: 758,
        y: 318,
        color: '#a855f7',
        note: 'จุดพักตะกร้าสำรอง (ปรับย้ายหรือเพิ่มช่องเองได้)',
      },
      {
        id: 'st-wait-b',
        code: 'WB',
        name: 'จุดรอ B (Wait B)',
        kind: 'wait',
        x: 590,
        y: 282,
        color: '#eab308',
        note: 'จุดรอคิวของรถขนส่ง M2/M3 เมื่อจุด B ไม่ว่าง',
      },
    ],
    robots: [
      {
        id: 'amr-m1',
        name: 'M1',
        kind: 'amr-ur',
        x: 690,
        y: 318,
        angle: Math.PI,
        color: '#22c55e',
        urReach: 28,
        note: 'AMR ติดแขน UR บนหัว (หยิบตะกร้าที่ A และส่งต่อที่ B)',
      },
      {
        id: 'amr-m2',
        name: 'M2',
        kind: 'amr',
        x: 588,
        y: 235,
        angle: -Math.PI / 2,
        color: '#f97316',
        note: 'AMR ขนส่งคันที่ 1 (รับจาก M1 ที่ B วิ่งไป C)',
      },
      {
        id: 'amr-m3',
        name: 'M3',
        kind: 'amr',
        x: 590,
        y: 282,
        angle: -Math.PI / 2,
        color: '#38bdf8',
        note: 'AMR ขนส่งคันที่ 2 (สลับคิวกับ M2)',
      },
    ],
    stationURs: [
      {
        id: 'ur-c',
        name: 'UR-C',
        x: 752,
        y: 292,
        reach: 32,
        color: '#3b82f6',
        note: 'แขน UR ตั้งโต๊ะประจำสถานี C (ยกตะกร้าจาก AMR ลงจุด C หรือ D)',
      },
    ],
    assets: [
      {
        id: 'as-photo-a',
        name: 'Photo Sensor (A)',
        kind: 'sensor',
        x: 646,
        y: 318,
        angle: 0,
        color: '#f43f5e',
        note: 'ตรวจจับตะกร้าพร้อมที่จุด A',
      },
      {
        id: 'as-cam-b',
        name: 'RealSense #1 (B)',
        kind: 'camera',
        x: 578,
        y: 205,
        angle: 0.78,
        fovDeg: 60,
        fovRange: 58,
        color: '#06b6d4',
        note: 'กล้องดูภาพจุดส่งต่อ B',
      },
      {
        id: 'as-wise-a',
        name: 'WISE-4012 (A)',
        kind: 'wise',
        x: 640,
        y: 338,
        angle: 0,
        color: '#10b981',
        note: 'I/O ไร้สายรับสัญญาณ Photo Sensor จุด A',
      },
      {
        id: 'as-router-1',
        name: 'Router #1',
        kind: 'router',
        x: 616,
        y: 192,
        angle: 0,
        color: '#8b5cf6',
        note: 'กระจายสัญญาณทางเดินหลักโซน A-B-C',
      },
    ],
    objects: [
      {
        id: 'obj-1',
        name: 'ตะกร้า #1',
        color: '#fbbf24',
        initialStationId: 'st-a',
        x: 660,
        y: 318,
      },
    ],
    routes: [
      {
        id: 'rt-m1-ab',
        name: 'M1: A → ประตูห้อง A → จุด B',
        robotId: 'amr-m1',
        color: '#22c55e',
        loop: true,
        points: [
          { x: 690, y: 318, stationId: 'st-a' },
          { x: 698, y: 215 },
          { x: 698, y: 191 },
          { x: 609, y: 191 },
          { x: 609, y: 235, stationId: 'st-b' },
        ],
      },
      {
        id: 'rt-m2-bc',
        name: 'M2: จุด B → ทางเดินบน → ห้อง C',
        robotId: 'amr-m2',
        color: '#f97316',
        loop: true,
        points: [
          { x: 588, y: 235, stationId: 'st-b' },
          { x: 588, y: 191 },
          { x: 784, y: 191 },
          { x: 784, y: 268, stationId: 'st-c' },
        ],
      },
      {
        id: 'rt-m3-loop',
        name: 'M3: จุดรอ WB → จุด B',
        robotId: 'amr-m3',
        color: '#38bdf8',
        loop: true,
        points: [
          { x: 590, y: 282, stationId: 'st-wait-b' },
          { x: 588, y: 235, stationId: 'st-b' },
        ],
      },
    ],
    steps: [
      {
        id: 'step-1',
        title: '1. M1 คีบตะกร้า #1 จากจุด A ขึ้นหลังรถ',
        action: 'pick-station',
        duration: 4,
        robotId: 'amr-m1',
        stationId: 'st-a',
        objectId: 'obj-1',
        note: 'Photo Sensor ตรวจพบตะกร้า → แขน UR บน M1 คีบวางบนหลังรถ',
      },
      {
        id: 'step-2',
        title: '2. M1 แบกตะกร้า #1 วิ่งจาก A → B',
        action: 'move',
        duration: 6,
        robotId: 'amr-m1',
        routeId: 'rt-m1-ab',
        reverseRoute: false,
      },
      {
        id: 'step-3',
        title: '3. M1 ส่งต่อตะกร้า #1 ให้ M2 ที่จุด B',
        action: 'transfer-amr',
        duration: 4.5,
        robotId: 'amr-m1',
        targetRobotId: 'amr-m2',
        objectId: 'obj-1',
        note: 'แขน UR บน M1 ย้ายตะกร้าข้ามไปวางบนหลังรถ M2',
      },
      {
        id: 'step-4',
        title: '4. M2 แบกตะกร้า #1 วิ่งจาก B → C',
        action: 'move',
        duration: 6,
        robotId: 'amr-m2',
        routeId: 'rt-m2-bc',
        reverseRoute: false,
      },
      {
        id: 'step-5',
        title: '5. UR ตั้งโต๊ะที่ C ยกตะกร้า #1 จาก M2 ลงจุด D',
        action: 'ur-unload',
        duration: 4.5,
        urId: 'ur-c',
        robotId: 'amr-m2',
        stationId: 'st-d',
        objectId: 'obj-1',
        note: 'แขน UR-C ยกตะกร้าลงช่องพัก D',
      },
      {
        id: 'step-6',
        title: '6. M1 กลับเปล่า B → A (เตรียมรอบถัดไป)',
        action: 'move',
        duration: 5,
        robotId: 'amr-m1',
        routeId: 'rt-m1-ab',
        reverseRoute: true,
      },
      {
        id: 'step-7',
        title: '7. M2 กลับเปล่า C → B (พร้อมรับรอบถัดไป)',
        action: 'move',
        duration: 5,
        robotId: 'amr-m2',
        routeId: 'rt-m2-bc',
        reverseRoute: true,
      },
    ],
  };
}

/**
 * Preset #2 — UR จัดชุด A/B + ตรวจถาด (based directly on floor9-2d-ur-kitting-qc.preset.json)
 */
export function createUrKittingQcPreset(): SandboxProject {
  return {
    version: '2.0',
    name: 'Floor 9 (2D) — UR จัดชุด A/B + ตรวจถาด',
    updatedAt: new Date().toISOString(),
    kitting: {
      enabled: true,
      order: 'A',
      fault: 'none',
      urId: 'ur-a',
      feedStationId: 'st-feed-a',
      trayStationId: 'st-a',
      trayObjectId: 'obj-1',
      cameraAssetId: 'as-cam-a',
    },
    stations: [
      {
        x: 660,
        y: 318,
        id: 'st-a',
        code: 'A',
        kind: 'station',
        name: 'จัดชุดและตรวจถาด',
        note: 'โต๊ะจัดชุดและจุดรับถาดของ M1 กล้อง A ตรวจ S1–S3 ก่อนส่งต่อ',
        color: '#22c55e',
      },
      {
        x: 600,
        y: 235,
        id: 'st-b',
        code: 'B',
        kind: 'station',
        name: 'จุดส่งต่อ B (Transfer Bay)',
        note: 'จุดจอดเทียบคู่ระหว่าง M1 (AMR+UR) และ M2/M3 (AMR ขนส่ง)',
        color: '#f59e0b',
      },
      {
        x: 758,
        y: 268,
        id: 'st-c',
        code: 'C',
        kind: 'station',
        name: 'จุดปลายทาง C (Station C)',
        note: 'จุดส่งตะกร้าปลายทางในห้อง Lab 2 ข้างแขน UR ตั้งโต๊ะ',
        color: '#38bdf8',
      },
      {
        x: 758,
        y: 318,
        id: 'st-d',
        code: 'D',
        kind: 'buffer',
        name: 'ช่องพักถาดหลังยกลงที่ C',
        note: 'UR-C รับถาดจาก M2 ที่ C และวางลงช่องพัก D',
        color: '#a855f7',
      },
      {
        x: 590,
        y: 282,
        id: 'st-wait-b',
        code: 'WB',
        kind: 'wait',
        name: 'จุดรอ B (Wait B)',
        note: 'จุดรอคิวของรถขนส่ง M2/M3 เมื่อจุด B ไม่ว่าง',
        color: '#eab308',
      },
      {
        x: 687,
        y: 352,
        id: 'st-feed-a',
        code: 'F',
        kind: 'station',
        name: 'โต๊ะป้อนแหวน / บล็อก',
        note: 'วางชิ้นส่วน 2 แบบให้ UR-A หยิบไปจัดถาดที่ A',
        color: '#0d9488',
      },
    ],
    robots: [
      {
        x: 690,
        y: 318,
        id: 'amr-m1',
        kind: 'amr-ur',
        name: 'M1',
        note: 'AMR ติด UR รับถาดที่ตรวจผ่านที่ A และย้ายถาดไป M2 ที่ B',
        angle: Math.PI,
        color: '#22c55e',
        urReach: 28,
      },
      {
        x: 588,
        y: 235,
        id: 'amr-m2',
        kind: 'amr',
        name: 'M2',
        note: 'AMR ขนส่งถาดจาก B ไป C',
        angle: -Math.PI / 2,
        color: '#f97316',
      },
      {
        x: 590,
        y: 282,
        id: 'amr-m3',
        kind: 'amr',
        name: 'M3',
        note: 'รถสำรองจอดที่ WB สำหรับเดโมนี้',
        angle: -Math.PI / 2,
        color: '#38bdf8',
      },
    ],
    stationURs: [
      {
        x: 752,
        y: 292,
        id: 'ur-c',
        name: 'UR-C',
        note: 'แขน UR ตั้งโต๊ะประจำสถานี C (ยกตะกร้าจาก AMR ลงจุด C หรือ D)',
        color: '#3b82f6',
        reach: 32,
      },
      {
        x: 655,
        y: 351,
        id: 'ur-a',
        name: 'UR-A',
        note: 'แขนตั้งโต๊ะประจำ A หยิบชิ้นส่วนจาก F และวางลงช่อง S1–S3 ของถาดที่ A',
        color: '#2563eb',
        reach: 40,
      },
    ],
    assets: [
      {
        x: 646,
        y: 318,
        id: 'as-photo-a',
        kind: 'sensor',
        name: 'Photo Sensor (A)',
        note: 'ตรวจจับตะกร้าพร้อมที่จุด A',
        angle: 0,
        color: '#f43f5e',
      },
      {
        x: 578,
        y: 205,
        id: 'as-cam-b',
        kind: 'camera',
        name: 'RealSense #1 (B)',
        note: 'กล้องดูภาพจุดส่งต่อ B',
        angle: 0.78,
        color: '#06b6d4',
        fovDeg: 60,
        fovRange: 58,
      },
      {
        x: 640,
        y: 338,
        id: 'as-wise-a',
        kind: 'wise',
        name: 'WISE-4012 (A)',
        note: 'I/O ไร้สายรับสัญญาณ Photo Sensor จุด A',
        angle: 0,
        color: '#10b981',
      },
      {
        x: 616,
        y: 192,
        id: 'as-router-1',
        kind: 'router',
        name: 'Router #1',
        note: 'กระจายสัญญาณทางเดินหลักโซน A-B-C',
        angle: 0,
        color: '#8b5cf6',
      },
      {
        x: 675,
        y: 288,
        id: 'as-cam-a',
        kind: 'camera',
        name: 'RealSense QC (A)',
        note: 'กล้องเหนือถาด A ตรวจ S1–S3 กรวยใน 2D ใช้ชี้พื้นที่ตรวจแบบ schematic',
        angle: 2.03,
        color: '#0891b2',
        fovDeg: 60,
        fovRange: 52,
      },
    ],
    objects: [
      {
        x: 660,
        y: 318,
        id: 'obj-1',
        name: 'ถาดจัดชุด #1 (S1–S3)',
        color: '#fbbf24',
        initialStationId: 'st-a',
        isKittingTray: true,
      },
    ],
    routes: [
      {
        id: 'rt-m1-ab',
        loop: true,
        name: 'M1: A → ประตูห้อง A → จุด B',
        color: '#22c55e',
        points: [
          { x: 690, y: 318, stationId: 'st-a' },
          { x: 698, y: 215 },
          { x: 698, y: 191 },
          { x: 609, y: 191 },
          { x: 609, y: 235, stationId: 'st-b' },
        ],
        robotId: 'amr-m1',
      },
      {
        id: 'rt-m2-bc',
        loop: true,
        name: 'M2: จุด B → ทางเดินบน → ห้อง C',
        color: '#f97316',
        points: [
          { x: 588, y: 235, stationId: 'st-b' },
          { x: 588, y: 191 },
          { x: 784, y: 191 },
          { x: 784, y: 268, stationId: 'st-c' },
        ],
        robotId: 'amr-m2',
      },
    ],
    steps: [
      {
        id: 'step-kit-a',
        action: 'ur-kit',
        duration: 6,
        title: '1. UR-A จัดถาดลงช่อง S1–S3 (จากจุด F → A)',
        urId: 'ur-a',
        feedStationId: 'st-feed-a',
        stationId: 'st-a',
        objectId: 'obj-1',
        note: 'สูตร A: แหวน–บล็อก–แหวน | สูตร B: บล็อก–แหวน–บล็อก',
      },
      {
        id: 'step-qc-a-pass',
        action: 'qc-inspect',
        duration: 2.5,
        title: '2. RealSense QC (A) ตรวจชนิดและจำนวน S1–S3 (จำลอง)',
        stationId: 'st-a',
        objectId: 'obj-1',
        cameraAssetId: 'as-cam-a',
        note: 'คำนวณ QC จำลองจากชิ้นส่วนจริงในช่อง S1–S3 เทียบกับออเดอร์ที่เลือก',
      },
      {
        id: 'step-1',
        note: 'เริ่มรับถาดเมื่อกล้องตรวจ QC ผ่านแล้วเท่านั้น',
        title: '3. M1 รับถาดที่ผ่านจาก A ขึ้นหลังรถ',
        action: 'pick-station',
        robotId: 'amr-m1',
        duration: 4,
        objectId: 'obj-1',
        stationId: 'st-a',
      },
      {
        id: 'step-2',
        title: '4. M1 ขนถาดจาก A → B',
        action: 'move',
        robotId: 'amr-m1',
        routeId: 'rt-m1-ab',
        duration: 6,
        reverseRoute: false,
      },
      {
        id: 'step-3',
        note: 'แขนบน M1 ย้ายถาดทั้งใบไปวางบนหลังรถ M2',
        title: '5. UR บน M1 ส่งถาดให้ M2 ที่ B',
        action: 'transfer-amr',
        robotId: 'amr-m1',
        duration: 4.5,
        objectId: 'obj-1',
        targetRobotId: 'amr-m2',
      },
      {
        id: 'step-4',
        title: '6. M2 ขนถาดจาก B → C',
        action: 'move',
        robotId: 'amr-m2',
        routeId: 'rt-m2-bc',
        duration: 6,
        reverseRoute: false,
      },
      {
        id: 'step-5',
        note: 'UR-C ยกถาดทั้งใบลงช่องพัก D',
        urId: 'ur-c',
        title: '7. UR-C ยกถาดจาก M2 ลงช่องพัก D',
        action: 'ur-unload',
        robotId: 'amr-m2',
        duration: 4.5,
        objectId: 'obj-1',
        stationId: 'st-d',
      },
      {
        id: 'step-6',
        title: '8. M1 กลับเปล่า B → A',
        action: 'move',
        robotId: 'amr-m1',
        routeId: 'rt-m1-ab',
        duration: 5,
        reverseRoute: true,
      },
      {
        id: 'step-7',
        title: '9. M2 กลับเปล่า C → B',
        action: 'move',
        robotId: 'amr-m2',
        routeId: 'rt-m2-bc',
        duration: 5,
        reverseRoute: true,
      },
    ],
  };
}

/**
 * Upgrade/normalize imported v2.0 JSON files — including the attached
 * `floor9-2d-ur-kitting-qc.preset.json` which used `wait` placeholder steps for
 * `step-kit-a` and `step-qc-a-pass` — into full interactive UR-A kitting + QC!
 */
export function normalizeImportedProject(raw: SandboxProject): SandboxProject {
  const hasKittingMarker =
    Boolean(raw.kitting?.enabled) ||
    (raw.steps.some((s) => s.id === 'step-kit-a' || s.action === 'ur-kit') &&
      raw.stationURs.some((u) => u.id === 'ur-a') &&
      raw.stations.some((s) => s.id === 'st-feed-a'));

  if (!hasKittingMarker) {
    return raw;
  }

  const kitting = raw.kitting ?? {
    enabled: true,
    order: 'A' as const,
    fault: 'none' as const,
    urId: 'ur-a',
    feedStationId: 'st-feed-a',
    trayStationId: 'st-a',
    trayObjectId: raw.objects[0]?.id ?? 'obj-1',
    cameraAssetId: raw.assets.find((a) => a.id === 'as-cam-a')?.id,
  };

  const steps = raw.steps.map((s) => {
    if (s.id === 'step-kit-a' && s.action === 'wait') {
      return {
        ...s,
        action: 'ur-kit' as const,
        urId: kitting.urId,
        feedStationId: kitting.feedStationId,
        stationId: kitting.trayStationId,
        objectId: kitting.trayObjectId,
      };
    }
    if (s.id === 'step-qc-a-pass' && s.action === 'wait') {
      return {
        ...s,
        action: 'qc-inspect' as const,
        stationId: kitting.trayStationId,
        objectId: kitting.trayObjectId,
        cameraAssetId: kitting.cameraAssetId,
      };
    }
    return s;
  });

  const objects = raw.objects.map((o) =>
    o.id === kitting.trayObjectId ? { ...o, isKittingTray: true } : o
  );

  return {
    ...raw,
    kitting,
    steps,
    objects,
  };
}

/**
 * Empty Map Canvas for starting completely from scratch
 */
export function createEmptyProject(): SandboxProject {
  return {
    version: '2.0',
    name: 'Floor 9 — ผังเปล่า (เริ่มออกแบบเอง)',
    updatedAt: new Date().toISOString(),
    stations: [],
    robots: [],
    stationURs: [],
    assets: [],
    objects: [],
    routes: [],
    steps: [],
  };
}
