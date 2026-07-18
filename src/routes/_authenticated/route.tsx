import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  QrCode,
  Plus,
  User,
  LogOut,
  BarChart3,
  Search,
  Tag,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const [displayName, setDisplayName] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || user.email?.split("@")[0] || "User");
        setAvatar(data?.avatar_url ?? null);
      });
  }, [user.id, user.email]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/qr-codes", label: "My QR Codes", icon: QrCode },
    { to: "/qr-codes", label: "Favorites", icon: Star, search: { favorite: "1" } },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/categories", label: "Categories", icon: Tag },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-64 border-r bg-sidebar flex flex-col shrink-0">
        <div className="p-5 border-b flex items-center gap-2.5">
          <div className="size-8 bg-primary rounded-lg grid place-items-center text-primary-foreground font-bold shadow-sm">Q</div>
          <span className="font-bold tracking-tight text-lg">QRSync</span>
        </div>
        <Link
          to="/qr/new"
          className="mx-4 mt-4 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="size-4" /> Create QR
        </Link>
        <nav className="p-4 flex-1 space-y-0.5 mt-2">
          {navItems.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              search={item.search as never}
              activeOptions={{ exact: item.to === "/dashboard" }}
              className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 rounded-md font-medium text-sm transition-colors [&.active]:bg-accent [&.active]:text-accent-foreground"
              activeProps={{ className: "active" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-accent grid place-items-center overflow-hidden text-xs font-semibold">
              {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut} className="flex-1">
              <LogOut className="size-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
