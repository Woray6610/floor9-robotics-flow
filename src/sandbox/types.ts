export type SimulationMode = 'modeA' | 'modeB';

export type EditorTool =
  | 'select'
  | 'add-station'
  | 'add-amr'
  | 'add-amr-ur'
  | 'add-ur-station'
  | 'add-object'
  | 'add-sensor'
  | 'add-camera'
  | 'add-wise'
  | 'add-router'
  | 'draw-route';

export type StationKind = 'station' | 'wait' | 'buffer' | 'charge';

export interface StationNode {
  id: string;
  code: string; // e.g. 'A', 'B', 'C', 'D', 'F', 'G'
  name: string;
  kind: StationKind;
  x: number; // Map coordinate (0..1024)
  y: number; // Map coordinate (0..490)
  color: string;
  note?: string;
}

export type RobotKind = 'amr' | 'amr-ur';

export interface RobotUnit {
  id: string;
  name: string; // e.g. 'M1', 'M2', 'M3'
  kind: RobotKind;
  x: number;
  y: number;
  angle: number; // radians
  color: string; // Accent strip / badge color (body is grey rectangle)
  urReach?: number; // px radius if kind === 'amr-ur'
  note?: string;
}

export interface StationUR {
  id: string;
  name: string; // e.g. 'UR-C'
  x: number;
  y: number;
  reach: number; // px radius
  color: string;
  note?: string;
}

export type AssetKind = 'sensor' | 'camera' | 'wise' | 'router';

export interface IIoTAsset {
  id: string;
  name: string;
  kind: AssetKind;
  x: number;
  y: number;
  angle: number; // for camera FOV direction
  fovDeg?: number;
  fovRange?: number;
  color: string;
  note?: string;
}

export interface WorkObject {
  id: string;
  name: string; // e.g. 'ตะกร้า #1'
  color: string;
  initialStationId?: string;
  x: number;
  y: number;
}

export interface RoutePoint {
  x: number;
  y: number;
  stationId?: string; // Optional snap reference to a station
}

export interface RobotRoute {
  id: string;
  name: string; // e.g. 'เส้นทาง M1 (A → B)'
  robotId: string;
  color: string;
  loop: boolean;
  points: RoutePoint[];
}

export type FlowStepAction =
  | 'move'          // AMR moves along a route (forward or reverse)
  | 'pick-station'  // AMR-UR picks object from station onto AMR deck
  | 'transfer-amr'  // AMR-UR transfers object from itself to another AMR
  | 'ur-unload'     // Station UR picks object from AMR and places at station
  | 'wait';         // Robot / system pauses (e.g. sensor trigger / queue wait)

export interface FlowStep {
  id: string;
  title: string;
  action: FlowStepAction;
  duration: number; // seconds
  robotId?: string; // Acting AMR or AMR-UR
  targetRobotId?: string; // Receiving AMR (for transfer-amr)
  urId?: string; // Acting Station UR (for ur-unload)
  routeId?: string; // Route to follow (for move)
  reverseRoute?: boolean;
  stationId?: string; // Target station (for pick-station / ur-unload)
  objectId?: string; // Object being moved/carried
  note?: string;
}

export interface SandboxProject {
  version: '2.0';
  name: string;
  updatedAt: string;
  stations: StationNode[];
  robots: RobotUnit[];
  stationURs: StationUR[];
  assets: IIoTAsset[];
  objects: WorkObject[];
  routes: RobotRoute[];
  steps: FlowStep[];
}

// Runtime simulation state for rendering
export interface SimRobotState {
  id: string;
  x: number;
  y: number;
  angle: number;
  status: string;
  carryingObjectId: string | null;
  armEndX?: number; // World X of mobile UR end-effector
  armEndY?: number; // World Y of mobile UR end-effector
  armHoldingObjectId?: string | null;
}

export interface SimStationURState {
  id: string;
  x: number;
  y: number;
  armEndX: number;
  armEndY: number;
  status: string;
  holdingObjectId: string | null;
}

export interface SimObjectState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  holderType: 'station' | 'amr' | 'ur-mobile' | 'ur-station' | 'free';
  holderLabel: string;
}

export interface SimulationFrame {
  mode: SimulationMode;
  time: number;
  totalDuration: number;
  activeStepIndex: number;
  activeStepTitle: string;
  robots: Record<string, SimRobotState>;
  stationURs: Record<string, SimStationURState>;
  objects: Record<string, SimObjectState>;
}

export type SelectionTarget =
  | { type: 'station'; id: string }
  | { type: 'robot'; id: string }
  | { type: 'ur'; id: string }
  | { type: 'asset'; id: string }
  | { type: 'object'; id: string }
  | { type: 'route'; id: string }
  | null;
