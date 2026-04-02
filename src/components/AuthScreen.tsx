'use client'
import { useState } from 'react'
import { ShoppingCart, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onSignIn: (email: string, password: string) => Promise<AuthError | null>
  onSignUp: (email: string, password: string) => Promise<AuthError | null>
}

export function AuthScreen({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const err = mode === 'signup'
      ? await onSignUp(email.trim(), password)
      : await onSignIn(email.trim(), password)

    if (err) {
      setError(err.message)
    } else if (mode === 'signup') {
      setSuccess('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col bg-rose-50" style={{ height: '100dvh' }}>
      {/* Top gradient area */}
      <div className="relative flex-shrink-0 pt-16 pb-10 px-8 text-center">
        {/* Floating hearts */}
        <div className="absolute top-6 right-8 text-rose-200 text-3xl animate-pulse">♥</div>
        <div className="absolute top-14 left-6 text-rose-100 text-xl">♥</div>
        <div className="absolute bottom-4 right-16 text-rose-100 text-lg">♥</div>

        {/* Logo */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-200/50 mb-5">
          <ShoppingCart size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-rose-800 tracking-tight">Shopping List</h1>
        <p className="text-rose-400 text-sm mt-1">Your smart grocery companion</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-[2rem] px-8 pt-8 pb-8 shadow-[0_-4px_20px_rgba(251,113,133,0.1)]">
        <h2 className="text-lg font-bold text-rose-800 mb-6">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Password */}
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

          {/* Error / Success */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}
          {success && (
            <p className="text-emerald-600 text-sm bg-emerald-50 rounded-xl px-4 py-2">{success}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200/50 active:scale-[0.98]"
          >
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-8 text-center">
          <p className="text-sm text-rose-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}
            className="text-sm font-bold text-rose-500 hover:text-rose-700 mt-1 transition-colors"
          >
            {mode === 'login' ? 'Create one →' : '← Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  )
}
