import { ColumnBox, UnverifiedZone, WallSegment } from '../types';

export const IMG_W = 1024;
export const IMG_H = 487;
/**
 * Base relative unit conversion: 1 px = 0.08 base units (~81.92 x 38.96 units).
 * Corridors (~23 px) map to ~1.84 units; lab rooms (~92 x 153 px) map to ~7.4 x 12.2 units.
 * Marked "รอสอบเทียบระยะ" until calibrated with 2-point real distance measurement.
 */
export const BASE_UNITS_PER_PX = 0.08;

export const MAP_WORLD_W = IMG_W * BASE_UNITS_PER_PX; // 81.92
export const MAP_WORLD_D = IMG_H * BASE_UNITS_PER_PX; // 38.96

export function pxX(px: number): number {
  return Number(((px - IMG_W / 2) * BASE_UNITS_PER_PX).toFixed(3));
}

export function pxZ(py: number): number {
  return Number(((py - IMG_H / 2) * BASE_UNITS_PER_PX).toFixed(3));
}

export function pxSize(px: number): number {
  return Number((px * BASE_UNITS_PER_PX).toFixed(3));
}

function wallPx(
  id: string,
  label: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thicknessPx = 3.5,
  isDoorway = false
): WallSegment {
  return {
    id,
    label,
    x1: pxX(x1),
    z1: pxZ(y1),
    x2: pxX(x2),
    z2: pxZ(y2),
    thickness: pxSize(thicknessPx),
    isDoorway,
    editable: true,
  };
}

/**
 * Floor 9 Cutaway Walls faithfully traced from the uploaded MiR Reference Map (1024x487).
 * Includes Left Wing (big open hall + top/bottom rooms), Central Core (elevators/shafts + corridors),
 * and Right Wing (Upper lecture/lab rooms, upper/lower corridors, Middle-Right Lab A / Room C / Room 3, Bottom rooms).
 */
