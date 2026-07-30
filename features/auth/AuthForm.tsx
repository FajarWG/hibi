"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  login,
  register,
  type AuthFormState,
} from "@/features/auth/actions";

export function AuthForm({
  mode,
  nextPath = "/today",
}: {
  mode: "login" | "register";
  nextPath?: string;
}) {
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    null,
  );

  const isLogin = mode === "login";
  const usernameError = state?.fieldErrors?.username?.[0];
  const passwordError = state?.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          aria-invalid={Boolean(usernameError)}
          aria-describedby={usernameError ? "username-error" : undefined}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive"
        />
        {usernameError && (
          <p id="username-error" className="text-sm text-destructive">
            {usernameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={8}
          maxLength={200}
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "password-error" : "password-help"}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive"
        />
        {passwordError ? (
          <p id="password-error" className="text-sm text-destructive">
            {passwordError}
          </p>
        ) : !isLogin ? (
          <p id="password-help" className="text-xs text-muted-foreground">
            Use at least 8 characters.
          </p>
        ) : null}
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Please wait" : isLogin ? "Sign in" : "Create account"}
        {!pending && <ArrowRight weight="bold" aria-hidden />}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "New to Hibi?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
