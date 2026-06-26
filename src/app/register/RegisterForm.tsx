"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: AuthActionState = {};

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" type="text" required autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
        />
        <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
      </div>
      <SubmitButton className="btn-primary w-full" pendingLabel="Creating account…">
        Create Account
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