export const INITIAL_WALLS: WallSegment[] = [
  // ================= OUTER PERIMETER =================
  // Top-left perimeter
  wallPx('w-outer-tl-top', 'ผนังนอก ด้านบนซ้าย', 94, 40, 415, 40, 4),
  wallPx('w-outer-tl-left', 'ผนังนอก ด้านซ้ายบน', 94, 40, 94, 134, 4),
  wallPx('w-outer-l-mid', 'ผนังนอก ด้านซ้ายกลาง', 107, 134, 107, 300, 4),
  wallPx('w-outer-bl-left', 'ผนังนอก ด้านซ้ายล่าง', 90, 300, 90, 454, 4),
  // Bottom perimeter
  wallPx('w-outer-bot-l', 'ผนังนอก ด้านล่างซ้าย', 90, 454, 455, 452, 4),
  wallPx('w-outer-bot-c', 'ผนังนอก ด้านล่างกลาง', 455, 452, 712, 449, 4),
  wallPx('w-outer-bot-r', 'ผนังนอก ด้านล่างขวา', 712, 449, 945, 446, 4),
  // Right perimeter
  wallPx('w-outer-r-bot', 'ผนังนอก ด้านขวาล่าง', 945, 380, 945, 446, 4),
  wallPx('w-outer-r-mid', 'ผนังนอก ด้านขวากลาง', 942, 118, 945, 380, 4),
  wallPx('w-outer-r-step', 'ผนังนอก มุมขวาบน', 904, 118, 942, 118, 4),
  wallPx('w-outer-r-top', 'ผนังนอก ด้านขวาบน', 904, 42, 904, 118, 4),
  // Top-right perimeter
  wallPx('w-outer-tr-top', 'ผนังนอก ด้านบนขวา', 613, 42, 904, 42, 4),
  // Center-top setback perimeter
  wallPx('w-outer-ct-l', 'ผนังนอก ส่วนเว้ากลางซ้าย', 415, 40, 415, 119, 4),
  wallPx('w-outer-ct-m', 'ผนังนอก ส่วนเว้ากลาง', 415, 119, 613, 119, 4),
  wallPx('w-outer-ct-r', 'ผนังนอก ส่วนเว้ากลางขวา', 613, 42, 613, 119, 4),

  // ================= LEFT WING (โถงใหญ่ด้านซ้าย + ห้องรอบโถง) =================
  // Top-left room partitions
  wallPx('w-tl-bot-1', 'ผนังห้องบนซ้าย 1', 94, 99, 152, 99, 3),
  wallPx('w-tl-bot-2', 'ผนังห้องบนซ้าย 2', 174, 99, 300, 99, 3),
  wallPx('w-tl-bot-3', 'ผนังห้องบนซ้าย 3', 323, 99, 415, 99, 3),
  wallPx('w-tl-div-1', 'ผนังกั้นห้องบนซ้าย A', 174, 40, 174, 99, 3),
  wallPx('w-tl-div-2', 'ผนังกั้นห้องบนซ้าย B', 323, 40, 323, 99, 3),

  // Big Left Hall / Atrium inner walls (โถงใหญ่ด้านซ้าย)
  wallPx('w-hall-top', 'ขอบโถงใหญ่ ด้านบน', 107, 134, 388, 134, 3.5),
  wallPx('w-hall-right', 'ขอบโถงใหญ่ ด้านขวา', 388, 134, 388, 300, 3.5),
  wallPx('w-hall-bot', 'ขอบโถงใหญ่ ด้านล่าง', 107, 300, 388, 300, 3.5),

  // Bottom-left rooms
  wallPx('w-bl-top-1', 'ผนังห้องล่างซ้าย 1', 90, 334, 177, 334, 3),
  wallPx('w-bl-top-2', 'ผนังห้องล่างซ้าย 2', 200, 334, 260, 334, 3),
  wallPx('w-bl-top-3', 'ผนังห้องล่างซ้าย 3', 286, 333, 415, 333, 3),
  wallPx('w-bl-div-1', 'ผนังกั้นห้องล่างซ้าย A', 177, 334, 177, 454, 3),
  wallPx('w-bl-div-2', 'ผนังกั้นห้องล่างซ้าย B', 286, 333, 286, 453, 3),
  wallPx('w-bl-shaft-bot', 'ขอบพื้นที่ปิดล่างซ้าย', 286, 364, 415, 364, 3),
  wallPx('w-bl-div-3', 'ผนังกั้นห้องล่างซ้าย C', 377, 385, 377, 452, 3),
  wallPx('w-bl-cor-bot', 'ผนังทางเดินล่างซ้าย', 377, 385, 455, 385, 3),

  // ================= CENTRAL CORE (โถงกลาง / ลิฟต์ / บันได) =================
  // Upper central room (below setback)
  wallPx('w-cc-u-l', 'ผนังห้องกลางบน ซ้าย', 465, 119, 465, 186, 3),
  wallPx('w-cc-u-b', 'ผนังห้องกลางบน ล่าง', 465, 186, 565, 186, 3),
  wallPx('w-cc-u-r', 'ผนังห้องกลางบน ขวา', 565, 119, 565, 186, 3),

  // Middle-upper central shaft/room
  wallPx('w-cc-m1-t', 'ผนังโถงลิฟต์บน ด้านบน', 470, 207, 560, 207, 3),
  wallPx('w-cc-m1-l', 'ผนังโถงลิฟต์บน ด้านซ้าย', 470, 207, 470, 244, 3),
  wallPx('w-cc-m1-r', 'ผนังโถงลิฟต์บน ด้านขวา', 560, 207, 560, 244, 3),
  wallPx('w-cc-m1-b', 'ผนังโถงลิฟต์บน ด้านล่าง', 470, 244, 560, 244, 3),

  // Middle-lower central shaft + lower central room
  wallPx('w-cc-m2-t', 'ผนังโถงลิฟต์ล่าง ด้านบน', 468, 272, 560, 272, 3),
  wallPx('w-cc-m2-l', 'ผนังโถงลิฟต์ล่าง ด้านซ้าย', 468, 272, 468, 310, 3),
  wallPx('w-cc-m2-r', 'ผนังโถงลิฟต์ล่าง ด้านขวา', 560, 272, 560, 364, 3),
  wallPx('w-cc-m2-mid', 'ผนังกั้นกลางลิฟต์', 453, 310, 560, 310, 3),
  wallPx('w-cc-m2-ll', 'ผนังห้องกลางล่าง ด้านซ้าย', 453, 310, 453, 364, 3),
  wallPx('w-cc-m2-b', 'ผนังห้องกลางล่าง ด้านล่าง', 453, 364, 560, 364, 3),

  // Bottom central rooms
  wallPx('w-cb-t1', 'ผนังห้องล่างกลาง', 472, 392, 558, 392, 3),
  wallPx('w-cb-d1', 'ผนังกั้นห้องล่างกลาง 1', 472, 392, 472, 451, 3),
  wallPx('w-cb-d2', 'ผนังกั้นห้องล่างกลาง 2', 558, 392, 558, 450, 3),
  wallPx('w-cb-d3', 'ผนังกั้นห้องล่างกลาง 3', 615, 383, 615, 449, 3),

  // ================= RIGHT WING — UPPER ROOMS (ห้องบนขวา & ห้องบรรยาย) =================
  wallPx('w-ur-left', 'ผนังห้องบนขวา ด้านซ้าย', 613, 42, 613, 183, 3.5),
  wallPx('w-ur-div1', 'ผนังกั้นห้องบนขวา 1', 704, 42, 704, 183, 3),
  wallPx('w-ur-div2', 'ผนังกั้นห้องบนขวา 2', 788, 42, 788, 183, 3),
  wallPx('w-ur-right', 'ผนังห้องบนขวา ด้านขวา', 904, 118, 904, 183, 3.5),
  // Upper corridor north wall (y=183) with exact doorways at x=681..698 and x=796..806
  wallPx('w-uc-n1', 'ผนังทางเดินบน ฝั่งเหนือ 1', 613, 183, 680, 183, 3.5),
  wallPx('w-uc-n-door1', 'ช่องประตูห้องบนขวา 1', 680, 183, 699, 183, 2, true),
  wallPx('w-uc-n2', 'ผนังทางเดินบน ฝั่งเหนือ 2', 699, 183, 795, 183, 3.5),
  wallPx('w-uc-n-door2', 'ช่องประตูห้องบนขวา 2', 795, 183, 811, 183, 2, true),
  wallPx('w-uc-n3', 'ผนังทางเดินบน ฝั่งเหนือ 3', 811, 183, 904, 183, 3.5),

  // ================= RIGHT WING — MIDDLE LAB ROOMS (ห้อง A, ห้อง C, ห้อง 3) =================
  // Upper corridor south wall (y=206) with exact doorways into Room A (x=681..697) & Room C (x=765..784)
  wallPx('w-rmA-top1', 'ผนังบนห้อง A (ซ้ายประตู)', 615, 206, 680, 206, 3.5),
  wallPx('w-rmA-door-top', 'ช่องประตูหลักห้อง A', 680, 206, 698, 206, 2, true),
  wallPx('w-rmA-top2', 'ผนังบนห้อง A/C (ช่วงกลาง)', 698, 206, 764, 206, 3.5),
  wallPx('w-rmC-door-top', 'ช่องประตูหลักห้อง C', 764, 206, 785, 206, 2, true),
  wallPx('w-rm3-top', 'ผนังบนห้อง 3 (ขวา)', 785, 206, 906, 206, 3.5),

  // Room A left wall (facing Transfer Bay B alcove)
  wallPx('w-rmA-left', 'ผนังซ้ายห้อง A (ติดจุดส่งต่อ B)', 615, 206, 615, 360, 3.5),

  // Divider between Room A and Room C (x=707) with internal opening y=244..288
  wallPx('w-rmAC-div1', 'ผนังกั้นห้อง A–C (บน)', 707, 206, 707, 244, 3),
  wallPx('w-rmAC-open', 'ช่องเชื่อมภายในห้อง A–C', 707, 244, 707, 288, 2, true),
  wallPx('w-rmAC-div2', 'ผนังกั้นห้อง A–C (ล่าง)', 707, 288, 707, 360, 3),

  // Divider between Room C and Room 3 (x=789)
  wallPx('w-rmC3-div', 'ผนังกั้นห้อง C–ห้อง 3', 789, 206, 789, 360, 3.5),

  // Room 3 right wall (x=906) and inner sub-room corner (bottom-left of Room 3)
  wallPx('w-rm3-right', 'ผนังขวาห้อง 3', 906, 206, 906, 360, 3.5),
  wallPx('w-rm3-sub-top', 'ผนังห้องย่อยในห้อง 3 (บน)', 789, 302, 873, 302, 3),
  wallPx('w-rm3-sub-right', 'ผนังห้องย่อยในห้อง 3 (ขวา)', 873, 302, 873, 360, 3),

  // Lower corridor north wall (y=360) with doorways at x=683..698 & x=797..815
  wallPx('w-rmA-bot1', 'ผนังล่างห้อง A (ซ้ายประตู)', 615, 360, 682, 360, 3.5),
  wallPx('w-rmA-door-bot', 'ช่องประตูล่างห้อง A', 682, 360, 699, 360, 2, true),
  wallPx('w-rmC-bot', 'ผนังล่างห้อง C', 699, 360, 796, 360, 3.5),
  wallPx('w-rm3-door-bot', 'ช่องประตูล่างห้อง 3', 796, 360, 816, 360, 2, true),
  wallPx('w-rm3-bot', 'ผนังล่างห้อง 3', 816, 360, 906, 360, 3.5),

  // ================= RIGHT WING — BOTTOM ROOMS (ห้องด้านล่างขวา) =================
  wallPx('w-br-top1', 'ผนังทางเดินล่างขวา 1', 615, 383, 632, 383, 3),
  wallPx('w-br-top2', 'ผนังทางเดินล่างขวา 2', 654, 383, 712, 383, 3),
  wallPx('w-br-top3', 'ผนังทางเดินล่างขวา 3', 726, 382, 798, 382, 3),
  wallPx('w-br-top4', 'ผนังทางเดินล่างขวา 4', 815, 382, 888, 382, 3),
  wallPx('w-br-top5', 'ผนังทางเดินล่างขวา 5', 902, 382, 945, 382, 3),
  wallPx('w-br-div1', 'ผนังกั้นห้องล่างขวา 1', 708, 383, 708, 449, 3),
  wallPx('w-br-div2', 'ผนังกั้นห้องล่างขวา 2', 877, 382, 877, 447, 3),
];

