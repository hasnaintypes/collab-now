'use client'

import React from 'react'
import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'

export default function SignUpPage() {
    const [error, setError] = React.useState('')
    const [loading, setLoading] = React.useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (!name || !email || !password) {
            setError('Please fill in all fields.')
            setLoading(false)
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            setLoading(false)
            return
        }

        // Placeholder for auth integration
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            // signUp({ name, email, password })
        } catch {
            setError('Something went wrong. Please try again.')
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
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create your workspace</h1>
                <p className="text-muted-foreground">Enter your details to begin collaborating.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Full Name
                    </label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Evelyn Thorne"
                        required
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="evelyn@thought.co"
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
                        minLength={8}
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
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            {/* Terms */}
            <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground px-4">
                By signing up, you agree to our{' '}
                <Link href="#" className="underline text-foreground hover:text-primary transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="underline text-foreground hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>

            {/* Sign in link */}
            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/sign-in" className="font-semibold text-foreground hover:underline transition-all">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
