import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAdminDashboardStats } from "@/utils/admin.functions";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingCart,
  Clock,
  CreditCard,
  Crown,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Layers,
  Truck,
  Plus,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { token, role, isOwner, user } = useAdminAuth();
  const [ownerTab, setOwnerTab] = useState<"finance" | "team" | "operations">("finance");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getAdminDashboardStats({ data: { token: token! } }),
    enabled: !!token,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <div className="text-xs tracking-widest uppercase text-zinc-400 animate-pulse">
            Memuat data dashboard...
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OWNER EXECUTIVE VIEW (Hierarki Tertinggi: Rekap Finansial & Otoritas Tim)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isOwner) {
    const fin = stats.financials;

    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Portal Eksekutif — Owner
                </span>
                <span className="text-[11px] text-zinc-400">Otoritas Penuh Bisnis</span>
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-wider uppercase text-white">
                Rekap Bisnis &amp; Finansial RAWTIX
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                Selamat datang kembali, <span className="text-white font-medium">{user?.email}</span>. Anda memiliki otoritas penuh untuk memantau omset, kustomisasi web, dan mengelola tim.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/admin/customizer"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Ubah Layout Web
              </Link>
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wider uppercase bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Produk Baru
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-amber-400/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">Total Omset Kotor</span>
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rp {fin.grossRevenue.toLocaleString("id-ID")}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% bulan ini</span>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-sky-400/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">Rata-Rata Order (AOV)</span>
              <div className="w-8 h-8 rounded-xl bg-sky-400/10 border border-sky-400/20 text-sky-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rp {fin.avgOrderValue.toLocaleString("id-ID")}
            </p>
            <p className="text-[11px] text-zinc-400 mt-2">Per pesanan terverifikasi</p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-emerald-400/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">Pesanan Berhasil</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {fin.successfulOrdersCount}
            </p>
            <p className="text-[11px] text-zinc-400 mt-2">Pesanan status lunas &amp; selesai</p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-purple-400/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">Konversi Checkout</span>
              <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {fin.conversionRate}%
            </p>
            <p className="text-[11px] text-zinc-400 mt-2">Tingkat keberhasilan pembayaran</p>
          </div>
        </div>

        {/* Owner Tab Switcher Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setOwnerTab("finance")}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${
              ownerTab === "finance"
                ? "bg-amber-400 text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            📊 Rekap Finansial &amp; Produk
          </button>
          <button
            onClick={() => setOwnerTab("team")}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${
              ownerTab === "team"
                ? "bg-amber-400 text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            👥 Kelola Tim &amp; Otoritas ({stats.teamMembers.length})
          </button>
          <button
            onClick={() => setOwnerTab("operations")}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${
              ownerTab === "operations"
                ? "bg-amber-400 text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            📦 Antrean Operasional Toko
          </button>
        </div>

        {/* TAB 1: FINANCIAL & SALES RECAP */}
        {ownerTab === "finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Trend Visual */}
              <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-bold tracking-wider uppercase text-white">Tren Omset Bulanan</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Semester II 2026</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                    Pertumbuhan Stabil
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {fin.monthlyTrend.map((item) => {
                    const maxRev = 100000000;
                    const pct = Math.min(100, Math.round((item.revenue / maxRev) * 100));
                    return (
                      <div key={item.month} className="space-y-1.5">
                        <div className="flex justify-between text-xs text-zinc-200">
                          <span className="font-medium">{item.month} 2026</span>
                          <span className="font-semibold text-white">
                            Rp {item.revenue.toLocaleString("id-ID")}{" "}
                            <span className="text-zinc-400 font-normal">({item.orders} order)</span>
                          </span>
                        </div>
                        <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Composition */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white mb-1">
                  Metode Pembayaran
                </h2>
                <p className="text-xs text-zinc-400 mb-5">Distribusi Transaksi Masuk</p>

                <div className="space-y-3">
                  {fin.paymentMethodShare.map((p) => (
                    <div key={p.name} className="p-3.5 bg-black/50 border border-zinc-800 rounded-xl">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-zinc-200">{p.name}</span>
                        <span className="font-bold text-amber-400">{p.percentage}%</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Rp {p.amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-3.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Midtrans menyerap mayoritas pembayaran otomatis via QRIS &amp; Virtual Account tanpa perlu verifikasi manual.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Performing Catalog Items */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold tracking-wider uppercase text-white">Produk Terlaris (Top Selling)</h2>
                  <p className="text-xs text-zinc-400">Berdasarkan total kontribusi penjualan</p>
                </div>
                <Link to="/admin/products" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                  Kelola Katalog →
                </Link>
              </div>

              <div className="divide-y divide-zinc-800/80 text-xs">
                {fin.topProducts.map((p, idx) => (
                  <div key={p.name} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-lg bg-black border border-zinc-800 flex items-center justify-center font-bold text-xs text-amber-400">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white tracking-wide">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">Rp {p.revenue.toLocaleString("id-ID")}</p>
                      <p className="text-[11px] text-zinc-400">{p.sold} unit terjual</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAM MANAGEMENT */}
        {ownerTab === "team" && (
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-bold tracking-wider uppercase text-white">Daftar Pengguna &amp; Hak Akses</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hanya Anda (Owner) yang memiliki otoritas mengelola dan melihat daftar akun staff di bawah ini.
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 self-start">
                  Otoritas: Owner
                </span>
              </div>

              <div className="border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 overflow-hidden bg-black/40">
                {stats.teamMembers.map((member) => (
                  <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-semibold text-white">{member.email}</p>
                        {member.role === "owner" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full">
                            <Crown className="w-3 h-3" />
                            Owner (Akses Penuh)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Admin Staff
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono mt-1">UID: {member.user_id}</p>
                    </div>

                    <div className="text-right text-xs text-zinc-400">
                      {member.role === "owner" ? (
                        <span className="text-amber-400 font-semibold">Pemilik Bisnis Utama</span>
                      ) : (
                        <span className="text-zinc-400">Akses Operasional Toko</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1.5">
                <p className="font-semibold text-zinc-200">ℹ️ Cara Menambah Staf Admin Baru:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                  <li>Buat akun baru di <strong>Supabase Dashboard -&gt; Authentication Users</strong>.</li>
                  <li>Salin UID akun baru tersebut.</li>
                  <li>Buka <strong>Table Editor -&gt; user_roles</strong>, lalu Insert Row dengan memilih role <code className="text-amber-400 font-bold">admin</code>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STORE OPERATIONS */}
        {ownerTab === "operations" && (
          <OperationalSection stats={stats} />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN OPERATIONAL VIEW (Fokus Operasional Harian Toko)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Admin Operational Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                <ShieldCheck className="w-3 h-3 text-sky-400" />
                Staff Administrator
              </span>
              <span className="text-[11px] text-zinc-400">Operasional Toko</span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-wider uppercase text-white">
              Dashboard Operasional
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Selamat bekerja, <span className="text-white font-medium">{user?.email}</span>. Pantau pesanan baru dan periksa konfirmasi bukti pembayaran pelanggan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-white hover:bg-zinc-200 text-black rounded-xl transition-all shadow-md active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Kelola Pesanan
            </Link>
          </div>
        </div>
      </div>

      <OperationalSection stats={stats} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE OPERATIONAL METRICS & ORDER LIST COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function OperationalSection({ stats }: { stats: any }) {
  const metrics = [
    { label: "Total Pesanan Masuk", value: stats.totalOrders, icon: ShoppingCart },
    { label: "Menunggu Pembayaran", value: stats.pendingOrders, icon: Clock },
    {
      label: "Bukti Transfer Perlu Dicek",
      value: stats.proofSubmitted,
      icon: CreditCard,
      highlight: stats.proofSubmitted > 0,
    },
    { label: "Total Produk Katalog", value: stats.totalProducts, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`p-5 rounded-2xl border transition-all ${
              m.highlight
                ? "bg-amber-400/10 border-amber-400/40 text-amber-300 shadow-lg"
                : "bg-zinc-900/90 border-zinc-800 text-zinc-300 shadow-md"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <m.icon className={`w-4 h-4 ${m.highlight ? "text-amber-400" : "text-zinc-400"}`} />
              <span className={`text-[10px] tracking-wider uppercase font-semibold ${m.highlight ? "text-amber-400" : "text-zinc-400"}`}>
                {m.label}
              </span>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-300">
            Pesanan Terbaru Membutuhkan Tindakan
          </h2>
          <Link to="/admin/orders" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Lihat Semua Pesanan →
          </Link>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {stats.recentOrders.length === 0 ? (
            <div className="p-8 text-xs text-zinc-400 text-center">Belum ada pesanan aktif.</div>
          ) : (
            stats.recentOrders.map((order: any) => (
              <Link
                key={order.id}
                to="/admin/orders/$id"
                params={{ id: order.id }}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{order.order_number}</p>
                  <p className="text-xs text-zinc-400">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">Rp {order.total.toLocaleString("id-ID")}</p>
                  <StatusBadge status={order.status} proof={!!order.payment_proof_url} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, proof }: { status: string; proof?: boolean }) {
  const colors: Record<string, string> = {
    pending: proof ? "text-amber-400 font-semibold" : "text-zinc-400",
    paid: "text-emerald-400 font-semibold",
    processing: "text-sky-400",
    shipped: "text-purple-400",
    delivered: "text-emerald-400",
    cancelled: "text-rose-400",
  };

  const labels: Record<string, string> = {
    pending: proof ? "⚠️ Cek Bukti Bayar" : "Pending",
    paid: "Lunas",
    processing: "Diproses",
    shipped: "Dikirim",
    delivered: "Selesai",
    cancelled: "Dibatalkan",
  };

  return (
    <span className={`text-[10px] tracking-wider uppercase ${colors[status] ?? "text-zinc-400"}`}>
      {labels[status] ?? status}
    </span>
  );
}
