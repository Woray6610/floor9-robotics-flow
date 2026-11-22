import { SandboxProject } from './types';

export const MAP_WIDTH = 1024;
export const MAP_HEIGHT = 490;

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
