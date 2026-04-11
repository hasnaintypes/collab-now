'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { signIn, sendVerificationEmail } from '@/lib/auth/client'

type SignInForm = {
    email: string
    password: string
}

export default function SignInPage() {
    const router = useRouter()
    const [serverError, setServerError] = useState('')
    const [needsVerification, setNeedsVerification] = useState(false)
    const [verificationEmail, setVerificationEmail] = useState('')
    const [resending, setResending] = useState(false)
    const [resent, setResent] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInForm>()

    async function onSubmit(data: SignInForm) {
        setServerError('')
        setNeedsVerification(false)
        setResent(false)

        const { error } = await signIn.email(
            { email: data.email, password: data.password },
            {
                onSuccess: () => {
                    router.push('/dashboard')
                },
            }
        )

        if (error) {
            const msg = error.message ?? ''
            if (msg.toLowerCase().includes('email is not verified') || error.code === 'EMAIL_NOT_VERIFIED') {
                setNeedsVerification(true)
                setVerificationEmail(data.email)
            } else {
                setServerError(msg || 'Invalid email or password.')
            }
        }
    }

    async function handleResend() {
        if (!verificationEmail || resending) return
        setResending(true)
        setResent(false)
        try {
            await sendVerificationEmail({ email: verificationEmail })
            setResent(true)
        } catch {
            // silently fail
        }
        setResending(false)
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('email', { required: 'Email is required.' })}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('password', { required: 'Password is required.' })}
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                )}

                {needsVerification && (
                    <div className="space-y-3 rounded-md border border-border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">
                            Your email is not verified. Check your inbox or resend the verification email.
                        </p>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="text-sm font-semibold text-foreground hover:underline disabled:opacity-50"
                        >
                            {resending ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
                        </button>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
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
