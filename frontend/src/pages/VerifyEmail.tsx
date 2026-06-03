import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CometShower from '../components/CometShower';

// ─── 3D Verify Scene ───────────────────────────────────────────
function VerifyScene() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.008;
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0, -5]} rotation={[0.4, 0.3, 0]}>
        <octahedronGeometry args={[3, 0]} />
        <MeshDistortMaterial color="#4f46e5" transparent opacity={0.04} distort={0.2} speed={0.8} wireframe />
      </mesh>
      <mesh position={[0, 0, -5]} rotation={[0.8, 0.2, 0]}>
        <ringGeometry args={[4, 4.02, 64]} />
        <MeshDistortMaterial color="#818cf8" transparent opacity={0.03} distort={0.08} />
      </mesh>
      <points geometry={particles}>
        <pointsMaterial size={0.012} color="#818cf8" transparent opacity={0.2} />
      </points>
    </group>
  );
}

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [expiryTime, setExpiryTime] = useState(15 * 60); // 15 minutes in seconds
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const { login } = useAuth();

  // Countdown timer for resend button (60 seconds)
  React.useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  // Expiry countdown timer (15 minutes)
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

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Verification failed');
        return;
      }

      setSuccess('Email verified successfully! Logging in...');
      
      // Auto-login user after successful verification
      if (data.token && data.user) {
        login(data.token, data.user);
      }
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to resend code');
        return;
      }

      setSuccess('Verification code sent! Check your email.');
      setCountdown(60);
      setCanResend(false);
      setExpiryTime(15 * 60); // Reset expiry timer
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 futuristic-grid opacity-20 pointer-events-none" />
        <div className="text-center relative z-10">
          <h2 className="text-2xl font-bold mb-4">No Email Provided</h2>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white pt-24 sm:pt-32 pb-20 px-4 overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 0, 5]} intensity={0.15} color="#4f46e5" />
          <VerifyScene />
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
            Verify Your Email
          </h1>
          <p className="text-gray-500 font-light">Enter the 6-digit code sent to</p>
          <p className="text-indigo-400 font-medium">{email}</p>
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

          <form onSubmit={handleVerification} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Verification Code</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
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
              disabled={loading || code.length !== 6}
              className="btn-premium w-full py-3.5 rounded-xl font-medium"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </motion.button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-black text-gray-500 font-light">Didn't receive the code?</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: canResend ? 1.02 : 1 }}
            whileTap={{ scale: canResend ? 0.98 : 1 }}
            onClick={handleResendCode}
            disabled={resending || !canResend}
            className="w-full bg-white/[0.04] hover:bg-white/[0.08] disabled:bg-white/[0.02] disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-all border border-white/[0.06] flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-5 w-5 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : canResend ? 'Resend Code' : `Resend in ${countdown}s`}
          </motion.button>
        </div>

        <div className="text-center mt-8 text-sm">
          <p className="text-gray-500 font-light">
            Wrong email?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Register again
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
