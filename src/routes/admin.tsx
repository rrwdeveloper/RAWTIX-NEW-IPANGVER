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
  Palette,
  ClipboardList,
  MoreVertical,
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5B800] to-yellow-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,184,0,0.25)] animate-pulse">
            <span className="text-[#0B0D10] font-black text-xs">RX</span>
          </div>
          <div className="text-[#9CA3AF] text-xs tracking-widest uppercase animate-pulse">
            Memuat Executive Portal...
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/admin/login" });
  };

  const initialLetter = (user?.email?.[0] || (role === "owner" ? "P" : "A")).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0B0D10] text-[#F3F4F6] font-sans antialiased selection:bg-[#F5B800] selection:text-[#0B0D10]">
      {/* Desktop Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0B0D10] border-r border-[#292E36] hidden md:flex flex-col justify-between h-screen sticky top-0 z-30">
        <div>
          {/* Brand Logo Header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-[#292E36]/60">
            <Link to="/admin" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5B800] to-yellow-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,184,0,0.18)] group-hover:scale-105 transition-transform">
                <span className="text-[#0B0D10] font-black tracking-tighter text-sm">RX</span>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wider text-[#F3F4F6] group-hover:text-[#F5B800] transition-colors">
                  RAWTIX
                </h1>
                <p className="text-[10px] font-medium text-[#9CA3AF] tracking-widest uppercase">
                  {role === "owner" ? "Executive Portal" : "Admin Portal"}
                </p>
              </div>
            </Link>

            {role === "owner" ? (
              <span className="bg-[#F5B800]/15 border border-[#F5B800]/30 text-[#F5B800] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <span className="text-[11px] leading-none">★</span>
                Owner
              </span>
            ) : (
              <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            <div className="px-3 pb-2 pt-1 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Menu Utama
            </div>

            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#15181E] transition-all group"
                activeProps={{
                  className: "!bg-gradient-to-r !from-[#F5B800]/15 !to-[#F5B800]/5 !border-l-4 !border-[#F5B800] !text-[#F3F4F6] !font-semibold rounded-l-none",
                }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 flex-shrink-0 text-[#9CA3AF] group-hover:text-[#F5B800] transition-colors" />
                  <span>{item.label}</span>
                </div>
                {item.isOwnerOnly && (
                  <span className="bg-[#F5B800]/15 border border-[#F5B800]/30 text-[#F5B800] text-[9px] font-semibold px-1.5 py-0.5 rounded leading-none uppercase">
                    Owner
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile Badge at Sidebar Bottom */}
        <div className="p-4 border-t border-[#292E36]/60 bg-[#0B0D10]/50 relative">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#15181E]/80 border border-[#292E36]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#F5B800]/20 border border-[#F5B800]/40 flex items-center justify-center text-[#F5B800] font-bold text-xs flex-shrink-0">
                {initialLetter}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3F4F6] truncate" title={user?.email || ""}>
                  {user?.email}
                </p>
                <p className="text-[10px] text-[#9CA3AF] truncate">
                  {role === "owner" ? "Otoritas Penuh Bisnis" : "Staf Operasional Toko"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="text-[#9CA3AF] hover:text-[#F5B800] p-1 transition-colors"
              title="Menu Profil & Keluar"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Popover Menu */}
          {profileMenuOpen && (
            <div className="absolute bottom-16 right-4 left-4 bg-[#15181E] border border-[#292E36] rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 z-50">
              <div className="px-3 py-2 border-b border-[#292E36] text-[11px] text-[#9CA3AF]">
                Masuk sebagai <strong className="text-white">{role?.toUpperCase()}</strong>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar Sesi
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[#292E36] bg-[#0B0D10]/95 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5B800] to-yellow-600 flex items-center justify-center shadow-sm">
              <span className="text-[#0B0D10] font-black text-xs">RX</span>
            </div>
            <span className="font-bold text-sm tracking-wider text-white">RAWTIX</span>
            {role === "owner" ? (
              <span className="bg-[#F5B800]/15 border border-[#F5B800]/30 text-[#F5B800] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                Owner
              </span>
            ) : (
              <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
                Admin
              </span>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-[#9CA3AF] hover:text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-[#0B0D10] border-b border-[#292E36] p-3 space-y-1 z-20">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-[#15181E] rounded-lg transition-colors"
                activeProps={{ className: "!text-white !bg-[#F5B800]/15 !border-l-3 !border-[#F5B800] !font-semibold" }}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-[#F5B800]" />
                  <span>{item.label}</span>
                </div>
                {item.isOwnerOnly && (
                  <span className="bg-[#F5B800]/20 text-[#F5B800] text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Owner
                  </span>
                )}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Sesi
            </button>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
