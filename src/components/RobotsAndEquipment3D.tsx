import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import {
  AnimatedBasketPose,
  AnimatedRobotPose,
  SceneItem,
  SimulationSnapshot,
  ViewSettings,
} from '../types';

/**
 * Simple 2-link analytical IK for a crisp schematic UR arm reaching a target point relative to its base
 */
export const SchematicURArm: React.FC<{
  basePosition: [number, number, number];
  targetOffset: [number, number, number]; // Relative to basePosition
  gripperClosed?: boolean;
  urModelLabel?: string;
  accentColor?: string;
  selected?: boolean;
  onSelect?: (e: ThreeEvent<MouseEvent>) => void;
}> = ({
  basePosition,
  targetOffset,
  gripperClosed = false,
  accentColor = '#3b82f6',
  selected = false,
  onSelect,
}) => {
  const L1 = 0.52;
  const L2 = 0.48;
  const baseH = 0.16;

  const { yaw, shoulderPitch, elbowPitch, wristPitch } = useMemo(() => {
    const [tx, ty, tz] = targetOffset;
    const yawAngle = Math.atan2(tx, tz);
    const horiz = Math.hypot(tx, tz);
    const dy = ty - baseH;
    const dist = Math.min(L1 + L2 - 0.04, Math.max(0.18, Math.hypot(horiz, dy)));

    const cosElbow = Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2)));
    const elbowInternal = Math.acos(cosElbow);
    const angleToTarget = Math.atan2(dy, horiz);
    const cosAlpha = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)));
    const alpha = Math.acos(cosAlpha);

    const shoulderFromHoriz = angleToTarget + alpha;
    const shoulder = Math.PI / 2 - shoulderFromHoriz;
    const elbow = Math.PI - elbowInternal;
    // Keep gripper pointed roughly downward
    const wrist = Math.PI - shoulder - elbow;

    return {
      yaw: yawAngle,
      shoulderPitch: shoulder,
      elbowPitch: elbow,
      wristPitch: wrist,
    };
  }, [targetOffset]);

  const jawOffset = gripperClosed ? 0.12 : 0.21;

  return (
    <group position={basePosition} onClick={onSelect}>
      {/* Base ring */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.16, 16]} />
        <meshStandardMaterial color={selected ? '#fbbf24' : '#cbd5e1'} metalness={0.5} roughness={0.35} />
      </mesh>
      <group rotation={[0, yaw, 0]} position={[0, baseH, 0]}>
        {/* Shoulder cap (UR blue) */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.17, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.4} />
        </mesh>

        {/* Upper Arm */}
        <group rotation={[shoulderPitch, 0, 0]}>
          <mesh position={[0, L1 / 2, 0]} castShadow>
            <cylinderGeometry args={[0.052, 0.058, L1, 14]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.55} roughness={0.3} />
          </mesh>

          {/* Elbow Joint */}
          <group position={[0, L1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.068, 0.068, 0.15, 16]} />
              <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Forearm */}
            <group rotation={[elbowPitch, 0, 0]}>
              <mesh position={[0, L2 / 2, 0]} castShadow>
                <cylinderGeometry args={[0.044, 0.05, L2, 14]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.55} roughness={0.3} />
              </mesh>

              {/* Wrist + Schematic Basket Gripper */}
              <group position={[0, L2, 0]} rotation={[wristPitch, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.052, 0.052, 0.1, 14]} />
                  <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.4} />
                </mesh>
                {/* Gripper crossbar */}
                <mesh position={[0, 0.08, 0]} castShadow>
                  <boxGeometry args={[0.42, 0.045, 0.08]} />
                  <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
                </mesh>
                {/* Left & Right Gripper Fingers */}
                <mesh position={[-jawOffset, 0.17, 0]} castShadow>
                  <boxGeometry args={[0.035, 0.17, 0.14]} />
                  <meshStandardMaterial color={gripperClosed ? '#22c55e' : '#f59e0b'} metalness={0.3} roughness={0.4} />
                </mesh>
                <mesh position={[jawOffset, 0.17, 0]} castShadow>
                  <boxGeometry args={[0.035, 0.17, 0.14]} />
                  <meshStandardMaterial color={gripperClosed ? '#22c55e' : '#f59e0b'} metalness={0.3} roughness={0.4} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

