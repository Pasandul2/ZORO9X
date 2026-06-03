import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles as SparklesIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CometShower from '../components/CometShower';

// ─── Enhanced 3D Register Scene ──────────────────────────────
function RegisterScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.02;
    groupRef.current.rotation.x = Math.sin(t * 0.015) * 0.035;
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.08;
      coreRef.current.rotation.y = t * 0.12;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.05);
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 250;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.12, 0.5, 0.35 + Math.random() * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Core geometry */}
      <mesh ref={coreRef} position={[0, 0, -3]}>
        <octahedronGeometry args={[2.2, 0]} />
        <MeshDistortMaterial
          color="#7c3aed"
          transparent
          opacity={0.07}
          distort={0.35}
          speed={1.2}
          wireframe
        />
      </mesh>
      {/* Pulsing glow */}
      <mesh ref={glowRef} position={[0, 0, -3]}>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.03} />
      </mesh>
      {/* Outer rings */}
      {[0, 1, 2].map((i) => (
        <Float key={i} speed={0.15 + i * 0.05} floatIntensity={0.08}>
          <mesh rotation={[0.3 + i * 0.5, 0.5 + i * 0.3, 0]}>
            <torusGeometry args={[3.2 + i * 0.6, 0.015, 24, 48]} />
            <MeshDistortMaterial
              color={['#6366f1', '#8b5cf6', '#a78bfa'][i]}
              transparent
              opacity={0.06 + i * 0.02}
              distort={0.06}
            />
          </mesh>
        </Float>
      ))}
      {/* Floating dots */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Float key={`dot-${i}`} speed={0.3 + i * 0.1} floatIntensity={0.25}>
          <mesh position={[
            Math.cos((i / 6) * Math.PI * 2) * 4.5,
            Math.sin((i / 6) * Math.PI * 2) * 3.5,
            -2.5 + (i % 3) * 0.3,
          ]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#c084fc'][i]}
              transparent
              opacity={0.25}
            />
          </mesh>
        </Float>
      ))}
      {/* Colored particles */}
      <points geometry={particles}>
        <pointsMaterial size={0.02} vertexColors transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// ─── Stagger animation variants ─────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.25 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // Handle OAuth callback
  useEffect(() => {
    if (oauthHandledRef.current) {
      return;
    }

    const token = searchParams.get('token');
    const user = searchParams.get('user');

    if (token) {
      try {
        oauthHandledRef.current = true;

        const cleanedParams = new URLSearchParams(searchParams);
        cleanedParams.delete('token');
        cleanedParams.delete('user');
        const remainingParams = cleanedParams.toString();
        const cleanUrl = remainingParams ? `/register?${remainingParams}` : '/register';
        window.history.replaceState({}, '', cleanUrl);

        const userData = user ? JSON.parse(decodeURIComponent(user)) : {};
        login(token, userData);
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error parsing OAuth data:', error);
        oauthHandledRef.current = false;
        setError('Authentication failed. Please try again.');
      }
    }

    const error = searchParams.get('error');
    if (error) {
      setError('Google registration failed. Please try again.');
    }
  }, [searchParams, navigate, login]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return;
      }

      if (data.requiresVerification) {
        setSuccess('Account created! Check your email for verification code.');
        setTimeout(() => {
          navigate('/verify-email', { state: { email: data.email }, replace: true });
        }, 1000);
      } else {
        if (data.token) {
          login(data.token, data.user);
        }
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 48 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.12} />
          <pointLight position={[0, 0, 5]} intensity={0.25} color="#7c3aed" />
          <RegisterScene />
          <CometShower immediate />
          <Sparkles count={35} scale={14} size={0.4} speed={0.35} color="#a78bfa" />
        </Canvas>
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.8) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.6) 0%, transparent 100%)
        `,
      }} />
      <div className="absolute inset-0 futuristic-grid opacity-20 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto relative z-10 pt-24 sm:pt-32 pb-20 px-4"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-block mb-6">
            <motion.img
              whileHover={{ scale: 1.04 }}
              src="/Logo/zoro.png"
              alt="Zoro9x"
              className="h-12 w-auto mx-auto"
            />
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent reveal-text">
              Create Account
            </span>
          </h1>
          <p className="text-gray-500 font-light">Join us and get started</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="form-glass rounded-2xl p-5 sm:p-8 space-y-6 glow-box"
        >
          {/* Decorative top line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300 text-sm"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleRegister}>
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Full Name */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Full Name</label>
                <div className="relative">
                  <User className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-300 ${focusedField === 'fullName' ? 'text-purple-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="John Doe"
                    className="input-premium"
                    required
                  />
                  {focusedField === 'fullName' && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-purple-500/40 via-purple-500/60 to-purple-500/40 origin-left"
                    />
                  )}
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-300 ${focusedField === 'email' ? 'text-purple-400' : 'text-gray-500'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@example.com"
                    className="input-premium"
                    required
                  />
                  {focusedField === 'email' && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-purple-500/40 via-purple-500/60 to-purple-500/40 origin-left"
                    />
                  )}
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Phone (Optional)</label>
                <div className="relative">
                  <Phone className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-300 ${focusedField === 'phone' ? 'text-purple-400' : 'text-gray-500'}`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+1 (555) 000-0000"
                    className="input-premium"
                  />
                  {focusedField === 'phone' && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-purple-500/40 via-purple-500/60 to-purple-500/40 origin-left"
                    />
                  )}
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-300 ${focusedField === 'password' ? 'text-purple-400' : 'text-gray-500'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className="input-premium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {focusedField === 'password' && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-purple-500/40 via-purple-500/60 to-purple-500/40 origin-left"
                    />
                  )}
                </div>
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Confirm Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-300 ${focusedField === 'confirmPassword' ? 'text-purple-400' : 'text-gray-500'}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className="input-premium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {focusedField === 'confirmPassword' && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-purple-500/40 via-purple-500/60 to-purple-500/40 origin-left"
                    />
                  )}
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="btn-premium w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-medium transition-all shadow-lg shadow-indigo-500/10 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                        />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <SparklesIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.button>
              </motion.div>

              {/* Google Sign Up */}
              <motion.div variants={itemVariants}>
                <motion.a
                  href={`${import.meta.env.VITE_API_URL}/api/oauth/google`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative block w-full py-3.5 rounded-xl text-white font-medium border border-white/10 hover:border-purple-500/30 transition-all text-center flex items-center justify-center gap-3 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="relative z-10">Sign up with Google</span>
                </motion.a>
              </motion.div>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="relative"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-gray-600 bg-black">Already have an account?</span>
            </div>
          </motion.div>

          {/* Sign In Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              to="/login"
              className="group block w-full text-center py-3.5 rounded-xl text-white font-medium border border-white/10 hover:border-purple-500/30 transition-all relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10">Sign In</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center mt-8 text-sm text-gray-600"
        >
          <p>
            By creating an account, you agree to our{' '}
            <a href="#" className="text-indigo-400/70 hover:text-indigo-300 transition">
              Terms of Service
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
