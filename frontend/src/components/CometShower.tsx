import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Config ────────────────────────────────────────────────────
const IDLE_DURATION = 5;

// ─── Generate a high-quality photorealistic comet texture ─────
let cometTexture: THREE.Texture | null = null;
function getCometTexture(): THREE.Texture {
  if (!cometTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);

    // ─── CENTER-HEAD design: head at center, tail trails behind ───
    // This ensures rotation works cleanly for ANY direction
    const hx = 320, hy = 64; // head center

    // ─── 1. Outer tail glow (trails BEHIND = left side) ───
    const outerGlow = ctx.createLinearGradient(50, 64, hx, 64);
    outerGlow.addColorStop(0, 'rgba(120,100,255,0)');
    outerGlow.addColorStop(0.2, 'rgba(150,130,255,0.02)');
    outerGlow.addColorStop(0.4, 'rgba(180,160,255,0.06)');
    outerGlow.addColorStop(0.6, 'rgba(210,190,255,0.15)');
    outerGlow.addColorStop(0.8, 'rgba(240,220,255,0.35)');
    outerGlow.addColorStop(1, 'rgba(255,245,255,0.65)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.ellipse(200, 64, 185, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // ─── 2. Main tail body (extends left from head) ───
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy);
    ctx.quadraticCurveTo(220, hy - 32, 30, hy - 14);
    ctx.quadraticCurveTo(100, hy, 30, hy + 14);
    ctx.quadraticCurveTo(220, hy + 32, hx - 2, hy);
    ctx.closePath();

    const tailGrad = ctx.createLinearGradient(hx, hy, 30, hy);
    tailGrad.addColorStop(0, 'rgba(255,255,255,0.92)');
    tailGrad.addColorStop(0.15, 'rgba(235,225,255,0.55)');
    tailGrad.addColorStop(0.35, 'rgba(210,200,255,0.22)');
    tailGrad.addColorStop(0.55, 'rgba(180,170,255,0.08)');
    tailGrad.addColorStop(0.8, 'rgba(150,140,255,0.02)');
    tailGrad.addColorStop(1, 'rgba(130,120,255,0)');
    ctx.fillStyle = tailGrad;
    ctx.fill();

    // ─── 3. Tail center streak ───
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy);
    ctx.quadraticCurveTo(240, hy - 5, 60, hy - 2);
    ctx.quadraticCurveTo(180, hy, 60, hy + 2);
    ctx.quadraticCurveTo(240, hy + 5, hx - 4, hy);
    ctx.closePath();
    const streakGrad = ctx.createLinearGradient(hx, hy, 60, hy);
    streakGrad.addColorStop(0, 'rgba(255,255,255,1)');
    streakGrad.addColorStop(0.15, 'rgba(230,225,255,0.5)');
    streakGrad.addColorStop(0.4, 'rgba(210,210,255,0.15)');
    streakGrad.addColorStop(0.7, 'rgba(190,190,255,0.04)');
    streakGrad.addColorStop(1, 'rgba(180,180,255,0)');
    ctx.fillStyle = streakGrad;
    ctx.fill();

    // ─── 4. Coma (outer halo around head) ───
    const comaGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 42);
    comaGrad.addColorStop(0, 'rgba(255,255,255,1)');
    comaGrad.addColorStop(0.1, 'rgba(240,235,255,0.7)');
    comaGrad.addColorStop(0.25, 'rgba(215,210,255,0.3)');
    comaGrad.addColorStop(0.5, 'rgba(185,180,255,0.08)');
    comaGrad.addColorStop(0.8, 'rgba(160,155,255,0.02)');
    comaGrad.addColorStop(1, 'rgba(150,140,255,0)');
    ctx.fillStyle = comaGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, 42, 0, Math.PI * 2);
    ctx.fill();

    // ─── 5. Bright head core ───
    const coreGrad = ctx.createRadialGradient(hx + 2, hy, 0, hx, hy, 20);
    coreGrad.addColorStop(0, 'rgba(255,255,255,1)');
    coreGrad.addColorStop(0.15, 'rgba(255,252,255,0.98)');
    coreGrad.addColorStop(0.4, 'rgba(245,240,255,0.6)');
    coreGrad.addColorStop(0.7, 'rgba(225,220,255,0.2)');
    coreGrad.addColorStop(1, 'rgba(210,205,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, 20, 0, Math.PI * 2);
    ctx.fill();

    // ─── 6. Nucleus point ───
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 1, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();

    // ─── 7. Small front glow (ahead of head) ───
    const frontGrad = ctx.createRadialGradient(hx + 25, hy, 0, hx + 25, hy, 30);
    frontGrad.addColorStop(0, 'rgba(200,220,255,0.08)');
    frontGrad.addColorStop(0.5, 'rgba(180,200,255,0.03)');
    frontGrad.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.arc(hx + 25, hy, 30, 0, Math.PI * 2);
    ctx.fill();

    // ─── 8. Cyan tint on tail ───
    ctx.globalCompositeOperation = 'screen';
    const tintGrad = ctx.createRadialGradient(hx - 60, hy, 0, hx - 60, hy, 90);
    tintGrad.addColorStop(0, 'rgba(80,200,255,0.12)');
    tintGrad.addColorStop(0.4, 'rgba(60,160,255,0.06)');
    tintGrad.addColorStop(0.7, 'rgba(100,80,255,0.02)');
    tintGrad.addColorStop(1, 'rgba(60,40,255,0)');
    ctx.fillStyle = tintGrad;
    ctx.beginPath();
    ctx.arc(hx - 60, hy, 90, 0, Math.PI * 2);
    ctx.fill();

    cometTexture = new THREE.CanvasTexture(canvas);
    cometTexture.needsUpdate = true;
  }
  return cometTexture;
}

