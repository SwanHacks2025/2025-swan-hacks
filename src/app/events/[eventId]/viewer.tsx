"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage } from "@react-three/drei";

export default function ModelViewer({ modelUrl }: { modelUrl: string }) {
  return (
    <Canvas shadows camera={{ position: [5, 5, 5], fov: 40 }}>
      <ambientLight intensity={0.8} />
      <Stage environment="city" intensity={0.6}>
        <Model url={modelUrl} />
      </Stage>
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} scale={1} />;
}
