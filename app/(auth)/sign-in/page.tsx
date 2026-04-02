'use client'

import React from 'react'
import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'

export default function SignInPage() {
    const [error, setError] = React.useState('')
    const [loading, setLoading] = React.useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (!email || !password) {
            setError('Please fill in all fields.')
            setLoading(false)
            return
        }

        // Placeholder for auth integration
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            // signIn({ email, password })
        } catch {
            setError('Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-12 text-center">
                <Link href="/" className="inline-flex items-center gap-2">
                    <LogoIcon size={32} />
                    <span className="text-2xl font-bold tracking-tighter">CollabNow</span>
                </Link>
            </div>

            {/* Heading */}
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
                <p className="text-muted-foreground">Sign in to your workspace.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Password
                    </label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                    />
                </div>

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            {/* Sign up link */}
            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/sign-up" className="font-semibold text-foreground hover:underline transition-all">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}
