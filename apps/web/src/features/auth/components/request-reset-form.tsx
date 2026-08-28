'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { requestPasswordReset } from '../lib/client'

type RequestResetForm = {
    email: string
}

export default function RequestResetForm() {
    const [serverError, setServerError] = useState('')
    const [sent, setSent] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RequestResetForm>()

    async function onSubmit(data: RequestResetForm) {
        setServerError('')

        const { error } = await requestPasswordReset({
            email: data.email,
            redirectTo: '/reset-password',
        })

        if (error) {
            setServerError(error.message ?? 'Something went wrong. Please try again.')
            return
        }

        setSent(true)
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
                <h1 className="text-3xl font-bold tracking-tight mb-2">Reset your password</h1>
                <p className="text-muted-foreground">
                    Enter your email and we&apos;ll send you a link to reset it.
                </p>
            </div>

            {sent ? (
                <div className="space-y-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        If that email address is registered with us, a password reset link is on its way. Check your inbox.
                    </p>
                </div>
            ) : (
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

                    {serverError && (
                        <p className="text-sm text-destructive">{serverError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
                        {isSubmitting ? 'Sending...' : 'Send reset link'}
                    </button>
                </form>
            )}

            {/* Sign in link */}
            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    Remembered your password?{' '}
                    <Link href="/sign-in" className="font-semibold text-foreground hover:underline transition-all">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
