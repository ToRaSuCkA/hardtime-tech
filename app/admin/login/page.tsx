'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ht-bg flex items-center justify-center">
      <div className="w-full max-w-sm bg-ht-card border border-ht-border rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-ht-accent/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-ht-accent" />
          </div>
          <h1 className="text-lg font-semibold text-ht-text">Admin Access</h1>
          <p className="text-xs text-ht-muted">HardTime Tech — restricted area</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            className="bg-ht-surface border border-ht-border rounded-lg px-4 py-2.5 text-sm text-ht-text placeholder:text-ht-muted/60 focus:outline-none focus:border-ht-accent/60 focus:ring-1 focus:ring-ht-accent/30 transition"
          />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="bg-ht-accent hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
