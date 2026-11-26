import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import { Orbit } from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { getPlanet, PLANETS } from "../science/planets";
import { orbitPath, orbitalPosition } from "../science/orbit";
import { BODY_RENDER_RADIUS, displayPosition } from "../science/scale";
import type { BodyId, PlanetData, Vector3Au } from "../science/types";
import { readSimulationClock } from "../state/clock";

interface SolarSystem3DProps {
  scaleMode: "cinematic" | "distance";
  selectedBody: BodyId | null;
  focusedBody: BodyId | null;
  onSelect: (id: BodyId | null) => void;
  onFocusChange: (id: BodyId | null) => void;
  onRequestMap: () => void;
  controlsRef: React.RefObject<OrbitControlsImpl>;
}

class RendererBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function WebGLFallback({ onRequestMap }: { onRequestMap: () => void }) {
  return (
    <div className="webgl-fallback">
      <div className="fallback-orbit"><Orbit size={24} /></div>
      <h2>3D rendering is unavailable</h2>
      <p>This browser or device could not create a WebGL context. The synchronized orbital map is still available.</p>
      <button onClick={onRequestMap}>Open orbital map</button>
    </div>
  );
}

function toVector(position: Vector3Au, mode: "cinematic" | "distance"): [number, number, number] {
  const scaled = displayPosition(position, mode);
  return [scaled.x, scaled.y, scaled.z];
}

function OrbitPath({ planet, mode, selected }: { planet: PlanetData; mode: "cinematic" | "distance"; selected: boolean }) {
  const points = useMemo(() => orbitPath(planet.orbitalElements, 240).map((point) =>
    new THREE.Vector3(...toVector(point, mode))), [planet, mode]);
  return <Line points={points} color={planet.color} transparent opacity={selected ? 0.58 : 0.2} lineWidth={selected ? 1.4 : 0.8} />;
}

function PlanetMesh({
  planet, mode, selected, onSelect,
}: {
  planet: PlanetData;
  mode: "cinematic" | "distance";
  selected: boolean;
  onSelect: (id: BodyId) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const radius = BODY_RENDER_RADIUS[planet.id];
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: planet.visual.baseColor,
    roughness: planet.visual.roughness,
    metalness: 0.02,
  }), [planet]);

  useFrame(() => {
    const current = orbitalPosition(planet.orbitalElements, readSimulationClock());
    group.current?.position.set(...toVector(current, mode));
  });

  return (
    <group ref={group}>
      {planet.visual.atmosphereColor && (
        <mesh scale={selected ? 1.16 : 1.11}>
          <sphereGeometry args={[radius, 28, 28]} />
          <meshBasicMaterial color={planet.visual.atmosphereColor} transparent opacity={0.1} side={THREE.BackSide} />
        </mesh>
      )}
      <mesh
        onClick={(event) => { event.stopPropagation(); onSelect(planet.id); }}
        scale={selected ? 1.22 : 1}
        material={material}
      >
        <sphereGeometry args={[radius, 36, 36]} />
      </mesh>
      {planet.visual.ringColor && (
        <mesh rotation={[Math.PI / 2.15, 0, 0]}>
          <ringGeometry args={[radius * (planet.visual.ringInnerRadius ?? 1.3), radius * (planet.visual.ringOuterRadius ?? 2), 80]} />
          <meshStandardMaterial color={planet.visual.ringColor} side={THREE.DoubleSide} transparent opacity={0.82} roughness={0.85} />
        </mesh>
      )}
      {selected && (
        <mesh>
          <sphereGeometry args={[radius * 1.42, 32, 32]} />
          <meshBasicMaterial color={planet.color} wireframe transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function SunMesh({ onSelect, selected }: { onSelect: () => void; selected: boolean }) {
  return (
    <group onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh>
        <sphereGeometry args={[BODY_RENDER_RADIUS.sun, 48, 48]} />
        <meshBasicMaterial color="#ffca78" />
      </mesh>
      <mesh scale={1.18}>
        <sphereGeometry args={[BODY_RENDER_RADIUS.sun, 48, 48]} />
        <meshBasicMaterial color="#ff962f" transparent opacity={selected ? 0.16 : 0.1} side={THREE.BackSide} />
      </mesh>
      <pointLight color="#ffdfa8" intensity={140} distance={120} decay={2} />
    </group>
  );
}

function Scene({
  scaleMode: mode, selectedBody, focusedBody, onSelect, onFocusChange, controlsRef,
}: SolarSystem3DProps) {
  useFrame((_, delta) => {
    if (!focusedBody || !controlsRef.current) return;
    const body = getPlanet(focusedBody);
    const targetPosition = body
      ? new THREE.Vector3(...toVector(orbitalPosition(body.orbitalElements, readSimulationClock()), mode))
      : new THREE.Vector3(0, 0, 0);
    const controls = controlsRef.current;
    controls.target.lerp(targetPosition, 1 - Math.exp(-delta * 2.6));
    const offset = new THREE.Vector3().subVectors(controls.object.position, controls.target);
    const desiredDistance = body ? Math.max(3, BODY_RENDER_RADIUS[body.id] * 10) : 14;
    if (offset.length() > desiredDistance) {
      offset.setLength(THREE.MathUtils.lerp(offset.length(), desiredDistance, 1 - Math.exp(-delta * 1.5)));
      controls.object.position.copy(controls.target).add(offset);
    }
    controls.update();
  });

  return (
    <>
      <color attach="background" args={["#070a10"]} />
      <fog attach="fog" args={["#070a10", 48, 105]} />
      <ambientLight intensity={0.28} />
      <pointLight position={[0, 0, 0]} intensity={3} distance={100} decay={1.8} color="#fff0d6" />
      <Stars radius={110} depth={65} count={2600} factor={2.2} saturation={0.05} fade speed={0.15} />
      <SunMesh selected={selectedBody === "sun"} onSelect={() => onSelect("sun")} />
      {PLANETS.map((planet) => (
        <group key={planet.id}>
          <OrbitPath planet={planet} mode={mode} selected={selectedBody === planet.id} />
          <PlanetMesh planet={planet} mode={mode} selected={selectedBody === planet.id} onSelect={onSelect} />
        </group>
      ))}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        onStart={() => onFocusChange(null)}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={95}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        panSpeed={0.65}
      />
    </>
  );
}

export function SolarSystem3D(props: SolarSystem3DProps) {
  return (
    <RendererBoundary fallback={<WebGLFallback onRequestMap={props.onRequestMap} />}>
      <Canvas
        camera={{ position: [0, 28, 40], fov: 42, near: 0.1, far: 220 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </RendererBoundary>
  );
}
