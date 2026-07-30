import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/today" } = await searchParams;

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="font-heading font-semibold tracking-tight">
          Hibi
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-5xl items-center gap-12 py-12 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden space-y-5 md:block">
          <p lang="ja" className="font-jp text-5xl font-medium tracking-tight text-primary">
            書く。覚える。話す。
          </p>
          <h1 className="max-w-lg font-heading text-4xl font-semibold tracking-tight">
            Build a practice you can keep.
          </h1>
          <p className="max-w-[48ch] text-muted-foreground">
            Your study history stays in one place while each practice mode remains focused.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-7 space-y-1.5">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Start with a username and password.
            </p>
          </div>
          <AuthForm mode="register" nextPath={next} />
        </section>
      </div>
    </main>
  );
}
