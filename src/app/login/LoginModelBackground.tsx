"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF, useProgress } from "@react-three/drei";
import styles from "./login.module.css";

type ModelProps = {
  speed?: number;
};

function RotatingModel({ speed = 0.25 }: ModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/result.glb");

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * speed;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.00035) * 0.08;
  });

  return (
    <group ref={groupRef} position={[-3.65, -1.1, -0.15]} scale={2.15}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

export function LoginModelBackground() {
  const { active, progress } = useProgress();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active || progress < 100) return;

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [active, progress]);

  return (
    <div className={`${styles.modelCanvas} ${isVisible ? styles.modelCanvasVisible : ""}`}>
      <Canvas
        camera={{ fov: 42, position: [0, 0.15, 5.4] }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[2.5, 3.2, 2]} intensity={2.2} />
        <directionalLight position={[-3, -1.4, -2]} intensity={1.2} />
        <Suspense fallback={null}>
          <RotatingModel />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/result.glb");
