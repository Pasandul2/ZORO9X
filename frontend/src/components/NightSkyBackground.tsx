import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import CometShower from './CometShower';

export default function NightSkyBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <CometShower immediate />
        <Sparkles count={30} scale={20} size={0.4} speed={0.2} color="#818cf8" />
      </Canvas>
    </div>
  );
}
