import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls, useTexture } from '@react-three/drei';
type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;
import {
  FLOOR9_COLUMNS,
  FLOOR_ZONES,
  MAP_WORLD_D,
  MAP_WORLD_W,
  ORIGINAL_MAP_OVERLAYS,
  UNVERIFIED_ZONES,
} from '../data/floor9Geometry';
import {
  CameraPreset,
  ScaleCalibration,
  SceneItem,
  SimulationSnapshot,
  ViewSettings,
  WallSegment,
} from '../types';
import { AMRUnit3D, BasketMesh, EquipmentLayer3D, FlowRoutes3D } from './RobotsAndEquipment3D';

interface Scene3DProps {
  items: SceneItem[];
  walls: WallSegment[];
  sim: SimulationSnapshot;
  viewSettings: ViewSettings;
  scale: ScaleCalibration;
  selectedId: string | null;
  selectedWallId: string | null;
  editMode: boolean;
  calibrationMode: boolean;
  cameraPreset: CameraPreset;
  cameraPresetTrigger: number;
  focusTarget: [number, number, number] | null;
  onSelectItem: (id: string | null) => void;
  onSelectWall: (id: string | null) => void;
  onMoveItem: (id: string, x: number, z: number) => void;
  onCalibrationClick: (x: number, z: number) => void;
}

/**
 * Loads public/floor9-reference.jpg cleanly onto a floor plane matching MAP_WORLD_W x MAP_WORLD_D
 */
const ReferenceFloorPlane: React.FC<{ opacity: number }> = ({ opacity }) => {
  const texture = useTexture('/floor9-reference.jpg');
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
      <planeGeometry args={[MAP_WORLD_W, MAP_WORLD_D]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

/**
 * Smooth camera preset & focus controller
 */
const CameraRig: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  preset: CameraPreset;
  trigger: number;
  focusTarget: [number, number, number] | null;
}> = ({ controlsRef, preset, trigger, focusTarget }) => {
  const { camera } = useThree();
  const animState = useRef<{
    active: boolean;
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
  }>({
    active: false,
    targetPos: new THREE.Vector3(14, 24, 24),
    targetLook: new THREE.Vector3(12, 0, 1.5),
  });

  useEffect(() => {
    if (!preset) return;
    if (preset === 'top') {
      animState.current = {
        active: true,
        targetPos: new THREE.Vector3(0, 86, 0.01),
        targetLook: new THREE.Vector3(0, 0, 0),
      };
    } else if (preset === 'isometric') {
      animState.current = {
        active: true,
        targetPos: new THREE.Vector3(16, 23, 24),
        targetLook: new THREE.Vector3(13, 0, 1.2),
      };
    } else if (preset === 'focus-right') {
      animState.current = {
        active: true,
        targetPos: new THREE.Vector3(14.5, 16.5, 16.5),
        targetLook: new THREE.Vector3(14.0, 0, 1.8),
      };
    } else if (preset === 'reset') {
      animState.current = {
        active: true,
        targetPos: new THREE.Vector3(8, 36, 36),
        targetLook: new THREE.Vector3(4, 0, 1),
      };
    }
  }, [preset, trigger]);

  useEffect(() => {
    if (!focusTarget) return;
    animState.current = {
      active: true,
      targetPos: new THREE.Vector3(focusTarget[0] + 5, 11, focusTarget[2] + 9),
      targetLook: new THREE.Vector3(focusTarget[0], 0.4, focusTarget[2]),
    };
  }, [focusTarget]);

  useFrame((_, delta) => {
    if (!animState.current.active || !controlsRef.current) return;
    const lerpAmt = Math.min(1, delta * 6);
    camera.position.lerp(animState.current.targetPos, lerpAmt);
    controlsRef.current.target.lerp(animState.current.targetLook, lerpAmt);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(animState.current.targetPos) < 0.08 &&
      controlsRef.current.target.distanceTo(animState.current.targetLook) < 0.08
    ) {
      camera.position.copy(animState.current.targetPos);
      controlsRef.current.target.copy(animState.current.targetLook);
      controlsRef.current.update();
      animState.current.active = false;
    }
  });

  return null;
};

/**
 * Cutaway Walls & Doorways + Structural Columns
 */
