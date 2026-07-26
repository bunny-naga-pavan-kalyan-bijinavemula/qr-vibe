import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
