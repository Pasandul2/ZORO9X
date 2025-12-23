import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Email Provided</h2>
          <Link to="/register" className="text-indigo-400 hover:underline">
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-400">Enter the 6-digit code sent to</p>
          <p className="text-indigo-400 font-medium">{email}</p>
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

          <form onSubmit={handleVerification} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Verification Code</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
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
              disabled={loading || code.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </motion.button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400">Didn't receive the code?</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: canResend ? 1.02 : 1 }}
            whileTap={{ scale: canResend ? 0.98 : 1 }}
            onClick={handleResendCode}
            disabled={resending || !canResend}
            className="w-full bg-white/10 hover:bg-white/20 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition border border-white/20 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-5 w-5 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : canResend ? 'Resend Code' : `Resend in ${countdown}s`}
          </motion.button>
        </div>

        <div className="text-center mt-8 text-sm text-gray-400">
          <p>
            Wrong email?{' '}
            <Link to="/register" className="text-indigo-400 hover:underline">
              Register again
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