const Floor9Architecture3D: React.FC<{
  walls: WallSegment[];
  viewSettings: ViewSettings;
  selectedWallId: string | null;
  editMode: boolean;
  onSelectWall: (id: string) => void;
}> = ({ walls, viewSettings, selectedWallId, editMode, onSelectWall }) => {
  const wallH = viewSettings.wallHeight;
  const opacity = viewSettings.wallOpacity;

  return (
    <group>
      {/* Subtle architectural room floor pads (only strongly visible when reference map is off/dimmed) */}
      {FLOOR_ZONES.map((z) => (
        <mesh key={z.id} rotation={[-Math.PI / 2, 0, 0]} position={[z.x, 0.004, z.z]}>
          <planeGeometry args={[z.w, z.d]} />
          <meshStandardMaterial color={z.color} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}

      {/* Cutaway Walls & Doorway Thresholds */}
      {walls.map((w) => {
        const dx = w.x2 - w.x1;
        const dz = w.z2 - w.z1;
        const length = Math.hypot(dx, dz);
        if (length < 0.02) return null;
        const cx = (w.x1 + w.x2) / 2;
        const cz = (w.z1 + w.z2) / 2;
        const angle = -Math.atan2(dz, dx);
        const isSelected = selectedWallId === w.id;

        if (w.isDoorway) {
          return (
            <group
              key={w.id}
              position={[cx, 0, cz]}
              rotation={[0, angle, 0]}
              onClick={(e) => {
                if (!editMode) return;
                e.stopPropagation();
                onSelectWall(w.id);
              }}
            >
              {/* Threshold bar */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[length, 0.04, w.thickness + 0.06]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#38bdf8'} transparent opacity={0.65} />
              </mesh>
              {/* Door jamb posts */}
              <mesh position={[-length / 2 + 0.04, wallH / 2, 0]}>
                <boxGeometry args={[0.08, wallH, w.thickness + 0.06]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#7dd3fc'} transparent opacity={opacity} />
              </mesh>
              <mesh position={[length / 2 - 0.04, wallH / 2, 0]}>
                <boxGeometry args={[0.08, wallH, w.thickness + 0.06]} />
                <meshStandardMaterial color={isSelected ? '#fbbf24' : '#7dd3fc'} transparent opacity={opacity} />
              </mesh>
            </group>
          );
        }

        return (
          <mesh
            key={w.id}
            position={[cx, wallH / 2, cz]}
            rotation={[0, angle, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelectWall(w.id);
            }}
          >
            <boxGeometry args={[length, wallH, w.thickness]} />
            <meshStandardMaterial
              color={isSelected ? '#fbbf24' : '#94a3b8'}
              roughness={0.55}
              metalness={0.1}
              transparent={opacity < 0.99}
              opacity={opacity}
            />
          </mesh>
        );
      })}

      {/* Structural Columns */}
      {FLOOR9_COLUMNS.map((c) => (
        <mesh key={c.id} position={[c.x, (wallH + 0.12) / 2, c.z]} castShadow receiveShadow>
          <boxGeometry args={[c.w, wallH + 0.12, c.d]} />
          <meshStandardMaterial
            color="#64748b"
            roughness={0.5}
            transparent={opacity < 0.99}
            opacity={opacity}
          />
        </mesh>
      ))}

      {/* Unverified Scan Zones ("พื้นที่รอตรวจ") */}
      {viewSettings.showUnverifiedZones &&
        UNVERIFIED_ZONES.map((uz) => (
          <group key={uz.id} position={[uz.x, 0, uz.z]}>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[uz.w, 0.32, uz.d]} />
              <meshStandardMaterial
                color="#f59e0b"
                transparent
                opacity={0.18}
                wireframe={false}
              />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[uz.w, 0.32, uz.d]} />
              <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.45} />
            </mesh>
            {viewSettings.showLabels && (
              <Html position={[0, 0.55, 0]} center distanceFactor={38} style={{ pointerEvents: 'none' }}>
                <div className="px-1.5 py-0.5 rounded bg-amber-950/85 border border-amber-500/60 text-[8px] text-amber-200 whitespace-nowrap">
                  ⚠ พื้นที่รอตรวจ
                </div>
              </Html>
            )}
          </group>
        ))}
    </group>
  );
};

/**
 * Original Map Overlays (Red Zone, Green Preferred Path, Blue MiR Markers, Yellow/Gray Dock Icons)
 */
const OriginalOverlays3D: React.FC<{ showLabels: boolean }> = ({ showLabels }) => {
  const { redZone, greenPath, blueMarkers, yellowDock, grayMarker } = ORIGINAL_MAP_OVERLAYS;
  const greenPts = useMemo(
    () => greenPath.map(([x, z]) => new THREE.Vector3(x, 0.045, z)),
    [greenPath]
  );

  return (
    <group>
      {/* Red Forbidden Zone */}
      <group position={[redZone.x, 0.04, redZone.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[redZone.w, redZone.d]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.38} side={THREE.DoubleSide} />
        </mesh>
        {showLabels && (
          <Html position={[0, 0.35, 0]} center distanceFactor={32} style={{ pointerEvents: 'none' }}>
            <div className="px-1.5 py-0.5 rounded bg-red-950/90 border border-red-400/70 text-[8px] text-red-200 whitespace-nowrap">
              Red Zone (ผังเดิม)
            </div>
          </Html>
        )}
      </group>

      {/* Green Preferred Path */}
      <Line points={greenPts} color="#4ade80" lineWidth={4} />

      {/* 10 Blue MiR Position Markers */}
      {blueMarkers.map((m) => (
        <mesh key={m.id} rotation={[-Math.PI / 2, 0, 0]} position={[m.x, 0.045, m.z]}>
          <circleGeometry args={[0.28, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.78} />
        </mesh>
      ))}

      {/* Yellow Charger/Dock & Gray Marker */}
      <mesh position={[yellowDock.x, 0.12, yellowDock.z]}>
        <boxGeometry args={[yellowDock.w, 0.24, yellowDock.d]} />
        <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[grayMarker.x, 0.1, grayMarker.z]}>
        <boxGeometry args={[grayMarker.w, 0.2, grayMarker.d]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
};

/**
 * 2-Point Scale Calibration Overlay in 3D
 */
const ScaleCalibration3D: React.FC<{ scale: ScaleCalibration }> = ({ scale }) => {
  if (!scale.pointA) return null;
  const pA = scale.pointA;
  const pB = scale.pointB;
  const distBase = pB ? Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) : 0;
  const distDisplay = scale.isCalibrated
    ? `${(distBase * scale.metersPerBaseUnit).toFixed(2)} m`
    : `${distBase.toFixed(2)} หน่วยสัมพัทธ์`;

  return (
    <group>
      <mesh position={[pA[0], 0.35, pA[1]]}>
        <cylinderGeometry args={[0.12, 0.12, 0.7, 12]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} />
      </mesh>
      {pB && (
        <>
          <mesh position={[pB[0], 0.35, pB[1]]}>
            <cylinderGeometry args={[0.12, 0.12, 0.7, 12]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} />
          </mesh>
          <Line
            points={[new THREE.Vector3(pA[0], 0.25, pA[1]), new THREE.Vector3(pB[0], 0.25, pB[1])]}
            color="#22d3ee"
            lineWidth={3}
          />
          <Html
            position={[(pA[0] + pB[0]) / 2, 0.85, (pA[1] + pB[1]) / 2]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="px-2 py-0.5 rounded bg-cyan-950/95 border border-cyan-400 text-[10px] font-mono text-cyan-100 whitespace-nowrap shadow">
              📏 {distDisplay}
            </div>
          </Html>
        </>
      )}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({
  items,
  walls,
  sim,
  viewSettings,
  scale,
  selectedId,
  selectedWallId,
  editMode,
  calibrationMode,
  cameraPreset,
  cameraPresetTrigger,
  focusTarget,
  onSelectItem,
  onSelectWall,
  onMoveItem,
  onCalibrationClick,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const m1Item = items.find((i) => i.id === 'amr-m1')!;
  const m2Item = items.find((i) => i.id === 'amr-m2')!;
  const m3Item = items.find((i) => i.id === 'amr-m3')!;
  const mobileUrItem = items.find((i) => i.id === 'ur-mobile');

  const handleFloorPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId || !editMode) return;
    e.stopPropagation();
    let nx = e.point.x;
    let nz = e.point.z;
    if (viewSettings.gridSnap && viewSettings.snapSize > 0) {
      nx = Math.round(nx / viewSettings.snapSize) * viewSettings.snapSize;
      nz = Math.round(nz / viewSettings.snapSize) * viewSettings.snapSize;
    }
    onMoveItem(draggingId, Number(nx.toFixed(3)), Number(nz.toFixed(3)));
  };

  const handleFloorPointerUp = () => {
    if (draggingId) setDraggingId(null);
  };

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (calibrationMode) {
      e.stopPropagation();
      onCalibrationClick(Number(e.point.x.toFixed(3)), Number(e.point.z.toFixed(3)));
      return;
    }
    if (!draggingId) {
      onSelectItem(null);
      onSelectWall(null);
    }
  };

  return (
    <div
      className={`w-full h-full relative ${
        calibrationMode ? 'cursor-crosshair' : draggingId ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onPointerUp={handleFloorPointerUp}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [16, 23, 24], fov: 42, near: 0.2, far: 300 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0b1120']} />
        <fog attach="fog" args={['#0b1120', 85, 180]} />

        {/* Balanced studio & architectural lighting */}
        <ambientLight intensity={0.72} />
        <directionalLight
          position={[25, 42, 22]}
          intensity={1.15}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight position={[-25, 18, -18]} intensity={0.4} color="#93c5fd" />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!draggingId}
          target={[13, 0, 1.2]}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={3}
          maxDistance={120}
          enableDamping
          dampingFactor={0.08}
        />

        <CameraRig
          controlsRef={controlsRef}
          preset={cameraPreset}
          trigger={cameraPresetTrigger}
          focusTarget={focusTarget}
        />

        {/* Base Floor Slab + Interactive Drag / Calibration Plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
          onPointerMove={handleFloorPointerMove}
          onPointerUp={handleFloorPointerUp}
          onClick={handleFloorClick}
        >
          <planeGeometry args={[MAP_WORLD_W + 12, MAP_WORLD_D + 12]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>

        {/* Subtle Engineering Grid */}
        <Grid
          position={[0, 0.002, 0]}
          args={[MAP_WORLD_W + 10, MAP_WORLD_D + 10]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={110}
        />

        {/* Original Floor 9 Reference Image Overlay */}
        {viewSettings.showReferenceImage && (
          <Suspense fallback={null}>
            <ReferenceFloorPlane opacity={viewSettings.referenceImageOpacity} />
          </Suspense>
        )}

        {/* Floor 9 Cutaway Walls, Columns & Unverified Scan Zones */}
        <Floor9Architecture3D
          walls={walls}
          viewSettings={viewSettings}
          selectedWallId={selectedWallId}
          editMode={editMode}
          onSelectWall={(id) => {
            onSelectItem(null);
            onSelectWall(id);
          }}
        />

        {/* Original Red/Green/Blue Overlays from Reference Image */}
        {viewSettings.showOriginalOverlays && (
          <OriginalOverlays3D showLabels={viewSettings.showLabels} />
        )}

        {/* Flow Routes A<->B and B<->C */}
        {viewSettings.showRoutes && (
          <FlowRoutes3D routeAB={sim.routeAB} routeBC={sim.routeBC} />
        )}

        {/* Stations, Station C UR, Reserve UR, RealSense Cameras, WISE, Routers, Photo Sensor, Solomon */}
        <EquipmentLayer3D
          items={items}
          sim={sim}
          viewSettings={viewSettings}
          selectedId={selectedId}
          editMode={editMode}
          onSelect={(id) => {
            onSelectWall(null);
            onSelectItem(id);
          }}
          onStartDrag={(id) => {
            setDraggingId(id);
          }}
        />

        {/* 3 Animated AMRs (M1 Green + Mobile UR, M2 Orange, M3 Blue) */}
        <AMRUnit3D
          pose={sim.robots.m1}
          item={m1Item}
          isMobileUr
          urItem={mobileUrItem}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelectWall(null);
            onSelectItem(id);
          }}
          showLabels={viewSettings.showLabels}
        />
        <AMRUnit3D
          pose={sim.robots.m2}
          item={m2Item}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelectWall(null);
            onSelectItem(id);
          }}
          showLabels={viewSettings.showLabels}
        />
        <AMRUnit3D
          pose={sim.robots.m3}
          item={m3Item}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelectWall(null);
            onSelectItem(id);
          }}
          showLabels={viewSettings.showLabels}
        />

        {/* Animated Baskets changing ownership across A -> M1 -> B -> M2/M3 -> C/D */}
        {sim.baskets.map((basket) => (
          <BasketMesh key={basket.id} basket={basket} showLabels={viewSettings.showLabels} />
        ))}

        {/* 2-Point Scale Calibration Visual */}
        <ScaleCalibration3D scale={scale} />
      </Canvas>
    </div>
  );
};