// ─── Direction angles (radians) ───────────────────────────────
// 0 = right, PI/2 = up, PI = left, -PI/2 = down
const DIRECTIONS = [
  { angle: 0, label: 'left→right' },           // ←
  { angle: Math.PI, label: 'right→left' },      // →
  { angle: Math.PI * 0.25, label: 'bl→tr' },    // bottom-left → top-right
  { angle: -Math.PI * 0.25, label: 'tl→br' },   // top-left → bottom-right
  { angle: Math.PI * 0.75, label: 'br→tl' },    // bottom-right → top-left
  { angle: -Math.PI * 0.75, label: 'tr→bl' },   // top-right → bottom-left
  { angle: Math.PI * 0.5, label: 'bottom→top' },// ↑
  { angle: -Math.PI * 0.5, label: 'top→bottom' },// ↓
];

// ─── Comet Data ────────────────────────────────────────────────
interface CometData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z: number;
  progress: number;
  speed: number;
  baseScale: number;
  angle: number; // direction angle in radians
}

function createRandomComet(startMidFlight = false): CometData {
  const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  const dist = 12; // travel distance (shorter = visible faster)
  const midX = (Math.random() - 0.5) * 6;
  const midY = (Math.random() - 0.5) * 5;
  const startX = midX - Math.cos(dir.angle) * dist;
  const startY = midY - Math.sin(dir.angle) * dist;
  const endX = midX + Math.cos(dir.angle) * dist;
  const endY = midY + Math.sin(dir.angle) * dist;

  return {
    startX,
    startY,
    endX,
    endY,
    z: (Math.random() - 0.5) * 10,
    progress: startMidFlight ? 0.3 : 0,
    speed: 0.003 + Math.random() * 0.004,
    baseScale: 0.25 + Math.random() * 0.2,
    angle: dir.angle,
  };
}

// ─── Main Comet Animation ─────────────────────────────────────
export default function CometShower({ immediate = true }: { immediate?: boolean }) {
  const cometDataRef = useRef<CometData>(createRandomComet(immediate));
  const stateRef = useRef<'flying' | 'waiting'>(immediate ? 'flying' : 'waiting');
  const timerRef = useRef(immediate ? 999 : 0);
  const spriteRef = useRef<THREE.Sprite>(null!);
  const texture = getCometTexture();

  useFrame((_state, delta) => {
    const data = cometDataRef.current;
    const sprite = spriteRef.current;
    if (!sprite) return;

    if (stateRef.current === 'flying') {
      data.progress += data.speed * delta * 60;

      const p = data.progress;
      const angle = data.angle;

      // Linear position along path (straight line, no arc)
      const x = data.startX + (data.endX - data.startX) * p;
      const y = data.startY + (data.endY - data.startY) * p;
      const z = data.z;

      sprite.position.set(x, y, z);

      // Dramatic fade: smooth ease-in-out with bright peak
      const alpha = p < 0.5
        ? 2 * p * p
        : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const clamped = Math.max(0, alpha);
      (sprite.material as THREE.SpriteMaterial).opacity = clamped * 0.92;

      // Bigger scale — dramatic entrance, peaks mid-flight
      const scaleFactor = Math.sin(p * Math.PI);
      const s = data.baseScale * (0.5 + scaleFactor * 0.5);
      sprite.scale.set(s * 12, s * 0.8, 1);

      // Rotate sprite so head faces TRAVEL direction
      // head is at +X of texture, so rotation = angle of travel direction
      (sprite.material as THREE.SpriteMaterial).rotation = angle;

      if (p >= 1) {
        data.progress = 1;
        stateRef.current = 'waiting';
        timerRef.current = 0;
        (sprite.material as THREE.SpriteMaterial).opacity = 0;
      }
    } else {
      timerRef.current += delta;
      if (timerRef.current >= IDLE_DURATION) {
        const fresh = createRandomComet(false);
        Object.assign(data, fresh);
        stateRef.current = 'flying';
        sprite.position.set(data.startX, data.startY, data.z);
      }
    }
  });

  return (
    <sprite ref={spriteRef} position={[-20, 0, 0]} scale={[1, 0.3, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}
