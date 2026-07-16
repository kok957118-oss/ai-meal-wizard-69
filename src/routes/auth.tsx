import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: unknown; error_description?: unknown; error?: unknown; msg?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.error_description === "string" && e.error_description) return e.error_description;
    if (typeof e.error === "string" && e.error) return e.error;
    if (typeof e.msg === "string" && e.msg) return e.msg;
  }
  return fallback;
}


function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // With email confirmation required, no session is returned until the user
        // clicks the verification link. Show guidance instead of navigating.
        if (!data.session) {
          toast.success("Check your inbox to verify your email before signing in.");
          setMode("signin");
          setPassword("");
          return;
        }
        toast.success("Welcome to MealMate!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[Auth] submit error:", err);
      toast.error(extractErrorMessage(err, "Authentication failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ChefHat className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl">
            {mode === "signin" ? "Welcome back" : "Join MealMate"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to save recipes and plan meals."
              : "Create an account to start cooking."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Chef Thabo"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
          {mode === "signin" && (
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
              disabled={busy}
              onClick={async () => {
                if (!email) {
                  toast.error("Enter your email first, then tap forgot password.");
                  return;
                }
                setBusy(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) throw error;
                  toast.success("Check your inbox for a reset link.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not send reset email");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) throw result.error;
                if (!result.redirected) navigate({ to: "/", replace: true });
              } catch (err) {
                console.error("[Auth] Google sign-in error:", err);
                toast.error(extractErrorMessage(err, "Google sign-in failed"));
                setBusy(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
            </svg>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) throw result.error;
                if (!result.redirected) navigate({ to: "/", replace: true });
              } catch (err) {
                console.error("[Auth] Apple sign-in error:", err);
                toast.error(extractErrorMessage(err, "Apple sign-in failed"));
                setBusy(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 12.855c-.02-2.115 1.72-3.13 1.8-3.185-.98-1.435-2.51-1.63-3.055-1.655-1.3-.13-2.54.765-3.2.765-.66 0-1.68-.745-2.765-.725-1.42.02-2.735.825-3.465 2.095-1.48 2.565-.375 6.36 1.06 8.44.705 1.02 1.545 2.165 2.645 2.125 1.06-.045 1.46-.685 2.745-.685 1.285 0 1.645.685 2.77.66 1.145-.02 1.87-1.03 2.57-2.055.815-1.185 1.15-2.34 1.17-2.4-.025-.01-2.24-.86-2.275-3.38ZM14.09 6.5c.585-.71.98-1.695.87-2.68-.84.035-1.865.56-2.47 1.27-.54.63-1.015 1.635-.885 2.6.94.07 1.895-.475 2.485-1.19Z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>


        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-foreground hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
