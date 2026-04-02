import Image from 'next/image'

export default function TestimonialsSection() {
    return (
        <section className="overflow-hidden bg-neutral-950 py-32 text-white dark:bg-neutral-900/80">
            <div className="mx-auto max-w-7xl px-8">
                <div className="mb-24 flex flex-col items-end justify-between gap-8 lg:flex-row">
                    <h2 className="text-5xl font-extrabold tracking-tighter">The consensus is clear.</h2>
                    <p className="max-w-sm text-neutral-400">
                        From Fortune 500s to boutique agencies, CollabNow is the standard for high-performance teams.
                    </p>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="rounded-sm border border-white/10 p-12">
                        <p className="mb-10 text-2xl italic leading-relaxed text-neutral-200">
                            &quot;CollabNow has fundamentally changed how our engineering and design teams interface. The friction of &apos;handover&apos; is gone.&quot;
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="size-12 overflow-hidden rounded-full bg-neutral-700">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUFfAWqtLT2HXMJjFG2wK1WeqdvDeoc5JqeLZtEsMy6YW9WRZqOS6qQMd81kDisCp1jqBDzOEI_8P2Diy1adcvfvjNeqlYAk2je6cmVBGzhZ3JQq1hsV_NUuEMK0jUEXvOirLIJTCU5oIdRh6uWw-zGgfBWso-Ar0jn4Zi5YwyO6TyuAWrIEb0uoFzxqSKMGEEUja0SR0mnhS-eS3DEmcuPXPgjrOyC_eDoY5dX22qb5GDpMNvELy_6Fpj6XR4NyIAYIsCpzbEZNw"
                                    alt="Marcus Chen"
                                    width={48}
                                    height={48}
                                    className="size-full object-cover grayscale"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-white">Marcus Chen</div>
                                <div className="text-xs uppercase tracking-widest text-neutral-500">Lead Engineer @ Atmos</div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-sm border border-white/10 p-12">
                        <p className="mb-10 text-2xl italic leading-relaxed text-neutral-200">
                            &quot;The focus on typography and whitespace isn&apos;t just aesthetic — it makes reading complex technical docs a pleasure.&quot;
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="size-12 overflow-hidden rounded-full bg-neutral-700">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7wCJ3l1ZtvjmXct1u4GdK5PvxmzvPX5GPzMmun0zCnwUyEs-U3HA1ADa9cC7oQonST9xSPY3fjLXmfNx3ZNsjRlQYOc_s9HXzfXzEm4t8J5Y7Eyx718BdKboZqjLCYNrZDll9BN9SxYb08vXjtd_n5bTWlfhhnuW3EzIq1D12kBiIN_j6wv6Y2gnT-xThjYtWAA39QbcBengHaZZnCUI4mSpK8mOjbe2O4TecOk-5W6V_p1ehJK9VWDSSEBWamLoNJcQuIURMg_0"
                                    alt="Elena Vance"
                                    width={48}
                                    height={48}
                                    className="size-full object-cover grayscale"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-white">Elena Vance</div>
                                <div className="text-xs uppercase tracking-widest text-neutral-500">Creative Director @ Void</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
