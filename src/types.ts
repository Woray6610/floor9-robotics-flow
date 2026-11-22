export type URModelOption = 'UNCONFIRMED' | 'UR5e' | 'UR3e';

export type ItemCategory =
  | 'station'
  | 'amr'
  | 'ur'
  | 'camera'
  | 'wise'
  | 'router'
  | 'sensor'
  | 'optional'
  | 'zone';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;  // X in base units
  depth: number;  // Z in base units
  height: number; // Y in base units
}

export interface SceneItem {
  id: string;
  name: string;
  shortLabel: string;
  category: ItemCategory;
  role: string;
  position: [number, number, number]; // [x, y, z] in base units
  rotationY: number; // radians
  dimensions: Dimensions;
  color: string;
  draggable: boolean;
  visible?: boolean;
  // Optional specialized fields
  urModel?: URModelOption;
  urAttachment?: 'M1' | 'STATION_C' | 'UNASSIGNED';
  originStation?: string;
  destinationStation?: string;
  fovDeg?: number;       // For RealSense cameras
  fovRange?: number;     // For RealSense cameras
  pitchDeg?: number;     // For RealSense cameras
  cameraTarget?: string; // e.g., 'Transfer Bay B' or 'Station C / D'
  dataRole?: string;     // For WISE / Routers / Photo sensor
  bufferSlots?: number;  // For Buffer D (2 or 3)
  statusNote?: string;
  assumptions: string[];
}

export interface WallSegment {
  id: string;
  label: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  thickness: number;
  isDoorway?: boolean; // Optional visual frame/lintel instead of solid wall
  editable?: boolean;
}

export interface ColumnBox {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface UnverifiedZone {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  note: string;
}

export interface ScaleCalibration {
  isCalibrated: boolean;
  metersPerBaseUnit: number; // Default 1.0 (treated as relative units until calibrated)
  pointA: [number, number] | null; // [x, z]
  pointB: [number, number] | null; // [x, z]
  referenceMeters: number | null;
}

export interface ViewSettings {
  showReferenceImage: boolean;
  referenceImageOpacity: number;
  showOriginalOverlays: boolean;
  showRoutes: boolean;
  showBufferD: boolean;
  showLabels: boolean;
  showFovCones: boolean;
  showUnverifiedZones: boolean;
  wallHeight: number;
  wallOpacity: number;
  gridSnap: boolean;
  snapSize: number;
}

export interface LayoutSaveFile {
  version: string;
  savedAt: string;
  sceneName: string;
  scale: ScaleCalibration;
  viewSettings: ViewSettings;
  items: SceneItem[];
  walls: WallSegment[];
}

export type RobotActionType = 'pickup' | 'transit' | 'wait' | 'transfer' | 'unload' | 'return' | 'idle';

export interface TimelineBlock {
  start: number;
  end: number;
  type: RobotActionType;
  label: string;
  detail: string;
}

export interface AnimatedRobotPose {
  id: 'amr-m1' | 'amr-m2' | 'amr-m3';
  name: string;
  color: string;
  x: number;
  z: number;
  rotationY: number;
  action: RobotActionType;
  statusText: string;
  waitingFor?: string;
  carryingBasketId: string | null;
  armTargetLocal?: [number, number, number] | null; // Relative to M1 for mobile UR
  gripperClosed?: boolean;
}

export interface AnimatedBasketPose {
  id: string;
  label: string;
  color: string;
  position: [number, number, number];
  rotationY: number;
  owner: string;
}

export interface StationUrPose {
  action: RobotActionType;
  statusText: string;
  targetWorld: [number, number, number] | null;
  gripperClosed: boolean;
}

export interface SimulationSnapshot {
  time: number;
  duration: number;
  phaseIndex: number;
  phaseTitle: string;
  phaseSummary: string;
  robots: {
    m1: AnimatedRobotPose;
    m2: AnimatedRobotPose;
    m3: AnimatedRobotPose;
  };
  stationUr: StationUrPose;
  baskets: AnimatedBasketPose[];
  photoSensorTriggered: boolean;
  activeWaitingB: boolean;
  activeWaitingC: boolean;
  routeAB: [number, number][];
  routeBC: [number, number][];
}

export type CameraPreset = 'isometric' | 'top' | 'reset' | 'focus-right' | null;
