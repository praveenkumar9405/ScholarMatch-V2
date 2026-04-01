import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useRef } from 'react';

const CHARACTER_COLOR = "#4b5563"; // slate-600 neutral tone
const CAP_COLOR = "#0071E3"; // Apple blue
const TASSEL_COLOR = "#fbbf24"; // Soft yellow
const STAIR_COLOR = "#f3f4f6"; // light grey

const STEP_W = 1.0;
const STEP_H = 0.6;
const STEP_D = 1.5;
const STEPS_COUNT = 15;
const LOOP_TIME = 2.0;

const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

const CharacterAndStairs = () => {
  const stairsRef = useRef(null);
  const bodyRef = useRef(null);
  const leftFootRef = useRef(null);
  const rightFootRef = useRef(null);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  const headRef = useRef(null);

  useFrame((state) => {
    const rawP = (state.clock.elapsedTime % LOOP_TIME) / LOOP_TIME;
    const p = easeInOutCubic(rawP);

    // 1. Move Stairs
    if (stairsRef.current) {
      stairsRef.current.position.x = -p * STEP_W;
      stairsRef.current.position.y = -p * STEP_H;
    }

    // 2. Body Bob and Lean (twice per cycle)
    const bodyBob = Math.abs(Math.sin(p * Math.PI * 2)) * 0.1;
    const bodyLean = Math.sin(p * Math.PI * 2) * -0.05;
    
    if (bodyRef.current) {
      bodyRef.current.position.y = 1.2 + bodyBob;
      bodyRef.current.rotation.z = bodyLean;
    }
    if (headRef.current) {
      headRef.current.position.y = 2.0 + bodyBob;
    }

    // 3. Feet Kinematics
    let lfX = 0, lfY = 0;
    if (p <= 0.5) {
      const u = p / 0.5;
      lfX = lerp(0, 0.5 * STEP_W, u);
      lfY = lerp(0, 0.5 * STEP_H, u) + Math.sin(u * Math.PI) * STEP_H * 0.8;
    } else {
      lfX = -p * STEP_W + STEP_W;
      lfY = -p * STEP_H + STEP_H;
    }

    let rfX = 0, rfY = 0;
    if (p <= 0.5) {
      rfX = -p * STEP_W;
      rfY = -p * STEP_H;
    } else {
      const u = (p - 0.5) / 0.5;
      rfX = lerp(-0.5 * STEP_W, 0, u);
      rfY = lerp(-0.5 * STEP_H, 0, u) + Math.sin(u * Math.PI) * STEP_H * 0.8;
    }

    if (leftFootRef.current) {
      leftFootRef.current.position.set(lfX, lfY + 0.1, 0.25);
      leftFootRef.current.rotation.z = Math.sin(p * Math.PI * 2) * 0.2;
    }
    if (rightFootRef.current) {
      rightFootRef.current.position.set(rfX, rfY + 0.1, -0.25);
      rightFootRef.current.rotation.z = Math.sin(p * Math.PI * 2 + Math.PI) * 0.2;
    }

    // 4. Hands swinging
    if (leftHandRef.current) {
      leftHandRef.current.position.set(lfX * 0.3, 1.0 + bodyBob, 0.35);
    }
    if (rightHandRef.current) {
      rightHandRef.current.position.set(rfX * 0.3, 1.0 + bodyBob, -0.35);
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      {/* Stairs Group */}
      <group ref={stairsRef}>
        {Array.from({ length: STEPS_COUNT }).map((_, i) => {
          const index = i - Math.floor(STEPS_COUNT / 2) + 1;
          return (
            <mesh 
              key={i} 
              position={[index * STEP_W, index * STEP_H - 10, 0]} 
              receiveShadow
            >
              <boxGeometry args={[STEP_W + 0.05, 20, STEP_D]} />
              <meshStandardMaterial color={STAIR_COLOR} roughness={0.9} />
            </mesh>
          );
        })}
      </group>

      {/* Character */}
      <group>
        {/* Head + Cap */}
        <group ref={headRef}>
          <mesh castShadow>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Cap Group */}
          <group position={[0, 0.25, 0]} rotation={[0, 0, 0.05]}>
            {/* Skullcap */}
            <mesh castShadow position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.16, 0.18, 0.1, 32]} />
              <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.7} /> 
            </mesh>
            {/* Board */}
            <mesh castShadow position={[0, 0.0, 0]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.65, 0.02, 0.65]} />
              <meshStandardMaterial color={CAP_COLOR} roughness={0.4} />
            </mesh>
            {/* Tassel */}
            <mesh castShadow position={[0.2, -0.05, 0.2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.15]} />
              <meshStandardMaterial color={TASSEL_COLOR} roughness={0.5} />
            </mesh>
            {/* Button */}
            <mesh castShadow position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial color={TASSEL_COLOR} roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* Body */}
        <mesh ref={bodyRef} castShadow>
          <capsuleGeometry args={[0.22, 0.45, 16, 32]} />
          <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} metalness={0.1} />
        </mesh>

        {/* Left Foot */}
        <group ref={leftFootRef}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.08, 0.14, 16, 32]} />
            <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} />
          </mesh>
        </group>

        {/* Right Foot */}
        <group ref={rightFootRef}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.08, 0.14, 16, 32]} />
            <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} />
          </mesh>
        </group>

        {/* Left Hand */}
        <mesh ref={leftHandRef} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} />
        </mesh>

        {/* Right Hand */}
        <mesh ref={rightHandRef} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={CHARACTER_COLOR} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-none opacity-80 mix-blend-multiply">
      <Canvas orthographic camera={{ position: [0, 2, 12], zoom: 70, far: 50, near: -10 }}>
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 8, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={1024}
        />
        <directionalLight 
          position={[-3, -5, -5]} 
          intensity={0.4} 
        />
        <Suspense fallback={null}>
          <CharacterAndStairs />
          <Environment preset="city" />
          <ContactShadows position={[0, -2.5, 0]} opacity={0.3} scale={20} blur={2.5} far={4} color="#94a3b8" />
        </Suspense>
      </Canvas>
    </div>
  );
};