/**
 * Schematic industrial basket with side handles & ID tag
 */
export const BasketMesh: React.FC<{ basket: AnimatedBasketPose; showLabels: boolean }> = ({
  basket,
  showLabels,
}) => {
  return (
    <group position={basket.position} rotation={[0, basket.rotationY, 0]}>
      {/* Main crate body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.24, 0.34]} />
        <meshStandardMaterial color={basket.color} roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Hollow-look top dark interior recess */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.28]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Top rim accent */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.48, 0.025, 0.36]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} transparent opacity={0.35} />
      </mesh>
      {/* Side handles */}
      <mesh position={[-0.24, 0.06, 0]}>
        <boxGeometry args={[0.03, 0.05, 0.12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.24, 0.06, 0]}>
        <boxGeometry args={[0.03, 0.05, 0.12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {showLabels && (
        <Html position={[0, 0.28, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="px-1.5 py-0.5 rounded bg-slate-950/85 border border-amber-400/50 text-[9px] font-mono text-amber-200 whitespace-nowrap shadow">
            {basket.label}
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * MiR-style schematic AMR with status badge & optional mounted mobile UR arm
 */
export const AMRUnit3D: React.FC<{
  pose: AnimatedRobotPose;
  item: SceneItem;
  isMobileUr?: boolean;
  urItem?: SceneItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showLabels: boolean;
}> = ({ pose, item, isMobileUr, urItem, selectedId, onSelect, showLabels }) => {
  const isSelected = selectedId === item.id;
  const isUrSelected = urItem && selectedId === urItem.id;
  const { width, depth, height } = item.dimensions;

  const badgeIcon =
    pose.action === 'wait'
      ? '⏸'
      : pose.action === 'pickup' || pose.action === 'transfer' || pose.action === 'unload'
        ? '🦾'
        : pose.action === 'return'
          ? '↩'
          : '▶';

  const statusBg =
    pose.action === 'wait'
      ? 'border-amber-400/90 bg-amber-950/90 text-amber-200'
      : 'border-slate-500/80 bg-slate-950/90 text-slate-100';

  return (
    <group position={[pose.x, 0, pose.z]}>
      {/* Rotating AMR chassis */}
      <group
        rotation={[0, pose.rotationY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
      >
        {/* Selection halo */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[Math.max(width, depth) * 0.62, Math.max(width, depth) * 0.76, 32]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Base chassis */}
        <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.72, depth]} />
          <meshStandardMaterial color="#1e293b" metalness={0.45} roughness={0.4} />
        </mesh>

        {/* Top deck shell */}
        <mesh position={[0, height * 0.88, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.92, height * 0.22, depth * 0.9]} />
          <meshStandardMaterial color="#334155" metalness={0.35} roughness={0.45} />
        </mesh>

        {/* Color-coded LED wrap band (M1 Green / M2 Orange / M3 Blue) */}
        <mesh position={[0, height * 0.75, 0]}>
          <boxGeometry args={[width + 0.02, 0.06, depth + 0.02]} />
          <meshStandardMaterial
            color={pose.color}
            emissive={pose.color}
            emissiveIntensity={pose.action === 'wait' ? 0.35 : 0.75}
          />
        </mesh>

        {/* Front direction indicator bar */}
        <mesh position={[0, height * 0.88, depth * 0.44]}>
          <boxGeometry args={[width * 0.5, 0.04, 0.06]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.6} />
        </mesh>

        {/* Corner safety LiDAR domes */}
        <mesh position={[width * 0.44, height * 0.35, depth * 0.44]}>
          <cylinderGeometry args={[0.05, 0.05, 0.09, 12]} />
          <meshStandardMaterial color="#0f172a" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-width * 0.44, height * 0.35, -depth * 0.44]}>
          <cylinderGeometry args={[0.05, 0.05, 0.09, 12]} />
          <meshStandardMaterial color="#0f172a" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>

        {/* Basket cradle rails on top */}
        {!isMobileUr && (
          <group position={[0, height + 0.03, 0]}>
            <mesh position={[-0.25, 0, 0]}>
              <boxGeometry args={[0.04, 0.08, 0.44]} />
              <meshStandardMaterial color={pose.color} />
            </mesh>
            <mesh position={[0.25, 0, 0]}>
              <boxGeometry args={[0.04, 0.08, 0.44]} />
              <meshStandardMaterial color={pose.color} />
            </mesh>
          </group>
        )}

        {/* Wheels */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (width * 0.46), 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.07, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Mounted Mobile UR Arm on M1 (target expressed in world-aligned offset from M1 center) */}
      {isMobileUr && (
        <SchematicURArm
          basePosition={[0, height, 0]}
          targetOffset={pose.armTargetLocal ?? [0, 0.85, 0]}
          gripperClosed={pose.gripperClosed}
          accentColor="#2563eb"
          selected={!!isUrSelected}
          onSelect={(e) => {
            e.stopPropagation();
            if (urItem) onSelect(urItem.id);
          }}
        />
      )}

      {/* Floating Status Tag (Color + Icon + Text) */}
      {showLabels && (
        <Html position={[0, isMobileUr ? 1.95 : 1.12, 0]} center distanceFactor={16} style={{ pointerEvents: 'none' }}>
          <div
            className={`px-1.5 py-0.5 rounded border text-[9px] font-medium whitespace-nowrap shadow-lg backdrop-blur-sm flex items-center gap-1 ${statusBg}`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: pose.color }}
            />
            <span className="font-bold">{pose.name}</span>
            <span>{badgeIcon}</span>
            <span className="opacity-95">{pose.statusText}</span>
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * Animated dashed flow paths for A<->B and B<->C with moving directional chevrons
 */
export const FlowRoutes3D: React.FC<{
  routeAB: [number, number][];
  routeBC: [number, number][];
}> = ({ routeAB, routeBC }) => {
  const arrowGroupRef = useRef<THREE.Group>(null);

  const abPoints = useMemo(
    () => routeAB.map(([x, z]) => new THREE.Vector3(x, 0.06, z)),
    [routeAB]
  );
  const bcPoints = useMemo(
    () => routeBC.map(([x, z]) => new THREE.Vector3(x, 0.07, z)),
    [routeBC]
  );

  // Sample moving arrows along both paths
  const samplePts = (pts: [number, number][], t: number) => {
    let total = 0;
    const lens: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      lens.push(l);
      total += l;
    }
    const target = (((t % 1) + 1) % 1) * total;
    let acc = 0;
    for (let i = 0; i < lens.length; i++) {
      if (acc + lens[i] >= target || i === lens.length - 1) {
        const lt = lens[i] > 1e-5 ? (target - acc) / lens[i] : 0;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * lt;
        const z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * lt;
        const rotY = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        return { x, z, rotY };
      }
      acc += lens[i];
    }
    return { x: pts[0][0], z: pts[0][1], rotY: 0 };
  };

  useFrame(({ clock }) => {
    if (!arrowGroupRef.current) return;
    const t = clock.getElapsedTime() * 0.14;
    const children = arrowGroupRef.current.children;
    for (let i = 0; i < 4; i++) {
      const p = samplePts(routeAB, t + i * 0.25);
      children[i]?.position.set(p.x, 0.1, p.z);
      if (children[i]) children[i].rotation.y = p.rotY;
    }
    for (let i = 0; i < 5; i++) {
      const p = samplePts(routeBC, t + i * 0.2);
      const child = children[4 + i];
      child?.position.set(p.x, 0.1, p.z);
      if (child) child.rotation.y = p.rotY;
    }
  });

  return (
    <group>
      {/* A <-> B Route (Green) */}
      <Line points={abPoints} color="#22c55e" lineWidth={3} dashed dashSize={0.4} gapSize={0.22} />
      {/* B <-> C Route (Orange/Sky) */}
      <Line points={bcPoints} color="#f97316" lineWidth={3} dashed dashSize={0.4} gapSize={0.22} />

      {/* Moving directional cones */}
      <group ref={arrowGroupRef}>
        {[0, 1, 2, 3].map((idx) => (
          <mesh key={`ab-arr-${idx}`} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.34, 8]} />
            <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.6} />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4].map((idx) => (
          <mesh key={`bc-arr-${idx}`} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.34, 8]} />
            <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/**
 * All Static & Editable Stations, Pedestals, Cameras, WISE, Routers, Photo Sensor, Solomon
 */
export const EquipmentLayer3D: React.FC<{
  items: SceneItem[];
  sim: SimulationSnapshot;
  viewSettings: ViewSettings;
  selectedId: string | null;
  editMode: boolean;
  onSelect: (id: string) => void;
  onStartDrag: (id: string, e: ThreeEvent<PointerEvent>) => void;
}> = ({ items, sim, viewSettings, selectedId, editMode, onSelect, onStartDrag }) => {
  const handleItemPointerDown = (item: SceneItem, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(item.id);
    if (editMode && item.draggable) {
      onStartDrag(item.id, e);
    }
  };

  return (
    <group>
      {items.map((item) => {
        if (item.category === 'amr') return null; // Rendered by AMRUnit3D
        if (item.id === 'ur-mobile') return null; // Rendered mounted on M1
        if (item.id === 'station-d' && !viewSettings.showBufferD) return null;

        const isSelected = selectedId === item.id;
        const [x, y, z] = item.position;
        const { width, depth, height } = item.dimensions;

        // ===== STATION A =====
        if (item.id === 'station-a') {
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Floor Zone Pad */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.45, 0.025, 0]}>
                <planeGeometry args={[width + 1.5, depth + 0.9]} />
                <meshStandardMaterial
                  color={isSelected ? '#fbbf24' : '#22c55e'}
                  transparent
                  opacity={isSelected ? 0.35 : 0.16}
                />
              </mesh>
              {/* Basket Pickup Table */}
              <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={isSelected ? '#fde047' : '#475569'} roughness={0.5} />
              </mesh>
              <mesh position={[0, height + 0.02, 0]}>
                <boxGeometry args={[width + 0.05, 0.04, depth + 0.05]} />
                <meshStandardMaterial color="#16a34a" roughness={0.4} />
              </mesh>
              {/* M1 Dock Pad */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.45, 0.035, 0]}>
                <planeGeometry args={[0.95, 1.25]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.28} />
              </mesh>
              {viewSettings.showLabels && (
                <Html position={[-0.25, height + 0.55, 0.72]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/80 text-[9px] font-semibold text-emerald-200 whitespace-nowrap shadow">
                    {item.shortLabel} (จุดรับตะกร้า)
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== STATION B (TRANSFER BAY — 2 PARALLEL SLOTS + WALKWAY) =====
        if (item.id === 'station-b') {
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Main Transfer Bay Floor Pad */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial
                  color={isSelected ? '#fbbf24' : '#f59e0b'}
                  transparent
                  opacity={isSelected ? 0.35 : 0.16}
                />
              </mesh>
              {/* Slot B1 (Right: M1 Mobile UR) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.68, 0.035, 0]}>
                <planeGeometry args={[0.95, 1.35]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.28} />
              </mesh>
              {/* Slot B2 (Left: M2/M3 Transport AMR) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.68, 0.035, 0]}>
                <planeGeometry args={[0.95, 1.35]} />
                <meshBasicMaterial color="#f97316" transparent opacity={0.28} />
              </mesh>
              {/* Narrow center alignment curb / guide strip */}
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.1, 0.08, 1.25]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
              {/* Pedestrian clearance lane marker on west side */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2 - 0.55, 0.028, 0]}>
                <planeGeometry args={[0.9, depth + 0.6]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.14} />
              </mesh>
              {viewSettings.showLabels && (
                <Html position={[0, 0.55, -depth / 2 - 0.35]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/80 text-[9px] font-semibold text-amber-200 whitespace-nowrap shadow">
                    {item.shortLabel} (ส่งต่อ B1↔B2)
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== STATION C =====
        if (item.id === 'station-c') {
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Station C Floor Zone */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.025, 0]}>
                <planeGeometry args={[width + 0.7, depth + 0.6]} />
                <meshStandardMaterial
                  color={isSelected ? '#fbbf24' : '#38bdf8'}
                  transparent
                  opacity={isSelected ? 0.35 : 0.15}
                />
              </mesh>
              {/* Receiving Table C */}
              <mesh position={[-0.55, height / 2, -0.55]} castShadow receiveShadow>
                <boxGeometry args={[1.15, height, 0.72]} />
                <meshStandardMaterial color={isSelected ? '#fde047' : '#475569'} roughness={0.5} />
              </mesh>
              <mesh position={[-0.55, height + 0.02, -0.55]}>
                <boxGeometry args={[1.2, 0.04, 0.76]} />
                <meshStandardMaterial color="#0284c7" roughness={0.4} />
              </mesh>
              {/* AMR Dock Pad at C */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.25, 0.035, 0]}>
                <planeGeometry args={[0.98, 1.35]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} />
              </mesh>
              {viewSettings.showLabels && (
                <Html position={[-0.45, height + 0.55, -0.85]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-400/80 text-[9px] font-semibold text-sky-200 whitespace-nowrap shadow">
                    {item.shortLabel} (จุดรับปลายทาง)
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== STATION D (BUFFER RACK — 2 OR 3 SLOTS) =====
        if (item.id === 'station-d') {
          const slots = item.bufferSlots ?? 3;
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={isSelected ? '#fde047' : '#3b2d56'} roughness={0.5} />
              </mesh>
              {/* Slot dividers */}
              {Array.from({ length: slots }).map((_, idx) => {
                const sx = -width / 2 + (width / slots) * (idx + 0.5);
                return (
                  <mesh key={idx} position={[sx, height + 0.02, 0]}>
                    <boxGeometry args={[width / slots - 0.1, 0.03, depth - 0.1]} />
                    <meshStandardMaterial color="#a855f7" emissive="#9333ea" emissiveIntensity={0.25} />
                  </mesh>
                );
              })}
              {viewSettings.showLabels && (
                <Html position={[0, height + 0.45, 0.55]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400/80 text-[9px] font-semibold text-purple-200 whitespace-nowrap shadow">
                    ข้อเสนอ D ({slots} ช่อง D1–D{slots})
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== WAIT POINTS B & C =====
        if (item.id === 'wait-b' || item.id === 'wait-c') {
          const active = item.id === 'wait-b' ? sim.activeWaitingB : sim.activeWaitingC;
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshBasicMaterial
                  color={active ? '#facc15' : '#ca8a04'}
                  transparent
                  opacity={active ? 0.42 : 0.18}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
                <ringGeometry args={[width * 0.42, width * 0.48, 4]} />
                <meshBasicMaterial color={isSelected ? '#ffffff' : '#fde047'} side={THREE.DoubleSide} />
              </mesh>
              {viewSettings.showLabels && (
                <Html position={[0, 0.42, 0.7]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div
                    className={`px-1.5 py-0.5 rounded border text-[8px] font-semibold whitespace-nowrap shadow ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-white animate-pulse'
                        : 'bg-slate-950/85 text-amber-300 border-amber-500/60'
                    }`}
                  >
                    ⏸ {item.shortLabel} {active ? '(รอคิว)' : ''}
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== STATION C UR & RESERVE UR =====
        if (item.category === 'ur') {
          const isStationC = item.id === 'ur-station-c';
          const pedestalH = 0.65;
          const targetOffset: [number, number, number] =
            isStationC && sim.stationUr.targetWorld
              ? [
                  sim.stationUr.targetWorld[0] - x,
                  sim.stationUr.targetWorld[1] - pedestalH,
                  sim.stationUr.targetWorld[2] - z,
                ]
              : [0.25, 0.72, 0.15];

          const modelTag =
            item.urModel === 'UR5e'
              ? 'UR5e'
              : item.urModel === 'UR3e'
                ? 'UR3e'
                : 'รุ่นรอยืนยัน';

          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Pedestal */}
              <mesh position={[0, pedestalH / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.24, pedestalH, 16]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#334155'} metalness={0.4} roughness={0.45} />
              </mesh>
              <SchematicURArm
                basePosition={[0, pedestalH, 0]}
                targetOffset={targetOffset}
                gripperClosed={isStationC ? sim.stationUr.gripperClosed : false}
                accentColor={isStationC ? '#3b82f6' : '#64748b'}
                selected={isSelected}
              />
              {viewSettings.showLabels && (
                <Html position={[0, pedestalH + 1.22, 0]} center distanceFactor={17} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-blue-400/70 text-[9px] text-blue-100 whitespace-nowrap shadow">
                    🦾 {isStationC ? 'station UR' : 'reserve UR'} —{' '}
                    <span className={item.urModel === 'UNCONFIRMED' ? 'text-amber-300' : 'text-emerald-300 font-bold'}>
                      {modelTag}
                    </span>
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== REALSENSE CAMERAS WITH ADJUSTABLE FOV FRUSTUM CONE =====
        if (item.category === 'camera') {
          const fovRad = ((item.fovDeg ?? 65) * Math.PI) / 180;
          const range = item.fovRange ?? 4.5;
          const coneRadius = Math.tan(fovRad / 2) * range * 0.72;
          const pitchRad = ((item.pitchDeg ?? 24) * Math.PI) / 180;

          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Camera stand pole */}
              <mesh position={[0, y / 2, 0]}>
                <cylinderGeometry args={[0.03, 0.04, y, 8]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              {/* RealSense body */}
              <group position={[0, y, 0]} rotation={[pitchRad, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.26, 0.09, 0.09]} />
                  <meshStandardMaterial color={isSelected ? '#fbbf24' : '#e2e8f0'} metalness={0.6} roughness={0.3} />
                </mesh>
                {/* Stereo lenses */}
                <mesh position={[-0.07, 0, 0.05]}>
                  <boxGeometry args={[0.04, 0.04, 0.02]} />
                  <meshStandardMaterial color="#020617" />
                </mesh>
                <mesh position={[0.07, 0, 0.05]}>
                  <boxGeometry args={[0.04, 0.04, 0.02]} />
                  <meshStandardMaterial color="#020617" />
                </mesh>
                {/* Adjustable FOV Cone */}
                {viewSettings.showFovCones && (
                  <mesh position={[0, 0, range / 2 + 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[coneRadius, range, 4, 1, true]} />
                    <meshBasicMaterial
                      color={isSelected ? '#fbbf24' : '#06b6d4'}
                      transparent
                      opacity={isSelected ? 0.24 : 0.13}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                    />
                  </mesh>
                )}
              </group>
              {viewSettings.showLabels && (
                <Html position={[0, y + 0.35, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
                  <div className="px-1 py-0.5 rounded bg-cyan-950/85 border border-cyan-400/60 text-[8px] text-cyan-200 whitespace-nowrap shadow">
                    📷 {item.shortLabel}
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== PHOTO SENSOR AT A =====
        if (item.category === 'sensor') {
          return (
            <group
              key={item.id}
              position={[x, y, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              <mesh castShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#f43f5e'} />
              </mesh>
              {/* Sensor beam */}
              <mesh position={[-0.32, 0, 0]}>
                <boxGeometry args={[0.55, 0.025, 0.025]} />
                <meshStandardMaterial
                  color={sim.photoSensorTriggered ? '#22c55e' : '#ef4444'}
                  emissive={sim.photoSensorTriggered ? '#22c55e' : '#ef4444'}
                  emissiveIntensity={1}
                />
              </mesh>
              {viewSettings.showLabels && isSelected && (
                <Html position={[0, 0.34, 0]} center distanceFactor={16} style={{ pointerEvents: 'none' }}>
                  <div className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-400/70 text-[9px] text-rose-200 whitespace-nowrap">
                    ● Photo Sensor: {sim.photoSensorTriggered ? 'ตรวจพบตะกร้า' : 'ว่าง'}
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== ADVANTECH WISE I/O MODULES =====
        if (item.category === 'wise') {
          return (
            <group
              key={item.id}
              position={[x, y, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              <mesh castShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#059669'} roughness={0.4} />
              </mesh>
              {/* Wi-Fi Antenna */}
              <mesh position={[0.06, height / 2 + 0.14, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.28, 8]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              {/* LED */}
              <mesh position={[0, 0.05, depth / 2 + 0.01]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={1} />
              </mesh>
              {viewSettings.showLabels && (
                <Html position={[0, height + 0.25, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
                  <div className="px-1 py-0.5 rounded bg-emerald-950/85 border border-emerald-400/50 text-[8px] text-emerald-200 whitespace-nowrap">
                    ⚡ {item.shortLabel}
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== ROUTERS (~3) =====
        if (item.category === 'router') {
          return (
            <group
              key={item.id}
              position={[x, 0, z]}
              rotation={[0, item.rotationY, 0]}
              onPointerDown={(e) => handleItemPointerDown(item, e)}
            >
              {/* Subtle coverage ring on floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[2.1, 2.22, 32]} />
                <meshBasicMaterial color="#8b5cf6" transparent opacity={isSelected ? 0.45 : 0.14} side={THREE.DoubleSide} />
              </mesh>
              {/* Router body */}
              <group position={[0, y, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={isSelected ? '#fbbf24' : '#7c3aed'} roughness={0.4} />
                </mesh>
                <mesh position={[-0.1, 0.18, -0.05]}>
                  <cylinderGeometry args={[0.014, 0.014, 0.32, 8]} />
                  <meshStandardMaterial color="#e2e8f0" />
                </mesh>
                <mesh position={[0.1, 0.18, -0.05]}>
                  <cylinderGeometry args={[0.014, 0.014, 0.32, 8]} />
                  <meshStandardMaterial color="#e2e8f0" />
                </mesh>
              </group>
              {viewSettings.showLabels && (
                <Html position={[0, y + 0.38, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
                  <div className="px-1 py-0.5 rounded bg-violet-950/85 border border-violet-400/60 text-[8px] text-violet-200 whitespace-nowrap">
                    📡 {item.shortLabel}
                  </div>
                </Html>
              )}
            </group>
          );
        }

        // ===== SOLOMON VISION (OPTIONAL / FUTURE) =====
        return (
          <group
            key={item.id}
            position={[x, 0, z]}
            rotation={[0, item.rotationY, 0]}
            onPointerDown={(e) => handleItemPointerDown(item, e)}
          >
            <mesh position={[0, 0.38, 0]} castShadow>
              <boxGeometry args={[0.6, 0.76, 0.5]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.92, 0]} castShadow>
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial color={isSelected ? '#fbbf24' : '#64748b'} roughness={0.4} />
            </mesh>
            {viewSettings.showLabels && (
              <Html position={[0, 1.32, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
                <div className="px-1 py-0.5 rounded bg-slate-900/90 border border-slate-500/70 text-[8px] text-slate-300 whitespace-nowrap">
                  📦 {item.shortLabel}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
