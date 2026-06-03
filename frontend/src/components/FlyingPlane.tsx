import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Generate a photorealistic airplane silhouette texture ────
let planeTexture: THREE.Texture | null = null;
function getPlaneTexture(): THREE.Texture {
  if (!planeTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 600, 200);

    // ─── Night sky plane — dark silhouette with glowing edge accents ───
    const cx = 300; // center X
    const cy = 100; // center Y

    // === FUSELAGE (body) ===
    ctx.save();

    // Main fuselage body
    ctx.beginPath();
    ctx.moveTo(cx + 140, cy - 2);     // nose tip
    ctx.quadraticCurveTo(cx + 130, cy - 12, cx + 80, cy - 14);  // cockpit area
    ctx.lineTo(cx - 60, cy - 14);                               // mid body top
    ctx.quadraticCurveTo(cx - 110, cy - 12, cx - 125, cy - 5);  // rear top
    ctx.lineTo(cx - 130, cy - 2);                               // tail base top
    ctx.lineTo(cx - 138, cy - 8);                               // vertical stab top
    ctx.lineTo(cx - 145, cy - 6);                               // tail tip
    ctx.lineTo(cx - 148, cy - 2);                               // tail trailing edge
    ctx.lineTo(cx - 145, cy + 2);                               // tail bottom tip
    ctx.lineTo(cx - 138, cy + 8);                               // vertical stab bottom
    ctx.lineTo(cx - 130, cy + 2);                               // tail base bottom
    ctx.lineTo(cx - 125, cy + 5);                               // rear bottom
    ctx.quadraticCurveTo(cx - 110, cy + 12, cx - 60, cy + 14);  // mid body bottom
    ctx.lineTo(cx + 80, cy + 14);                               // cockpit bottom
    ctx.quadraticCurveTo(cx + 130, cy + 12, cx + 140, cy + 2);  // nose bottom
    ctx.closePath();

    // Dark metallic body fill
    const bodyGrad = ctx.createLinearGradient(cx - 100, cy - 20, cx + 100, cy + 20);
    bodyGrad.addColorStop(0, 'rgba(15,15,25,0.95)');
    bodyGrad.addColorStop(0.3, 'rgba(25,25,40,0.9)');
    bodyGrad.addColorStop(0.7, 'rgba(20,20,35,0.9)');
    bodyGrad.addColorStop(1, 'rgba(10,10,20,0.95)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Fuselage glow edge (top)
    ctx.beginPath();
    ctx.moveTo(cx + 140, cy - 2);
    ctx.quadraticCurveTo(cx + 130, cy - 12, cx + 80, cy - 14);
    ctx.lineTo(cx - 60, cy - 14);
    ctx.quadraticCurveTo(cx - 110, cy - 12, cx - 125, cy - 5);
    ctx.strokeStyle = 'rgba(120,180,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fuselage glow edge (bottom)
    ctx.beginPath();
    ctx.moveTo(cx + 140, cy + 2);
    ctx.quadraticCurveTo(cx + 130, cy + 12, cx + 80, cy + 14);
    ctx.lineTo(cx - 60, cy + 14);
    ctx.quadraticCurveTo(cx - 110, cy + 12, cx - 125, cy + 5);
    ctx.strokeStyle = 'rgba(100,160,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // === COCKPIT WINDOWS ===
    // Front windshield
    ctx.beginPath();
    ctx.moveTo(cx + 110, cy - 8);
    ctx.quadraticCurveTo(cx + 95, cy - 11, cx + 80, cy - 11);
    ctx.quadraticCurveTo(cx + 85, cy - 6, cx + 85, cy);
    ctx.quadraticCurveTo(cx + 95, cy - 2, cx + 110, cy - 4);
    ctx.closePath();
    const windowGrad = ctx.createLinearGradient(cx + 80, cy - 12, cx + 110, cy);
    windowGrad.addColorStop(0, 'rgba(80,180,255,0.15)');
    windowGrad.addColorStop(0.5, 'rgba(100,200,255,0.08)');
    windowGrad.addColorStop(1, 'rgba(60,150,255,0.05)');
    ctx.fillStyle = windowGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Side windows (small dots)
    for (let i = 0; i < 6; i++) {
      const wx = cx + 60 - i * 18;
      ctx.beginPath();
      ctx.arc(wx, cy - 8, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,180,255,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,200,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // === WINGS ===
    // Main wing (top view — looks like swept wing from side)
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 12);
    ctx.lineTo(cx - 20, cy - 38);
    ctx.lineTo(cx - 50, cy - 35);
    ctx.lineTo(cx - 10, cy - 10);
    ctx.closePath();
    const wingGrad = ctx.createLinearGradient(cx - 10, cy - 38, cx + 30, cy - 10);
    wingGrad.addColorStop(0, 'rgba(20,20,35,0.9)');
    wingGrad.addColorStop(0.5, 'rgba(30,30,50,0.85)');
    wingGrad.addColorStop(1, 'rgba(15,15,28,0.9)');
    ctx.fillStyle = wingGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Wing tip glow
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 38);
    ctx.lineTo(cx - 50, cy - 35);
    ctx.strokeStyle = 'rgba(150,200,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy + 12);
    ctx.lineTo(cx - 20, cy + 38);
    ctx.lineTo(cx - 50, cy + 35);
    ctx.lineTo(cx - 10, cy + 10);
    ctx.closePath();
    ctx.fillStyle = wingGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bottom wing tip glow
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 38);
    ctx.lineTo(cx - 50, cy + 35);
    ctx.strokeStyle = 'rgba(150,200,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // === HORIZONTAL STABILIZER (tail wings) ===
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 4);
    ctx.lineTo(cx - 138, cy - 16);
    ctx.lineTo(cx - 152, cy - 14);
    ctx.lineTo(cx - 128, cy - 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(18,18,32,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,170,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bottom horizontal stabilizer
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy + 4);
    ctx.lineTo(cx - 138, cy + 16);
    ctx.lineTo(cx - 152, cy + 14);
    ctx.lineTo(cx - 128, cy + 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(18,18,32,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,170,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // === VERTICAL STABILIZER (tail fin) ===
    ctx.beginPath();
    ctx.moveTo(cx - 125, cy - 6);
    ctx.lineTo(cx - 135, cy - 28);
    ctx.lineTo(cx - 148, cy - 26);
    ctx.lineTo(cx - 143, cy - 6);
    ctx.closePath();
    const finGrad = ctx.createLinearGradient(cx - 148, cy - 28, cx - 125, cy - 6);
    finGrad.addColorStop(0, 'rgba(25,25,45,0.9)');
    finGrad.addColorStop(0.5, 'rgba(30,30,55,0.85)');
    finGrad.addColorStop(1, 'rgba(20,20,38,0.9)');
    ctx.fillStyle = finGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Tail fin leading edge glow
    ctx.beginPath();
    ctx.moveTo(cx - 125, cy - 6);
    ctx.lineTo(cx - 135, cy - 28);
    ctx.strokeStyle = 'rgba(100,200,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // === ENGINE NACELLE (under wing) ===
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy + 24, 14, 5, 0, 0, Math.PI * 2);
    const engineGrad = ctx.createRadialGradient(cx + 5, cy + 24, 0, cx + 5, cy + 24, 14);
    engineGrad.addColorStop(0, 'rgba(30,30,50,0.8)');
    engineGrad.addColorStop(0.6, 'rgba(20,20,38,0.85)');
    engineGrad.addColorStop(1, 'rgba(12,12,25,0.9)');
    ctx.fillStyle = engineGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,160,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // === NAVIGATION LIGHTS ===
    // Red (left wing tip)
    ctx.beginPath();
    ctx.arc(cx - 48, cy - 34, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,50,50,0.6)';
    ctx.fill();
    const redGlow = ctx.createRadialGradient(cx - 48, cy - 34, 0, cx - 48, cy - 34, 8);
    redGlow.addColorStop(0, 'rgba(255,80,80,0.15)');
    redGlow.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = redGlow;
    ctx.beginPath();
    ctx.arc(cx - 48, cy - 34, 8, 0, Math.PI * 2);
    ctx.fill();

    // Green (right wing tip — actually fuselage side view)
    ctx.beginPath();
    ctx.arc(cx + 130, cy - 6, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(50,255,50,0.5)';
    ctx.fill();

    // === BEACON LIGHT (tail, blinking red) ===
    ctx.beginPath();
    ctx.arc(cx - 140, cy - 24, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,100,100,0.7)';
    ctx.fill();
    const beaconGlow = ctx.createRadialGradient(cx - 140, cy - 24, 0, cx - 140, cy - 24, 10);
    beaconGlow.addColorStop(0, 'rgba(255,120,120,0.2)');
    beaconGlow.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = beaconGlow;
    ctx.beginPath();
    ctx.arc(cx - 140, cy - 24, 10, 0, Math.PI * 2);
    ctx.fill();

    // === GLOW AURA (strong overall plane glow) ===
    const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
    auraGrad.addColorStop(0, 'rgba(100,200,255,0.12)');
    auraGrad.addColorStop(0.2, 'rgba(80,180,255,0.06)');
    auraGrad.addColorStop(0.5, 'rgba(60,140,255,0.03)');
    auraGrad.addColorStop(1, 'rgba(40,100,255,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 200, 0, Math.PI * 2);
    ctx.fill();

    // Second glow layer (cyan)
    const aura2 = ctx.createRadialGradient(cx - 20, cy, 0, cx - 20, cy, 140);
    aura2.addColorStop(0, 'rgba(150,220,255,0.08)');
    aura2.addColorStop(0.3, 'rgba(100,200,255,0.04)');
    aura2.addColorStop(1, 'rgba(50,150,255,0)');
    ctx.fillStyle = aura2;
    ctx.beginPath();
    ctx.arc(cx - 20, cy, 140, 0, Math.PI * 2);
    ctx.fill();

    // === ENGINE EXHAUST FLAME (brighter glow at rear) ===
    const flameGrad = ctx.createRadialGradient(cx - 155, cy, 0, cx - 155, cy, 18);
    flameGrad.addColorStop(0, 'rgba(255,220,150,0.2)');
    flameGrad.addColorStop(0.3, 'rgba(255,180,80,0.1)');
    flameGrad.addColorStop(0.6, 'rgba(255,120,30,0.04)');
    flameGrad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(cx - 155, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Wing trailing glow
    const wingTrailGrad = ctx.createLinearGradient(cx - 50, cy, cx + 30, cy);
    wingTrailGrad.addColorStop(0, 'rgba(80,180,255,0.06)');
    wingTrailGrad.addColorStop(0.5, 'rgba(60,160,255,0.02)');
    wingTrailGrad.addColorStop(1, 'rgba(40,140,255,0)');
    ctx.fillStyle = wingTrailGrad;
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy, 100, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    planeTexture = new THREE.CanvasTexture(canvas);
    planeTexture.needsUpdate = true;
  }
  return planeTexture;
}

// ─── Flying Plane Component ───────────────────────────────────
export default function FlyingPlane() {
  const spriteRef = useRef<THREE.Sprite>(null!);
  const texture = getPlaneTexture();

  useFrame(({ clock }) => {
    const sprite = spriteRef.current;
    if (!sprite) return;

    const t2 = clock.elapsedTime * 0.04;
    const rawX = ((t2 * 16) % 32) - 16;

    const y = Math.sin(clock.elapsedTime * 0.015) * 2.5 - 0.5;
    const z = Math.sin(clock.elapsedTime * 0.01) * 1.5 - 2;

    sprite.position.set(rawX, y, z);

    const depthScale = 0.8 + (z + 3.5) * 0.06;
    const baseW = 5;
    const baseH = 1.7;

    // Pulsing opacity with more range
    const opacity = 0.7 + Math.sin(clock.elapsedTime * 0.08) * 0.15;
    (sprite.material as THREE.SpriteMaterial).opacity = opacity;

    // Blinking light effect — subtle scale pulse for nav light feel
    const lightPulse = 0.85 + Math.sin(clock.elapsedTime * 2.5) * 0.15;
    sprite.scale.set(baseW * depthScale * lightPulse, baseH * depthScale * lightPulse, 1);
  });

  return (
    <sprite ref={spriteRef} position={[-18, 0, -2]} scale={[5, 1.7, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}
