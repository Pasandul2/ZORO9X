import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Key } from 'lucide-react';

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
  React.useEffect(() => {
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
    <div 
      className="min-h-screen bg-black text-white pt-32 pb-20 px-4"
      style={{
        backgroundImage: `url(/images/image1.webp), url(/images/image2.webp)`,
        backgroundPosition: 'bottom left, top right',
        backgroundSize: 'auto, auto',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-30 z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/Logo/zoro.png" alt="Zoro9x" className="h-12 w-auto" />
          </Link>
          <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
          <p className="text-gray-400">Enter the code from your email</p>
          {email && <p className="text-indigo-400 font-medium mt-1">{email}</p>}
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200 text-sm"
            >
              {success}
            </motion.div>
          )}

          {step === 'code' ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Reset Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                    required
                    maxLength={6}
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm ${expiryTime < 60 ? 'text-red-400' : 'text-gray-400'}`}>
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
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Verify Code
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-200 text-sm text-center">
                ✓ Code verified! Enter your new password
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>

              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full text-center text-gray-400 hover:text-gray-300 text-sm"
              >
                ← Back to code
              </button>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400">Need a new code?</span>
            </div>
          </div>

          <Link
            to="/forgot-password"
            className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition border border-white/20"
          >
            Request New Code
          </Link>
        </div>

        <div className="text-center mt-8 text-sm text-gray-400">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-400 hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
