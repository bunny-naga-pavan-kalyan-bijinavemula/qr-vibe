import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { z } from "zod";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: search,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — QRSync" },
      { name: "description", content: "Sign in or create your QRSync account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { mode } = Route.useSearch();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [authMode, setAuthMode] = useState<"signin" | "signup">(mode || "signin");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required.");
        const { data } = await supabase.auth.getUser();
        if (data.user) router.navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard" });
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      toast.success("OTP sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="size-12 mx-auto bg-primary rounded-xl grid place-items-center text-primary-foreground mb-3">
            <QrCode className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {authMode === "signup" ? "Start generating QR codes in seconds" : "Sign in to your QRSync account"}
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" />OR<div className="h-px bg-border flex-1" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "phone")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone (SMS)</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <form onSubmit={handleEmail} className="space-y-3">
                {authMode === "signup" && (
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="phone" className="space-y-3">
              {!otpSent ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Phone (E.164, e.g. +919876543210)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                  </div>
                  <Button onClick={sendOtp} disabled={loading || !phone} className="w-full">Send OTP</Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Enter OTP</Label>
                    <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                  </div>
                  <Button onClick={verifyOtp} disabled={loading || !otp} className="w-full">Verify & sign in</Button>
                  <Button variant="ghost" size="sm" onClick={() => setOtpSent(false)} className="w-full">Change number</Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-5 pt-5 border-t text-center text-sm text-muted-foreground">
            {authMode === "signup" ? (
              <>Already have an account? <button className="text-primary font-semibold" onClick={() => setAuthMode("signin")}>Sign in</button></>
            ) : (
              <>New here? <button className="text-primary font-semibold" onClick={() => setAuthMode("signup")}>Create account</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
