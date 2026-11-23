import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAP_HEIGHT, MAP_WIDTH } from '../sandbox/presets';
import {
  EditorTool,
  RoutePoint,
  SandboxProject,
  SelectionTarget,
  SimulationFrame,
} from '../sandbox/types';

interface Floor2DCanvasProps {
  project: SandboxProject;
  sim: SimulationFrame;
  isPlaying: boolean;
  activeTool: EditorTool;
  selection: SelectionTarget;
  drawingPoints: RoutePoint[];
  showReachCircles: boolean;
  showAssets: boolean;
  showGrid: boolean;
  onSelect: (target: SelectionTarget) => void;
  onPlaceItem: (x: number, y: number) => void;
  onAddRoutePoint: (x: number, y: number, stationId?: string) => void;
  onFinishRoute: () => void;
  onMoveStation: (id: string, x: number, y: number) => void;
  onMoveRobot: (id: string, x: number, y: number) => void;
  onMoveUR: (id: string, x: number, y: number) => void;
  onMoveAsset: (id: string, x: number, y: number) => void;
  onMoveObject: (id: string, x: number, y: number) => void;
  onMoveRoutePoint: (routeId: string, pointIdx: number, x: number, y: number) => void;
}

type DragState =
  | { kind: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
  | { kind: 'station' | 'robot' | 'ur' | 'asset' | 'object'; id: string }
  | { kind: 'route-pt'; routeId: string; pointIdx: number }
  | null;

export const Floor2DCanvas: React.FC<Floor2DCanvasProps> = ({
  project,
  sim,
  isPlaying,
  activeTool,
  selection,
  drawingPoints,
  showReachCircles,
  showAssets,
  showGrid,
  onSelect,
  onPlaceItem,
  onAddRoutePoint,
  onFinishRoute,
  onMoveStation,
  onMoveRobot,
  onMoveUR,
  onMoveAsset,
  onMoveObject,
  onMoveRoutePoint,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.35);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: -240, y: -55 });
  const [drag, setDrag] = useState<DragState>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setSpacePressed(true);
      }
      if (e.key === 'Enter' && activeTool === 'draw-route' && drawingPoints.length >= 2) {
        onFinishRoute();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeTool, drawingPoints.length, onFinishRoute]);

  const clientToMap = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const mx = (sx - pan.x) / zoom;
      const my = (sy - pan.y) / zoom;
      return {
        x: Math.max(0, Math.min(MAP_WIDTH, Math.round(mx))),
        y: Math.max(0, Math.min(MAP_HEIGHT, Math.round(my))),
      };
    },
    [pan, zoom]
  );

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.max(0.55, Math.min(4.5, zoom * factor));
    const ratio = nextZoom / zoom;

    setPan({
      x: mouseX - (mouseX - pan.x) * ratio,
      y: mouseY - (mouseY - pan.y) * ratio,
    });
    setZoom(nextZoom);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Middle click or Space+Drag = Pan
    if (e.button === 1 || spacePressed) {
      setDrag({
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
      return;
    }

    if (e.button !== 0) return;

    const pt = clientToMap(e.clientX, e.clientY);

    if (activeTool === 'draw-route') {
      // Snap to nearby station if within 16px
      const nearStation = project.stations.find(
        (s) => Math.hypot(s.x - pt.x, s.y - pt.y) < 16
      );
      if (nearStation) {
        onAddRoutePoint(nearStation.x, nearStation.y, nearStation.id);
      } else {
        onAddRoutePoint(pt.x, pt.y);
      }
      return;
    }

    if (activeTool !== 'select') {
      onPlaceItem(pt.x, pt.y);
      return;
    }

    // Clicked empty background in select mode -> pan
    onSelect(null);
    setDrag({
      kind: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = clientToMap(e.clientX, e.clientY);
    setHoverPos(pt);

    if (!drag) return;

    if (drag.kind === 'pan') {
      setPan({
        x: drag.startPanX + (e.clientX - drag.startClientX),
        y: drag.startPanY + (e.clientY - drag.startClientY),
      });
      return;
    }

    if (drag.kind === 'station') onMoveStation(drag.id, pt.x, pt.y);
    else if (drag.kind === 'robot') onMoveRobot(drag.id, pt.x, pt.y);
    else if (drag.kind === 'ur') onMoveUR(drag.id, pt.x, pt.y);
    else if (drag.kind === 'asset') onMoveAsset(drag.id, pt.x, pt.y);
    else if (drag.kind === 'object') onMoveObject(drag.id, pt.x, pt.y);
    else if (drag.kind === 'route-pt') onMoveRoutePoint(drag.routeId, drag.pointIdx, pt.x, pt.y);
  };

  const handlePointerUp = () => {
    setDrag(null);
  };

  const startEntityDrag = (
    e: React.PointerEvent,
    kind: 'station' | 'robot' | 'ur' | 'asset' | 'object',
    id: string
  ) => {
    if (activeTool === 'draw-route') {
      if (kind === 'station') {
        e.stopPropagation();
        const st = project.stations.find((s) => s.id === id);
        if (st) onAddRoutePoint(st.x, st.y, st.id);
      }
      return;
    }
    if (activeTool !== 'select' || spacePressed) return;
    e.stopPropagation();
    onSelect({ type: kind, id });
    if (!isPlaying) {
      setDrag({ kind, id });
    }
  };

  const resetViewToLab = () => {
    setZoom(1.45);
    setPan({ x: -310, y: -65 });
  };

  const fitFullFloor = () => {
    setZoom(0.95);
    setPan({ x: 35, y: 35 });
  };

  // Helper to draw distinguishable Ring (hollow circle) vs Block (chamfered square) 2D icons
  const renderPartGlyph = (type: 'ring' | 'block', cx: number, cy: number, r = 1.65) => {
    if (type === 'ring') {
      return (
        <g pointerEvents="none">
          <circle cx={cx} cy={cy} r={r} fill="#3b82f6" stroke="#1e3a8a" strokeWidth={0.55} />
          <circle cx={cx} cy={cy} r={r * 0.44} fill="#ffffff" stroke="#1e3a8a" strokeWidth={0.35} />
        </g>
      );
    }
    // Chamfered octagon / square block so silhouette reads distinct from ring even in grayscale
    const s = r * 0.95;
    const c = s * 0.35;
    const pts = [
      `${cx - s + c},${cy - s}`,
      `${cx + s - c},${cy - s}`,
      `${cx + s},${cy - s + c}`,
      `${cx + s},${cy + s - c}`,
      `${cx + s - c},${cy + s}`,
      `${cx - s + c},${cy + s}`,
      `${cx - s},${cy + s - c}`,
      `${cx - s},${cy - s + c}`,
    ].join(' ');
    return (
      <g pointerEvents="none">
        <polygon points={pts} fill="#f59e0b" stroke="#78350f" strokeWidth={0.55} />
        <rect
          x={cx - s * 0.35}
          y={cy - s * 0.35}
          width={s * 0.7}
          height={s * 0.7}
          fill="#fef3c7"
          stroke="#78350f"
          strokeWidth={0.25}
        />
      </g>
    );
  };

  // Helper to compute 2-link UR elbow for natural visual look (compact architectural scale)
  const renderURArm2D = (
    baseX: number,
    baseY: number,
    endX: number,
    endY: number,
    accentColor: string,
    isHolding: boolean
  ) => {
    const dx = endX - baseX;
    const dy = endY - baseY;
    const dist = Math.hypot(dx, dy);
    const midX = (baseX + endX) / 2;
    const midY = (baseY + endY) / 2;
    const bend = Math.min(4.5, Math.max(1.2, dist * 0.14));
    const nx = dist > 1 ? -dy / dist : 0;
    const ny = dist > 1 ? dx / dist : 1;
    const elbowX = midX + nx * bend;
    const elbowY = midY + ny * bend;

    return (
      <g pointerEvents="none">
        {/* Base Turret */}
        <circle cx={baseX} cy={baseY} r={2.8} fill="#1e293b" stroke={accentColor} strokeWidth={1.1} />
        {/* Upper Arm */}
        <line
          x1={baseX}
          y1={baseY}
          x2={elbowX}
          y2={elbowY}
          stroke="#cbd5e1"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        {/* Elbow Joint */}
        <circle cx={elbowX} cy={elbowY} r={1.4} fill="#38bdf8" stroke="#0f172a" strokeWidth={0.6} />
        {/* Forearm */}
        <line
          x1={elbowX}
          y1={elbowY}
          x2={endX}
          y2={endY}
          stroke="#e2e8f0"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Gripper Head */}
        <circle
          cx={endX}
          cy={endY}
          r={isHolding ? 2.4 : 1.7}
          fill={isHolding ? '#fbbf24' : '#38bdf8'}
          stroke="#0f172a"
          strokeWidth={0.7}
        />
      </g>
    );
  };

  return (
    <div className="relative w-full h-full bg-[#e8edf5] overflow-hidden select-none">
      <svg
        ref={svgRef}
        className={`w-full h-full ${
          spacePressed || drag?.kind === 'pan'
            ? 'cursor-grabbing'
            : activeTool === 'select'
            ? 'cursor-default'
            : 'cursor-crosshair'
        }`}
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          if (activeTool === 'draw-route' && drawingPoints.length >= 2) {
            onFinishRoute();
          }
        }}
      >
        <defs>
          <pattern id="minorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,116,139,0.16)" strokeWidth="0.6" />
          </pattern>
          <marker
            id="routeArrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="3.6"
            markerHeight="3.6"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="context-stroke" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Architectural Building Floorplan Background */}
          <rect
            x={-20}
            y={-20}
            width={MAP_WIDTH + 40}
            height={MAP_HEIGHT + 40}
            rx={8}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />
          <image
            href={`${import.meta.env.BASE_URL}floor9-clean-plan.png`}
            x={0}
            y={0}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            preserveAspectRatio="none"
          />

          {/* Optional Light Snap Grid */}
          {showGrid && (
            <rect
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="url(#minorGrid)"
              pointerEvents="none"
            />
          )}

          {/* ================= 1. ROUTES LAYER ================= */}
          {project.routes.map((rt) => {
            if (rt.points.length < 2) return null;
            const isSel = selection?.type === 'route' && selection.id === rt.id;
            const d = rt.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            return (
              <g key={rt.id}>
                {/* Wide transparent hit area */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={9}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    if (activeTool !== 'select') return;
                    e.stopPropagation();
                    onSelect({ type: 'route', id: rt.id });
                  }}
                />
                {/* Visible dashed flow path */}
                <path
                  d={d}
                  fill="none"
                  stroke={rt.color}
                  strokeWidth={isSel ? 2.4 : 1.7}
                  strokeDasharray="4.5 3.5"
                  strokeOpacity={isSel ? 1 : 0.8}
                  markerMid="url(#routeArrow)"
                  markerEnd="url(#routeArrow)"
                  pointerEvents="none"
                />
                {/* Draggable waypoints when route is selected */}
                {isSel &&
                  !isPlaying &&
                  rt.points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={3.2}
                      fill="#ffffff"
                      stroke={rt.color}
                      strokeWidth={1.6}
                      className="cursor-move"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setDrag({ kind: 'route-pt', routeId: rt.id, pointIdx: idx });
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {/* In-progress Route Drawing Preview */}
          {activeTool === 'draw-route' && drawingPoints.length > 0 && (
            <g pointerEvents="none">
              <polyline
                points={[
                  ...drawingPoints.map((p) => `${p.x},${p.y}`),
                  ...(hoverPos ? [`${hoverPos.x},${hoverPos.y}`] : []),
                ].join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              {drawingPoints.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              ))}
            </g>
          )}

          {/* ================= 2. IIoT ASSETS LAYER (Compact Micro Markers) ================= */}
          {showAssets &&
            project.assets.map((asset) => {
              const isSel = selection?.type === 'asset' && selection.id === asset.id;
              const fovRange = asset.fovRange ?? 45;
              const fovHalfRad = (((asset.fovDeg ?? 60) / 2) * Math.PI) / 180;
              const x1 = asset.x + Math.cos(asset.angle - fovHalfRad) * fovRange;
              const y1 = asset.y + Math.sin(asset.angle - fovHalfRad) * fovRange;
              const x2 = asset.x + Math.cos(asset.angle + fovHalfRad) * fovRange;
              const y2 = asset.y + Math.sin(asset.angle + fovHalfRad) * fovRange;

              return (
                <g
                  key={asset.id}
                  className={activeTool === 'select' && !isPlaying ? 'cursor-move' : 'cursor-pointer'}
                  onPointerDown={(e) => startEntityDrag(e, 'asset', asset.id)}
                >
                  <title>{asset.name}</title>
                  {asset.kind === 'camera' && (
                    <polygon
                      points={`${asset.x},${asset.y} ${x1},${y1} ${x2},${y2}`}
                      fill={asset.color}
                      fillOpacity={0.11}
                      stroke={asset.color}
                      strokeWidth={0.7}
                      strokeDasharray="2.5 2.5"
                      pointerEvents="none"
                    />
                  )}
                  <circle
                    cx={asset.x}
                    cy={asset.y}
                    r={isSel ? 5.2 : 4}
                    fill={asset.color}
                    stroke={isSel ? '#0f172a' : '#ffffff'}
                    strokeWidth={isSel ? 1.5 : 0.9}
                  />
                  <text
                    x={asset.x}
                    y={asset.y + 1.8}
                    textAnchor="middle"
                    fontSize={4.8}
                    fontWeight="800"
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    {asset.kind === 'sensor'
                      ? 'S'
                      : asset.kind === 'camera'
                      ? 'C'
                      : asset.kind === 'wise'
                      ? 'W'
                      : 'R'}
                  </text>
                  {isSel && (
                    <text
                      x={asset.x}
                      y={asset.y - 7}
                      textAnchor="middle"
                      fontSize={5.5}
                      fontWeight="700"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth={2}
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {asset.name}
                    </text>
                  )}
                </g>
              );
            })}

          {/* ================= 3. STATIONS LAYER (Clean Compact Code Markers A, B, C, D...) ================= */}
          {project.stations.map((st) => {
            const isSel = selection?.type === 'station' && selection.id === st.id;
            const isWait = st.kind === 'wait';
            const isBuffer = st.kind === 'buffer';
            return (
              <g
                key={st.id}
                transform={`translate(${st.x}, ${st.y})`}
                className={activeTool === 'select' && !isPlaying ? 'cursor-move' : 'cursor-pointer'}
                onPointerDown={(e) => startEntityDrag(e, 'station', st.id)}
              >
                <title>{`${st.code} — ${st.name}`}</title>
                {/* Selection ring */}
                {isSel && (
                  <circle
                    r={12.5}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={1.3}
                    strokeDasharray="3 2"
                  />
                )}
                {/* Compact Station Pad */}
                {isBuffer ? (
                  <rect
                    x={-9}
                    y={-6.5}
                    width={18}
                    height={13}
                    rx={2.5}
                    fill={st.color}
                    fillOpacity={0.2}
                    stroke={st.color}
                    strokeWidth={1.3}
                  />
                ) : (
                  <circle
                    r={isWait ? 7.5 : 8.8}
                    fill={st.color}
                    fillOpacity={0.2}
                    stroke={st.color}
                    strokeWidth={1.3}
                    strokeDasharray={isWait ? '2.5 1.8' : undefined}
                  />
                )}
                {/* Solid Color Center Badge with Code ONLY (clean, no long text clutter) */}
                <circle r={5.4} fill={st.color} stroke="#ffffff" strokeWidth={1} />
                <text
                  y={2.1}
                  textAnchor="middle"
                  fontSize={st.code.length > 2 ? 4.8 : 6}
                  fontWeight="800"
                  fill="#ffffff"
                  pointerEvents="none"
                >
                  {st.code}
                </text>
                {/* Show full name ONLY when selected */}
                {isSel && (
                  <text
                    y={15}
                    textAnchor="middle"
                    fontSize={5.8}
                    fontWeight="700"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={2.2}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {st.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* ================= 4. STATIONARY UR ARMS (Compact UR ตั้งโต๊ะ) ================= */}
          {project.stationURs.map((ur) => {
            const isSel = selection?.type === 'ur' && selection.id === ur.id;
            const rtState = sim.stationURs[ur.id];
            const endX = rtState?.armEndX ?? ur.x + 9;
            const endY = rtState?.armEndY ?? ur.y - 5;
            const isHolding = Boolean(rtState?.holdingObjectId || rtState?.holdingPartType);

            return (
              <g
                key={ur.id}
                className={activeTool === 'select' && !isPlaying ? 'cursor-move' : 'cursor-pointer'}
                onPointerDown={(e) => startEntityDrag(e, 'ur', ur.id)}
              >
                <title>{`${ur.name} (UR ตั้งโต๊ะ)`}</title>
                {/* Reach Radius Circle */}
                {(showReachCircles || isSel) && (
                  <circle
                    cx={ur.x}
                    cy={ur.y}
                    r={ur.reach}
                    fill={ur.color}
                    fillOpacity={0.06}
                    stroke={ur.color}
                    strokeWidth={0.8}
                    strokeDasharray="3 3"
                    pointerEvents="none"
                  />
                )}
                {/* Compact Table Pedestal Base */}
                <rect
                  x={ur.x - 6}
                  y={ur.y - 6}
                  width={12}
                  height={12}
                  rx={2}
                  fill="#334155"
                  stroke={isSel ? '#0f172a' : ur.color}
                  strokeWidth={isSel ? 1.8 : 1.2}
                />
                {/* Articulated 2D UR Arm */}
                {renderURArm2D(ur.x, ur.y, endX, endY, ur.color, isHolding)}
                {/* Compact Tag */}
                <text
                  x={ur.x}
                  y={ur.y + 11.5}
                  textAnchor="middle"
                  fontSize={5.2}
                  fontWeight="700"
                  fill="#1d4ed8"
                  stroke="#ffffff"
                  strokeWidth={2}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {ur.name}
                </text>
              </g>
            );
          })}

          {/* ================= 5. AMRs (สี่เหลี่ยมสีเทาขนาดกะทัดรัด + แถบสี + UR บนหัว) ================= */}
          {project.robots.map((robot) => {
            const isSel = selection?.type === 'robot' && selection.id === robot.id;
            const rState = sim.robots[robot.id];
            const useLivePose = isPlaying || sim.time > 0;
            const rx = useLivePose ? (rState?.x ?? robot.x) : robot.x;
            const ry = useLivePose ? (rState?.y ?? robot.y) : robot.y;
            const angle = useLivePose ? (rState?.angle ?? robot.angle) : robot.angle;
            const deg = (angle * 180) / Math.PI;
            const hasUR = robot.kind === 'amr-ur';
            const armEndX = useLivePose
              ? (rState?.armEndX ?? rx + Math.cos(angle) * 8)
              : rx + Math.cos(angle) * 8;
            const armEndY = useLivePose
              ? (rState?.armEndY ?? ry + Math.sin(angle) * 8)
              : ry + Math.sin(angle) * 8;
            const isArmHolding = Boolean(rState?.armHoldingObjectId);

            return (
              <g
                key={robot.id}
                className={activeTool === 'select' && !isPlaying ? 'cursor-move' : 'cursor-pointer'}
                onPointerDown={(e) => startEntityDrag(e, 'robot', robot.id)}
              >
                <title>{`${robot.name}${hasUR ? ' (AMR+UR)' : ' (AMR)'}`}</title>
                {/* Mobile UR Reach Radius */}
                {hasUR && (showReachCircles || isSel) && (
                  <circle
                    cx={rx}
                    cy={ry}
                    r={robot.urReach ?? 30}
                    fill={robot.color}
                    fillOpacity={0.05}
                    stroke={robot.color}
                    strokeWidth={0.8}
                    strokeDasharray="2.5 2.5"
                    pointerEvents="none"
                  />
                )}

                {/* Compact AMR Grey Rectangular Body rotated along heading */}
                <g transform={`translate(${rx}, ${ry}) rotate(${deg})`}>
                  {isSel && (
                    <rect
                      x={-10.5}
                      y={-8}
                      width={21}
                      height={16}
                      rx={3}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={1.3}
                      strokeDasharray="2.5 1.5"
                    />
                  )}
                  {/* Main Grey Chassis (~16 x 11 px scaled proportionally to Floor 9 corridors) */}
                  <rect
                    x={-8}
                    y={-5.5}
                    width={16}
                    height={11}
                    rx={2}
                    fill="#64748b"
                    stroke="#1e293b"
                    strokeWidth={1.1}
                  />
                  {/* Color Identity Bumper / Front Strip */}
                  <rect x={4.5} y={-5} width={3} height={10} rx={0.8} fill={robot.color} />
                  {/* Heading Arrow on Front */}
                  <polygon points="8.5,0 5.5,-1.8 5.5,1.8" fill="#ffffff" />
                  {/* Inner Deck Area */}
                  <rect
                    x={-6}
                    y={-3.8}
                    width={9.5}
                    height={7.6}
                    rx={1}
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth={0.5}
                  />
                </g>

                {/* If AMR has UR on top, draw compact Mobile UR Arm */}
                {hasUR && renderURArm2D(rx, ry, armEndX, armEndY, robot.color, isArmHolding)}

                {/* Compact Robot ID Tag */}
                <g transform={`translate(${rx}, ${ry - 9.5})`} pointerEvents="none">
                  <rect
                    x={hasUR ? -12.5 : -8.5}
                    y={-4.2}
                    width={hasUR ? 25 : 17}
                    height={7.5}
                    rx={3.5}
                    fill={robot.color}
                    stroke="#ffffff"
                    strokeWidth={0.7}
                  />
                  <text
                    y={1.5}
                    textAnchor="middle"
                    fontSize={5}
                    fontWeight="800"
                    fill="#ffffff"
                  >
                    {robot.name}
                    {hasUR ? '+UR' : ''}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ================= 6. OBJECTS / KITTING TRAY S1-S3 + PARTS LAYER ================= */}
          {project.objects.map((obj) => {
            const isSel = selection?.type === 'object' && selection.id === obj.id;
            const oState = sim.objects[obj.id];
            const ox = oState?.x ?? obj.x;
            const oy = oState?.y ?? obj.y;
            const holderType = oState?.holderType ?? 'free';
            const isHeldByUR = holderType === 'ur-mobile' || holderType === 'ur-station';
            const isOnAMR = holderType === 'amr';
            const isTray = Boolean(oState?.isKittingTray);
            const slots = oState?.traySlots;
            const kitting = sim.kitting?.trayObjectId === obj.id ? sim.kitting : undefined;

            return (
              <g
                key={obj.id}
                transform={`translate(${ox}, ${oy})`}
                className={activeTool === 'select' && !isPlaying ? 'cursor-move' : 'cursor-pointer'}
                onPointerDown={(e) => startEntityDrag(e, 'object', obj.id)}
              >
                <title>{`${obj.name} (${oState?.holderLabel ?? ''})`}</title>

                {isTray ? (
                  <>
                    {/* Kitting Tray S1-S3 visual (carries placed rings & blocks cleanly!) */}
                    {(isHeldByUR || isOnAMR || isSel) && (
                      <rect
                        x={-8.8}
                        y={-5.4}
                        width={17.6}
                        height={10.8}
                        rx={2}
                        fill="none"
                        stroke={isHeldByUR ? '#ef4444' : isOnAMR ? '#22c55e' : '#0f172a'}
                        strokeWidth={1.1}
                      />
                    )}
                    {/* Tray outer frame */}
                    <rect
                      x={-7.2}
                      y={-3.9}
                      width={14.4}
                      height={7.8}
                      rx={1.4}
                      fill="#ecfdf5"
                      stroke="#059669"
                      strokeWidth={1.1}
                    />
                    {/* 3 Sub-pockets S1, S2, S3 */}
                    {(['S1', 'S2', 'S3'] as const).map((slotId, idx) => {
                      const sx = (idx - 1) * 4.2;
                      const partType = slots?.[slotId] ?? null;
                      const isMissingHighlight =
                        kitting?.qcStatus === 'hold' && kitting.missingSlots.includes(slotId);
                      return (
                        <g key={slotId}>
                          <rect
                            x={sx - 1.85}
                            y={-2.2}
                            width={3.7}
                            height={4.4}
                            rx={0.6}
                            fill={isMissingHighlight ? '#fee2e2' : '#0f172a'}
                            fillOpacity={isMissingHighlight ? 0.95 : 0.14}
                            stroke={isMissingHighlight ? '#dc2626' : '#64748b'}
                            strokeWidth={isMissingHighlight ? 0.8 : 0.45}
                          />
                          {partType && renderPartGlyph(partType, sx, 0, 1.45)}
                        </g>
                      );
                    })}

                    {/* Simulated QC Inspection Frame & Result Badge around Tray when parked at A */}
                    {kitting?.showQcFrame && (
                      <g pointerEvents="none">
                        <rect
                          x={-9.5}
                          y={-6.2}
                          width={19}
                          height={12.4}
                          rx={2.2}
                          fill="none"
                          stroke={
                            kitting.qcStatus === 'pass'
                              ? '#16a34a'
                              : kitting.qcStatus === 'hold'
                              ? '#dc2626'
                              : '#0284c7'
                          }
                          strokeWidth={1.3}
                          strokeDasharray={kitting.qcStatus === 'inspecting' ? '2.5 1.5' : undefined}
                        />
                        {kitting.qcStatus === 'inspecting' && (
                          <line
                            x1={-8 + kitting.scanProgress * 16}
                            y1={-5.8}
                            x2={-8 + kitting.scanProgress * 16}
                            y2={5.8}
                            stroke="#38bdf8"
                            strokeWidth={1.1}
                          />
                        )}
                        {/* Compact QC Result Pill above tray */}
                        <g transform="translate(0, -10.2)">
                          <rect
                            x={kitting.qcStatus === 'hold' ? -22 : -18}
                            y={-4.2}
                            width={kitting.qcStatus === 'hold' ? 44 : 36}
                            height={7.4}
                            rx={3.5}
                            fill={
                              kitting.qcStatus === 'pass'
                                ? '#16a34a'
                                : kitting.qcStatus === 'hold'
                                ? '#dc2626'
                                : '#0284c7'
                            }
                            stroke="#ffffff"
                            strokeWidth={0.7}
                          />
                          <text
                            y={1.2}
                            textAnchor="middle"
                            fontSize={4.6}
                            fontWeight="800"
                            fill="#ffffff"
                          >
                            {kitting.qcStatus === 'pass'
                              ? 'QC ผ่าน'
                              : kitting.qcStatus === 'hold'
                              ? `QC ค้าง • ขาด ${kitting.missingSlots.join(',')}`
                              : 'กำลังตรวจ...'}
                          </text>
                        </g>
                      </g>
                    )}
                  </>
                ) : (
                  <>
                    {/* Standard Basket / Object Box */}
                    {(isHeldByUR || isOnAMR || isSel) && (
                      <rect
                        x={-5.8}
                        y={-4.6}
                        width={11.6}
                        height={9.2}
                        rx={1.8}
                        fill="none"
                        stroke={isHeldByUR ? '#ef4444' : isOnAMR ? '#22c55e' : '#0f172a'}
                        strokeWidth={1.2}
                      />
                    )}
                    <rect
                      x={-4.2}
                      y={-3.3}
                      width={8.4}
                      height={6.6}
                      rx={1.2}
                      fill={obj.color}
                      stroke="#78350f"
                      strokeWidth={1}
                    />
                    <line x1={-4.2} y1={0} x2={4.2} y2={0} stroke="#92400e" strokeWidth={0.6} />
                    <line x1={0} y1={-3.3} x2={0} y2={3.3} stroke="#92400e" strokeWidth={0.6} />
                  </>
                )}

                {/* Show small label only when selected or actively held by UR */}
                {(isSel || isHeldByUR) && !kitting?.showQcFrame && (
                  <text
                    y={-6.8}
                    textAnchor="middle"
                    fontSize={5}
                    fontWeight="700"
                    fill={isHeldByUR ? '#b91c1c' : '#92400e'}
                    stroke="#ffffff"
                    strokeWidth={1.8}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {obj.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* ================= 7. KITTING PARTS AT FEED STATION (F) & HELD BY UR-A ================= */}
          {sim.kitting?.enabled &&
            sim.kitting.parts
              .filter((p) => p.location === 'feed' || p.location === 'ur')
              .map((part) => (
                <g key={part.id} pointerEvents="none">
                  {part.location === 'ur' && (
                    <circle
                      cx={part.x}
                      cy={part.y}
                      r={2.8}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={0.8}
                    />
                  )}
                  {renderPartGlyph(part.type, part.x, part.y, part.location === 'ur' ? 1.85 : 1.7)}
                </g>
              ))}
        </g>
      </svg>

      {/* Floating Zoom / View Controls (Top-Right of Canvas) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 text-slate-100 px-2 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(4.5, z * 1.2))}
          className="px-2 py-0.5 rounded hover:bg-slate-700 font-bold"
          title="ซูมเข้า"
        >
          +
        </button>
        <span className="font-mono text-[11px] w-11 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.55, z * 0.83))}
          className="px-2 py-0.5 rounded hover:bg-slate-700 font-bold"
          title="ซูมออก"
        >
          −
        </button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={resetViewToLab}
          className="px-2 py-0.5 rounded hover:bg-slate-700 text-[11px]"
        >
          โฟกัสโซน Lab
        </button>
        <button
          onClick={fitFullFloor}
          className="px-2 py-0.5 rounded hover:bg-slate-700 text-[11px]"
        >
          ทั้งชั้น 9
        </button>
      </div>

      {/* Active Tool Banner (Top-Left of Canvas) */}
      {activeTool !== 'select' && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium">
          {activeTool === 'draw-route' ? (
            <>
              <span>✏️ คลิกบนผังเพื่อวางจุดเส้นทาง (คลิกสถานีเพื่อ Snap) · ดับเบิลคลิกหรือกดปุ่มเพื่อจบเส้น</span>
              {drawingPoints.length >= 2 && (
                <button
                  onClick={onFinishRoute}
                  className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300"
                >
                  บันทึกเส้นทาง ({drawingPoints.length} จุด)
                </button>
              )}
            </>
          ) : (
            <span>📍 คลิกตำแหน่งบนผังชั้น 9 เพื่อวางอุปกรณ์ที่เลือก</span>
          )}
        </div>
      )}

      {/* Compact Legend (Bottom-Left of Canvas) */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] flex flex-wrap items-center gap-3 shadow-lg pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-2.5 rounded-sm bg-slate-500 border border-slate-300" />
          AMR (สี่เหลี่ยมเทา + แถบสี)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
          แขน UR (บนรถ / ตั้งโต๊ะ)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm bg-amber-400 border border-amber-800" />
          Object / ตะกร้า (📦 บนรถ · 🦾 แขน UR ถือ)
        </span>
        <span className="text-slate-400">
          ลากพื้น/Space เพื่อแพน · Scroll ซูม
        </span>
      </div>
    </div>
  );
};
