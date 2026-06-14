"use client";

import { useState } from "react";
import Link from "next/link";

export default function PortalLoginPage() {
  const [step, setStep] = useState<"email" | "mfa">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // TODO: POST /api/v1/auth/practice/login — trigger MFA code
    setTimeout(() => { setLoading(false); setStep("mfa"); }, 800);
  }

  function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: POST /api/v1/auth/practice/verify — verify TOTP/passkey, set session
    setTimeout(() => { setLoading(false); window.location.href = "/portal/dashboard"; }, 800);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-700">
            GetBooked
          </Link>
          <p className="mt-2 text-sm text-gray-500">Practice portal</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          {step === "email" ? (
            <>
              <h1 className="text-xl font-bold text-gray-900">Log in</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter your practice email address
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    placeholder="you@practice.com.au"
                  />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Password"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Checking…" : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">Two-factor authentication</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter the code from your authenticator app or passkey prompt
              </p>
              <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-2xl tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="000000"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Need access?{" "}
          <a href="mailto:practices@getbooked.com.au" className="text-brand-600 hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