/**
 * Structural pillars visible along the Left Big Hall and Right Wing bays
 */
export const FLOOR9_COLUMNS: ColumnBox[] = [
  // Left Hall top row columns
  { id: 'col-lt-1', x: pxX(174), z: pxZ(126), w: pxSize(8), d: pxSize(11) },
  { id: 'col-lt-2', x: pxX(258), z: pxZ(126), w: pxSize(8), d: pxSize(11) },
  { id: 'col-lt-3', x: pxX(324), z: pxZ(126), w: pxSize(8), d: pxSize(11) },
  // Left Hall bottom row columns
  { id: 'col-lb-1', x: pxX(174), z: pxZ(306), w: pxSize(8), d: pxSize(11) },
  { id: 'col-lb-2', x: pxX(258), z: pxZ(306), w: pxSize(8), d: pxSize(11) },
  { id: 'col-lb-3', x: pxX(324), z: pxZ(306), w: pxSize(8), d: pxSize(11) },
  // Left Hall east corridor pillar
  { id: 'col-le-1', x: pxX(412), z: pxZ(216), w: pxSize(6), d: pxSize(12) },
  // Right Lab bay pillars
  { id: 'col-ra-1', x: pxX(616), z: pxZ(212), w: pxSize(8), d: pxSize(10) },
  { id: 'col-ra-2', x: pxX(616), z: pxZ(308), w: pxSize(8), d: pxSize(10) },
  { id: 'col-rc-1', x: pxX(707), z: pxZ(212), w: pxSize(8), d: pxSize(10) },
  { id: 'col-rc-2', x: pxX(789), z: pxZ(212), w: pxSize(8), d: pxSize(10) },
];

