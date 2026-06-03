import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Key } from 'lucide-react';

// ─── 3D Reset Scene ────────────────────────────────────────────
function ResetScene() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.03;
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 22;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0, -5]} rotation={[0.2, 0.6, 0.3]}>
        <icosahedronGeometry args={[2.8, 0]} />
        <MeshDistortMaterial color="#8b5cf6" transparent opacity={0.04} distort={0.25} speed={1.2} wireframe />
      </mesh>
      {/* Dual orbiting rings */}
      <mesh position={[0, 0, -5]} rotation={[0.5, 0, 0]}>
        <ringGeometry args={[3.8, 3.82, 64]} />
        <MeshDistortMaterial color="#a78bfa" transparent opacity={0.03} distort={0.08} />
      </mesh>
      <mesh position={[0, 0, -5]} rotation={[1.2, 0.4, 0]}>
        <ringGeometry args={[4.2, 4.22, 64]} />
        <MeshDistortMaterial color="#6366f1" transparent opacity={0.025} distort={0.08} />
      </mesh>
      <points geometry={particles}>
        <pointsMaterial size={0.015} color="#a78bfa" transparent opacity={0.2} />
      </points>
    </group>
  );
}

const ResetPassword: React.FC = () => {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [expiryTime, setExpiryTime] = useState(15 * 60); // 15 minutes
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  // Expiry countdown timer
  useEffect(() => {
    if (expiryTime > 0) {
      const timer = setTimeout(() => setExpiryTime(expiryTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiryTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      setStep('password');
      setError('');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Password reset failed');
        return;
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
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
          <pointLight position={[0, 0, 5]} intensity={0.15} color="#8b5cf6" />
          <ResetScene />
          <Sparkles count={35} scale={14} size={0.3} speed={0.2} color="#a78bfa" />
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
            Reset Password
          </h1>
          <p className="text-gray-500 font-light">Enter the code from your email</p>
          {email && <p className="text-indigo-400 font-medium mt-1">{email}</p>}
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
              {success}
            </motion.div>
          )}

          {step === 'code' ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Reset Code</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="input-premium w-full pl-12 pr-4 py-3.5 text-center text-2xl tracking-widest"
                    required
                    maxLength={6}
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm ${expiryTime < 60 ? 'text-red-400' : 'text-gray-500'}`}>
                    {expiryTime > 0 ? (
                      <>Code expires in: <span className="font-bold">{formatTime(expiryTime)}</span></>
                    ) : (
                      <span className="text-red-400">Code expired! Please request a new one.</span>
                    )}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={code.length !== 6}
                className="btn-premium w-full py-3.5 rounded-xl font-medium"
              >
                Verify Code
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-300 text-sm text-center">
                ✓ Code verified! Enter your new password
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-premium w-full pl-12 pr-4 py-3.5"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
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
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>

              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full text-center text-gray-500 hover:text-gray-400 text-sm transition-colors"
              >
                ← Back to code
              </button>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-black text-gray-500 font-light">Need a new code?</span>
            </div>
          </div>

          <Link
            to="/forgot-password"
            className="block w-full text-center bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3.5 rounded-xl transition-all border border-white/[0.06]"
          >
            Request New Code
          </Link>
        </div>

        <div className="text-center mt-8 text-sm">
          <p className="text-gray-500 font-light">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Back to Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
