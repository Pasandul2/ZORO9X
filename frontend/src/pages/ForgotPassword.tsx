import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import CometShower from '../components/CometShower';

// ─── 3D Forgot Password Scene ──────────────────────────────────
function ForgotScene() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.01;
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0, -5]} rotation={[0.3, 0.5, 0.1]}>
        <dodecahedronGeometry args={[3, 0]} />
        <MeshDistortMaterial color="#6366f1" transparent opacity={0.04} distort={0.2} speed={1} wireframe />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0, -5]} rotation={[i * 0.7, i * 0.5, 0]}>
          <ringGeometry args={[3.5 + i, 3.515 + i, 64]} />
          <MeshDistortMaterial color={['#6366f1', '#a78bfa'][i]} transparent opacity={0.03} distort={0.1} />
        </mesh>
      ))}
      <points geometry={particles}>
        <pointsMaterial size={0.015} color="#818cf8" transparent opacity={0.2} />
      </points>
    </group>
  );
}

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset code');
        return;
      }

      setSuccess(true);
      
      // Auto-redirect to reset password page after 2 seconds
      setTimeout(() => {
        navigate('/reset-password', { state: { email }, replace: true });
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white pt-24 sm:pt-32 pb-20 px-4 overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 0, 5]} intensity={0.15} color="#6366f1" />
          <ForgotScene />
          <CometShower immediate />
          <Sparkles count={30} scale={14} size={0.3} speed={0.2} color="#818cf8" />
        </Canvas>
      </div>
      
      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
        `,
      }} />
      <div className="absolute inset-0 futuristic-grid opacity-20 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/Logo/zoro.png" alt="Zoro9x" className="h-12 w-auto opacity-80" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
            Forgot Password?
          </h1>
          <p className="text-gray-500 font-light">Enter your email to receive a reset code</p>
        </div>

        <div className="form-glass rounded-2xl p-5 sm:p-8 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300 text-sm"
            >
              <p className="font-semibold mb-2">✓ Reset code sent!</p>
              <p>Check your email for the verification code.</p>
              <p className="mt-2 text-indigo-400">Redirecting to code entry page...</p>
            </motion.div>
          )}

          {!success && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-premium w-full pl-12 pr-4 py-3.5"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="btn-premium w-full py-3.5 rounded-xl font-medium"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </motion.button>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-black text-gray-500 font-light">Remember your password?</span>
            </div>
          </div>

          <Link
            to="/login"
            className="block w-full text-center bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3.5 rounded-xl transition-all border border-white/[0.06]"
          >
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