/**
 * Unclear / grey regions on the MiR scan kept explicitly marked as "พื้นที่รอตรวจ"
 */
export const UNVERIFIED_ZONES: UnverifiedZone[] = [
  {
    id: 'unv-1',
    name: 'พื้นที่รอตรวจ #1 (ขอบห้องกลางบน)',
    x: pxX(480),
    z: pxZ(150),
    w: pxSize(30),
    d: pxSize(60),
    note: 'ขอบสแกนสีเทาไม่ชัดเจนบนผัง MiR เดิม — ต้องตรวจสอบผนัง/ประตูจริงหน้างาน',
  },
  {
    id: 'unv-2',
    name: 'พื้นที่รอตรวจ #2 (บล็อกสีเทาล่างซ้าย)',
    x: pxX(351),
    z: pxZ(348),
    w: pxSize(128),
    d: pxSize(31),
    note: 'พื้นที่ปิดทึบ/ช่องงานระบบสีเทาในภาพต้นฉบับ — คงเป็นเขตห้ามวิ่งจนกว่าจะตรวจจริง',
  },
  {
    id: 'unv-3',
    name: 'พื้นที่รอตรวจ #3 (ช่องทึบล่างกลาง-ขวา)',
    x: pxX(671),
    z: pxZ(430),
    w: pxSize(48),
    d: pxSize(36),
    note: 'พื้นที่สีเทาด้านล่างขวา — ยังไม่ได้ระบุชื่อห้องและขอบเขตภายใน',
  },
  {
    id: 'unv-4',
    name: 'พื้นที่รอตรวจ #4 (ช่องทึบล่างซ้ายสุด)',
    x: pxX(259),
    z: pxZ(435),
    w: pxSize(54),
    d: pxSize(36),
    note: 'พื้นที่สีเทาในกลุ่มห้องล่างซ้าย — รอตรวจชื่อห้องและการเข้าถึง',
  },
];

/**
 * Room floor pads with subtle zone colors & labels for architectural readability
 */
