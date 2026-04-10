'use client'
import { useState } from 'react'
import { ShoppingCart, Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onSignIn: (email: string, password: string) => Promise<AuthError | null>
  onSignUp: (email: string, password: string, displayName?: string) => Promise<AuthError | null>
  onResetPassword?: (email: string) => Promise<AuthError | null>
}

export function AuthScreen({ onSignIn, onSignUp, onResetPassword }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    if (mode !== 'reset' && !password) return

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (mode === 'reset') {
      if (onResetPassword) {
        const err = await onResetPassword(email.trim())
        if (err) setError(err.message)
        else setSuccessMsg('Password reset email sent! Check your inbox.')
      }
      setLoading(false)
      return
    }

    const err = mode === 'signup'
      ? await onSignUp(email.trim(), password, name.trim() || undefined)
      : await onSignIn(email.trim(), password)

    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="flex flex-col bg-rose-50" style={{ height: '100dvh' }}>
      {/* Top area */}
      <div className="relative flex-shrink-0 pt-16 pb-10 px-8 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-200/50 mb-5">
          <ShoppingCart size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-rose-800 tracking-tight">Shopping List</h1>
        <p className="text-rose-400 text-sm mt-1">Your smart grocery companion</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-[2rem] px-8 pt-8 pb-8 shadow-[0_-4px_20px_rgba(251,113,133,0.1)]">
        <h2 className="text-lg font-bold text-rose-800 mb-6">
          {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (signup only) */}
          {mode === 'signup' && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type="text"
                placeholder="Your name (e.g. Kath)"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                className="w-full pl-12 pr-4 py-3.5 bg-rose-50 rounded-2xl text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full pl-12 pr-4 py-3.5 bg-rose-50 rounded-2xl text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
            />
          </div>

          {/* Password (hidden in reset mode) */}
          {mode !== 'reset' && (
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-12 pr-12 py-3.5 bg-rose-50 rounded-2xl text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300 hover:text-rose-500 transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <p className="text-sm text-rose-400">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          {/* Success */}
          {successMsg && (
            <p className="text-emerald-600 text-sm bg-emerald-50 rounded-xl px-4 py-2">{successMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || (mode !== 'reset' && !password)}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200/50 active:scale-[0.98]"
          >
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-8 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                onClick={() => { setMode('reset'); setError(null); setSuccessMsg(null) }}
                className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
              >
                Forgot password?
              </button>
              <div>
                <p className="text-sm text-rose-400">Don&apos;t have an account?</p>
                <button
                  onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null) }}
                  className="text-sm font-bold text-rose-500 hover:text-rose-700 mt-1 transition-colors"
                >
                  Create one →
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div>
              <p className="text-sm text-rose-400">Already have an account?</p>
              <button
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null) }}
                className="text-sm font-bold text-rose-500 hover:text-rose-700 mt-1 transition-colors"
              >
                ← Sign in instead
              </button>
            </div>
          )}
          {mode === 'reset' && (
            <button
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null) }}
              className="text-sm font-bold text-rose-500 hover:text-rose-700 transition-colors"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
