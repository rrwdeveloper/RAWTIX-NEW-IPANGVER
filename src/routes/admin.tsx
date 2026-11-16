import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  LogOut,
  Menu,
  X,
  Truck,
  Crown,
  ShieldCheck,
  Palette,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  return (
    <AdminAuthProvider>
      <AdminLayoutGuard />
    </AdminAuthProvider>
  );
}

function AdminLayoutGuard() {
  const { isAuthenticated, isLoading, logout, user, role, isOwner } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const baseNavItems = [
    { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders" as const, label: "Pesanan", icon: ShoppingCart },
    { to: "/admin/products" as const, label: "Katalog Produk", icon: Package },
    { to: "/admin/categories" as const, label: "Kategori", icon: FolderOpen },
    { to: "/admin/shipping" as const, label: "Tarif Pengiriman", icon: Truck },
  ];

  const ownerExclusiveItems = isOwner
    ? [
        {
          to: "/admin/customizer" as const,
          label: "Layout & Tampilan",
          icon: Palette,
          isOwnerOnly: true,
        },
      ]
    : [];

  const navItems = [
    ...baseNavItems,
    ...ownerExclusiveItems,
    { to: "/admin/logs" as const, label: "User Log", icon: ClipboardList },
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/admin/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="text-zinc-400 text-xs tracking-widest uppercase animate-pulse">Memuat Sesi...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 selection:bg-amber-400 selection:text-black">
      {/* Desktop sleek luxury sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/95 shrink-0 shadow-2xl">
        {/* Brand header */}
        <div className="p-5 border-b border-zinc-800/80 bg-black/40">
          <Link to="/admin" className="block group">
            <span className="font-heading text-lg font-bold tracking-[0.25em] uppercase text-white group-hover:text-amber-400 transition-colors">
              RAWTIX
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-medium">
                {isOwner ? "Executive Portal" : "Operational Portal"}
              </span>
              {role === "owner" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full">
                  <Crown className="w-2.5 h-2.5" />
                  Owner
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Admin
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Menu Utama
          </div>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium tracking-wide text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all group"
              activeProps={{ className: "!text-white !bg-zinc-800/90 !font-semibold border border-zinc-700/60 shadow-inner" }}
            >
              <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.isOwnerOnly && (
                <span className="ml-auto text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  Owner
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-black/50 space-y-3">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
              {role === "owner" ? (
                <Crown className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate" title={user?.email || ""}>
                {user?.email}
              </p>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                {role === "owner" ? "Super Authority" : "Operational Staff"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 py-2 rounded-xl transition-all w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Sesi
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-3.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-sm font-bold tracking-[0.2em] uppercase text-white">RAWTIX</span>
            {role === "owner" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full">
                <Crown className="w-2.5 h-2.5" />
                Owner
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" />
                Admin
              </span>
            )}
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-zinc-400 hover:text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-zinc-950 border-b border-zinc-800 p-3 space-y-1 animate-in slide-in-from-top-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                activeProps={{ className: "!text-white !bg-zinc-800 !font-semibold" }}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.isOwnerOnly && (
                  <span className="ml-auto text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    Owner
                  </span>
                )}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Sesi
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto bg-[#09090b]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