export const FLOOR_ZONES = [
  { id: 'fz-hall', label: 'โถงใหญ่ด้านซ้าย (Left Hall)', x: pxX(247), z: pxZ(217), w: pxSize(278), d: pxSize(164), color: '#1e293b' },
  { id: 'fz-aud', label: 'ห้องเรียน / โถงแถวที่นั่ง (บนขวา)', x: pxX(746), z: pxZ(112), w: pxSize(84), d: pxSize(138), color: '#1e293b' },
  { id: 'fz-rmA', label: 'ห้อง Lab กลางขวา (จุดเสนอ A)', x: pxX(661), z: pxZ(283), w: pxSize(90), d: pxSize(152), color: '#172554' },
  { id: 'fz-rmC', label: 'ห้อง Lab ขวากลาง 2 (จุดเสนอ C/D)', x: pxX(748), z: pxZ(283), w: pxSize(80), d: pxSize(152), color: '#162c2b' },
  { id: 'fz-rm3', label: 'ห้อง Lab ขวาสุด (พื้นที่สำรอง)', x: pxX(847), z: pxZ(283), w: pxSize(114), d: pxSize(152), color: '#1e293b' },
  { id: 'fz-ucorr', label: 'ทางเดินหลักฝั่งขวาบน', x: pxX(758), z: pxZ(195), w: pxSize(296), d: pxSize(22), color: '#273549' },
  { id: 'fz-ccorr', label: 'ทางเดินหลักแนวตั้ง (จุดเสนอ B)', x: pxX(588), z: pxZ(270), w: pxSize(52), d: pxSize(220), color: '#273549' },
];

/**
 * Original Map Overlays extracted directly from the user's MiR Reference Image:
 * - Red forbidden zone in Room A
 * - Green preferred path in Room A
 * - 10 Blue MiR waypoint icons along corridor & Room A
 * - Yellow charger/dock marker & Gray marker
 */
export const ORIGINAL_MAP_OVERLAYS = {
  redZone: {
    x: pxX(634),
    z: pxZ(256.5),
    w: pxSize(28),
    d: pxSize(61),
    label: 'Red Zone (เดิมบนผัง MiR)',
  },
  greenPath: [
    [pxX(652), pxZ(222)],
    [pxX(671), pxZ(236)],
    [pxX(694), pxZ(250)],
    [pxX(690), pxZ(264)],
    [pxX(686), pxZ(282)],
  ] as [number, number][],
  blueMarkers: [
    { id: 'bm-1', x: pxX(642.2), z: pxZ(195.8), label: 'MiR Pos #1' },
    { id: 'bm-2', x: pxX(673.3), z: pxZ(194.2), label: 'MiR Pos #2' },
    { id: 'bm-3', x: pxX(700.1), z: pxZ(194.1), label: 'MiR Pos #3' },
    { id: 'bm-4', x: pxX(711.0), z: pxZ(192.9), label: 'MiR Pos #4' },
    { id: 'bm-5', x: pxX(749.8), z: pxZ(194.4), label: 'MiR Pos #5' },
    { id: 'bm-6', x: pxX(831.1), z: pxZ(192.9), label: 'MiR Pos #6' },
    { id: 'bm-7', x: pxX(672.5), z: pxZ(244.6), label: 'MiR Pos #7' },
    { id: 'bm-8', x: pxX(648.1), z: pxZ(258.2), label: 'MiR Pos #8' },
    { id: 'bm-9', x: pxX(670.7), z: pxZ(262.6), label: 'MiR Pos #9' },
    { id: 'bm-10', x: pxX(689.7), z: pxZ(294.4), label: 'MiR Pos #10' },
  ],
  yellowDock: {
    x: pxX(703.5),
    z: pxZ(317.5),
    w: pxSize(7),
    d: pxSize(11),
    label: 'จุดชาร์จ/Dock เดิม (เหลือง)',
  },
  grayMarker: {
    x: pxX(780),
    z: pxZ(308),
    w: pxSize(10),
    d: pxSize(7),
    label: 'จุดอ้างอิงเดิม (เทา)',
  },
};

/**
 * Key architectural doorway anchors used by dynamic route generation
 */
export const DOORWAY_ANCHORS = {
  roomATopDoor: [pxX(689), pxZ(206)] as [number, number],
  roomATopCorridor: [pxX(689), pxZ(195)] as [number, number],
  corridorJunctionB: [pxX(602), pxZ(195)] as [number, number],
  roomCTopDoor: [pxX(774), pxZ(206)] as [number, number],
  roomCTopCorridor: [pxX(774), pxZ(195)] as [number, number],
};
