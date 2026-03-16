"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, signUp, useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const { data: session, isPending } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteError, setShowInviteError] = useState(false);
  const router = useRouter();

  useEffect(
    function redirectAuthenticatedUsers() {
      if (!isPending && session) {
        router.replace("/dashboard");
      }
    },
    [session, isPending, router]
  );

  useEffect(function extractInviteCodeFromURL() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("invite_code");
      if (code) {
        setInviteCode(code);
      }
    }
  }, []);

  const acceptInvite = useCallback(async () => {
    if (!inviteCode || !session) return;

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      if (response.ok) {
        // Redirect to dashboard with success message
        router.replace("/dashboard?inviteAccepted=true");
      } else {
        const errorData = await response.json();
        setShowInviteError(true);
        setError(`Invitation error: ${errorData.error}`);
      }
    } catch {
      setShowInviteError(true);
      setError("Failed to accept invitation");
    }
  }, [inviteCode, session, router]);

  useEffect(
    function handleInviteCodeAfterAuth() {
      if (session && inviteCode && !showInviteError) {
        acceptInvite();
      }
    },
    [session, inviteCode, showInviteError, acceptInvite]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // Sign up new user
        console.log("Attempting signup with:", { email, name });
        const result = await signUp.email({
          email,
          password,
          name,
        });

        console.log("Signup result:", result);

        if (result.data) {
          console.log("Signup successful, redirecting...");
          // Preserve invite code if present
          if (inviteCode) {
            window.location.href = `/dashboard?invite_code=${inviteCode}&pending_accept=true`;
          } else {
            // Force a page reload to ensure session state is properly updated
            window.location.href = "/dashboard";
          }
        } else if (result.error) {
          console.error("Signup error:", result.error);
          setError(
            result.error.message || result.error.statusText || "Sign up failed"
          );
        } else {
          console.log("No data or error in result:", result);
          setError("Unexpected response from server");
        }
      } else {
        // Sign in existing user
        console.log("Attempting signin with:", { email });
        const result = await signIn.email({
          email,
          password,
        });

        console.log("Signin result:", result);

        if (result.data) {
          console.log("Signin successful, redirecting...");
          // Preserve invite code if present
          if (inviteCode) {
            window.location.href = `/dashboard?invite_code=${inviteCode}&pending_accept=true`;
          } else {
            // Force a page reload to ensure session state is properly updated
            window.location.href = "/dashboard";
          }
        } else if (result.error) {
          console.error("Signin error:", result.error);
          setError(
            result.error.message || result.error.statusText || "Sign in failed"
          );
        } else {
          console.log("No data or error in result:", result);
          setError("Unexpected response from server");
        }
      }
    } catch (err: unknown) {
      console.error("Auth exception:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const callbackURL = inviteCode
        ? `/dashboard?invite_code=${inviteCode}&pending_accept=true`
        : "/dashboard";

      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Google sign-in failed";
      setError(errorMessage);
      setGoogleLoading(false);
    }
  };

  // Show loading state while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render auth form if user is already authenticated
  if (session) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Welcome to Better Do It - Todo app for partners
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {googleLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-gray-600 font-medium">
                  Connecting to Google...
                </span>
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-gray-700 font-medium">
                  Continue with Google
                </span>
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                OR
              </span>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={isSignUp}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ fontSize: "16px" }} // Prevents zoom on iOS
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground ${
                  isSignUp ? "" : "rounded-t-md"
                } focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: "16px" }} // Prevents zoom on iOS
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: "16px" }} // Prevents zoom on iOS
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          {inviteCode && (
            <div className="text-blue-600 text-sm text-center bg-blue-50 border border-blue-200 rounded p-3">
              📧 You have a partnership invitation! Complete your account to
              accept it.
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </div>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-primary hover:text-primary/80 font-medium"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
