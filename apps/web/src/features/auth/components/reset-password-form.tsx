'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Suspense, useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { resetPassword } from '../lib/client'

type ResetPasswordForm = {
    password: string
    confirmPassword: string
}

function InvalidLink() {
    return (
        <div className="w-full max-w-md">
            <div className="mb-12 text-center">
                <Link href="/" className="inline-flex items-center gap-2">
                    <LogoIcon size={32} />
                    <span className="text-2xl font-bold tracking-tighter">CollabNow</span>
                </Link>
            </div>

            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Link expired</h1>
                <p className="text-muted-foreground">
                    This password reset link is invalid or has expired. Request a new one to continue.
                </p>
            </div>

            <Link
                href="/forgot-password"
                className="block w-full text-center bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200"
            >
                Request a new link
            </Link>

            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    <Link href="/sign-in" className="font-semibold text-foreground hover:underline transition-all">
                        Back to sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const linkError = searchParams.get('error')

    const [serverError, setServerError] = useState('')

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>()

    if (!token || linkError) {
        return <InvalidLink />
    }

    async function onSubmit(data: ResetPasswordForm) {
        setServerError('')

        const { error } = await resetPassword({
            newPassword: data.password,
            token: token as string,
        })

        if (error) {
            setServerError(error.message ?? 'Something went wrong. Please try again.')
            return
        }

        router.push('/sign-in')
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
                <h1 className="text-3xl font-bold tracking-tight mb-2">Set a new password</h1>
                <p className="text-muted-foreground">Choose a new password for your account.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('password', {
                            required: 'Password is required.',
                            minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                        })}
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirm Password
                    </label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('confirmPassword', {
                            required: 'Please confirm your password.',
                            validate: (value) => value === getValues('password') || 'Passwords do not match.',
                        })}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>

                {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
                    {isSubmitting ? 'Resetting...' : 'Reset password'}
                </button>
            </form>
        </div>
    )
}

export default function ResetPasswordForm() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    )
}
