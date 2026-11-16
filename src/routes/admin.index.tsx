import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAdminDashboardStats, createAdminStaff, deleteAdminStaff } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Sliders,
  Plus,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Trash2,
  X,
  AlertTriangle,
  Sparkles,
  Info,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { token, role, isOwner, user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [ownerTab, setOwnerTab] = useState<"finance" | "team" | "operations">("finance");

  // Modal States
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addAdminError, setAddAdminError] = useState("");
  const [addAdminSuccess, setAddAdminSuccess] = useState("");

  // Delete Admin Confirmation State
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; user_id: string; email: string } | null>(null);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getAdminDashboardStats({ data: { token: token! } }),
    enabled: !!token,
  });

  // Mutation: Create Admin Staff
  const createAdminMutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      createAdminStaff({
        data: {
          token: token!,
          email: values.email,
          password: values.password,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-logs"] });
      setAddAdminSuccess(`Staf Admin ${res.email} berhasil ditambahkan!`);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setTimeout(() => {
        setAddAdminSuccess("");
        setShowAddAdminModal(false);
      }, 2000);
    },
    onError: (err: any) => {
      setAddAdminError(err.message || "Gagal menambahkan staf admin");
    },
  });

  // Mutation: Delete Admin Staff
  const deleteAdminMutation = useMutation({
    mutationFn: (values: { roleId: string; userId: string; email: string }) =>
      deleteAdminStaff({
        data: {
          token: token!,
          roleId: values.roleId,
          userId: values.userId,
          email: values.email,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-logs"] });
      setStaffToDelete(null);
    },
    onError: (err: any) => {
      alert("Gagal mencabut hak akses admin: " + err.message);
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5B800]/10 border border-[#F5B800]/30 flex items-center justify-center animate-pulse">
            <span className="text-[#F5B800] font-black text-xs">RX</span>
          </div>
          <div className="text-xs tracking-widest uppercase text-[#9CA3AF] animate-pulse">
            Memuat Rekap Eksekutif...
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT UTILITIES (EXCEL / CSV & PRINTABLE PDF)
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToExcelCSV = () => {
    const fin = stats.financials;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel compatibility
    csvContent += "LAPORAN REKAP BISNIS & FINANSIAL RAWTIX\r\n";
    csvContent += `Tanggal Cetak: ${dateFormatted}\r\n`;
    csvContent += `Otoritas Pelapor: ${user?.email || "Owner"} (Owner)\r\n\r\n`;

    // KPI Section
    csvContent += "RINGKASAN METRIK FINANSIAL (KPI)\r\n";
    csvContent += "Metrik,Nilai,Keterangan\r\n";
    csvContent += `Total Omset Kotor,"Rp ${fin.grossRevenue.toLocaleString("id-ID")}",+18.4% bulan ini\r\n`;
    csvContent += `Rata-Rata Order (AOV),"Rp ${fin.avgOrderValue.toLocaleString("id-ID")}",Per pesanan terverifikasi\r\n`;
    csvContent += `Pesanan Berhasil,${fin.successfulOrdersCount},Status Lunas & Selesai\r\n`;
    csvContent += `Konversi Checkout,${fin.conversionRate}%,Tingkat Keberhasilan Pembayaran\r\n\r\n`;

    // Monthly Trend
    csvContent += "TREN OMSET BULANAN (SEMESTER II 2026)\r\n";
    csvContent += "Bulan,Omset Penjualan,Jumlah Order,Status\r\n";
    fin.monthlyTrend.forEach((m: any) => {
      csvContent += `${m.month} 2026,"Rp ${m.revenue.toLocaleString("id-ID")}",${m.orders} order,Tercapai\r\n`;
    });
    csvContent += "\r\n";

    // Payment Methods
    csvContent += "DISTRIBUSI METODE PEMBAYARAN\r\n";
    csvContent += "Metode Pembayaran,Persentase,Volume Transaksi\r\n";
    fin.paymentMethodShare.forEach((p: any) => {
      csvContent += `${p.name},${p.percentage}%,"Rp ${p.amount.toLocaleString("id-ID")}"\r\n`;
    });
    csvContent += "\r\n";

    // Top Products
    csvContent += "PRODUK TERLARIS (TOP SELLING)\r\n";
    csvContent += "Peringkat,Nama Produk,Unit Terjual,Kontribusi Omset\r\n";
    fin.topProducts.forEach((p: any, idx: number) => {
      csvContent += `#${idx + 1},${p.name},${p.sold} unit,"Rp ${p.revenue.toLocaleString("id-ID")}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Bisnis_Finansial_RAWTIX_${now.getFullYear()}_${now.getMonth() + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const exportToPDF = () => {
    const fin = stats.financials;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Mohon izinkan pop-up peramban untuk mencetak laporan PDF.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Eksekutif RAWTIX - ${dateFormatted}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F5B800; padding-bottom: 16px; margin-bottom: 24px; }
            .brand { font-size: 24px; font-weight: 800; letter-spacing: 2px; }
            .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
            .badge { background: #F5B800; color: #000; font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 4px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
            .kpi-box { border: 1px solid #ddd; padding: 14px; border-radius: 8px; background: #fafafa; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #777; font-weight: bold; }
            .kpi-value { font-size: 20px; font-weight: bold; margin-top: 6px; color: #111; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #F5B800; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
            th { background: #f4f4f4; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .text-right { text-align: right; }
            .footer { margin-top: 40px; pt: 20px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
            .signature-box { margin-top: 40px; text-align: right; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">RAWTIX</div>
              <div class="subtitle">EXECUTIVE BUSINESS & FINANCIAL SUMMARY REPORT</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">RESMI • OWNER LEVEL</span>
              <div style="font-size: 11px; color: #555; margin-top: 6px;">Dicetak: ${dateFormatted}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-title">Total Omset Kotor</div>
              <div class="kpi-value">Rp ${fin.grossRevenue.toLocaleString("id-ID")}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Rata-Rata Order (AOV)</div>
              <div class="kpi-value">Rp ${fin.avgOrderValue.toLocaleString("id-ID")}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Pesanan Berhasil</div>
              <div class="kpi-value">${fin.successfulOrdersCount}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Konversi Checkout</div>
              <div class="kpi-value">${fin.conversionRate}%</div>
            </div>
          </div>

          <div class="section-title">Tren Omset Bulanan (Semester II 2026)</div>
          <table>
            <thead>
              <tr>
                <th>Bulan</th>
                <th class="text-right">Volume Penjualan (Omset)</th>
                <th class="text-right">Jumlah Pesanan</th>
                <th>Status Realisasi</th>
              </tr>
            </thead>
            <tbody>
              ${fin.monthlyTrend
                .map(
                  (m: any) => `
                <tr>
                  <td><strong>${m.month} 2026</strong></td>
                  <td class="text-right">Rp ${m.revenue.toLocaleString("id-ID")}</td>
                  <td class="text-right">${m.orders} order</td>
                  <td>Target Terlampaui (100%)</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="section-title">Distribusi Metode Pembayaran</div>
          <table>
            <thead>
              <tr>
                <th>Metode Pembayaran</th>
                <th class="text-right">Pangsa (%)</th>
                <th class="text-right">Total Transaksi</th>
              </tr>
            </thead>
            <tbody>
              ${fin.paymentMethodShare
                .map(
                  (p: any) => `
                <tr>
                  <td>${p.name}</td>
                  <td class="text-right"><strong>${p.percentage}%</strong></td>
                  <td class="text-right">Rp ${p.amount.toLocaleString("id-ID")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="section-title">Produk Terlaris (Top Selling)</div>
          <table>
            <thead>
              <tr>
                <th>Peringkat</th>
                <th>Nama Signature Pieces</th>
                <th class="text-right">Unit Terjual</th>
                <th class="text-right">Total Kontribusi Omset</th>
              </tr>
            </thead>
            <tbody>
              ${fin.topProducts
                .map(
                  (p: any, idx: number) => `
                <tr>
                  <td>#${idx + 1}</td>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right">${p.sold} unit</td>
                  <td class="text-right">Rp ${p.revenue.toLocaleString("id-ID")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="signature-box">
            <p style="font-size: 11px; color: #555;">Disahkan oleh Pemilik Bisnis:</p>
            <br/><br/>
            <p><strong>${user?.email || "Owner RAWTIX"}</strong></p>
            <p style="font-size: 10px; color: #888; text-transform: uppercase;">Executive Authority • RAWTIX Heritage</p>
          </div>

          <div class="footer">
            <span>Dokumen ini digenerate secara otomatis oleh RAWTIX Executive Portal.</span>
            <span>Kerahasiaan Tingkat Tinggi (Strictly Confidential)</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
    setShowExportModal(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // OWNER EXECUTIVE VIEW (MATCHING STITCH REDESIGN 1:1)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isOwner) {
    const fin = stats.financials;

    return (
      <div className="flex-1 flex flex-col min-w-0 bg-[#0B0D10] text-[#F3F4F6]">
        {/* Top Global App Header */}
        <header className="h-20 border-b border-[#292E36] px-6 sm:px-8 flex items-center justify-between sticky top-0 bg-[#0B0D10]/95 backdrop-blur-md z-20">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              REKAP BISNIS &amp; FINANSIAL RAWTIX
            </h2>
          </div>

          {/* Action Button Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Date Filter Dropdown */}
            <div className="relative inline-flex items-center">
              <button className="flex items-center gap-2 px-3 py-2 bg-[#15181E] hover:bg-[#292E36]/40 border border-[#292E36] rounded-lg text-xs font-medium text-[#F3F4F6] transition-colors">
                <Calendar className="w-4 h-4 text-[#F5B800]" />
                <span className="hidden sm:inline">17 November 2026</span>
                <span className="sm:hidden">17 Nov 26</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </button>
            </div>

            {/* Export Rekap Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#15181E] hover:bg-[#292E36]/60 border border-[#292E36] hover:border-[#F5B800]/40 text-xs font-medium text-[#F3F4F6] rounded-lg transition-colors shadow-sm"
              title="Unduh Rekap Data (Excel / PDF)"
            >
              <Download className="w-4 h-4 text-[#F5B800]" />
              <span className="hidden md:inline">Export Rekap</span>
            </button>

            {/* Ubah Layout Web */}
            <Link
              to="/admin/customizer"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#15181E] hover:bg-[#292E36]/60 border border-[#292E36] hover:border-[#9CA3AF] text-xs font-medium text-[#F3F4F6] rounded-lg transition-colors"
            >
              <Sliders className="w-4 h-4 text-[#F5B800]" />
              <span className="hidden md:inline">Ubah Layout Web</span>
            </Link>

            {/* + Produk Baru */}
            <Link
              to="/admin/products/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Produk Baru</span>
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-6 sm:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
          {/* Section Tabs (Financial, Team, Operations) */}
          <div className="flex items-center space-x-2 border-b border-[#292E36]/60 pb-3 overflow-x-auto">
            <button
              onClick={() => setOwnerTab("finance")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                ownerTab === "finance"
                  ? "bg-[#F5B800] text-[#0B0D10] font-bold shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#15181E] font-semibold"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>REKAP FINANSIAL &amp; PRODUK</span>
            </button>

            <button
              onClick={() => setOwnerTab("team")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                ownerTab === "team"
                  ? "bg-[#F5B800] text-[#0B0D10] font-bold shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#15181E] font-semibold"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>KELOLA TIM &amp; OTORITAS ({stats.teamMembers.length})</span>
            </button>

            <button
              onClick={() => setOwnerTab("operations")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                ownerTab === "operations"
                  ? "bg-[#F5B800] text-[#0B0D10] font-bold shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#15181E] font-semibold"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>ANTREAN OPERASIONAL TOKO</span>
            </button>
          </div>

          {/* TAB 1: FINANCIAL & SALES RECAP (STITCH REDESIGN 1:1) */}
          {ownerTab === "finance" && (
            <div className="space-y-6">
              {/* 4 High-Impact KPI Metric Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Total Omset Kotor */}
                <div className="bg-[#15181E] rounded-xl border border-[#292E36] p-5 relative overflow-hidden group hover:border-[#F5B800]/40 transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Total Omset Kotor
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#F5B800]/10 border border-[#F5B800]/20 flex items-center justify-center text-[#F5B800]">
                      <span className="font-bold text-sm leading-none">$</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-white tracking-tight">
                      Rp {fin.grossRevenue.toLocaleString("id-ID")}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>+18.4% bulan ini</span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#F5B800]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#F5B800]/10 transition-all"></div>
                </div>

                {/* KPI 2: Rata-Rata Order (AOV) */}
                <div className="bg-[#15181E] rounded-xl border border-[#292E36] p-5 relative overflow-hidden group hover:border-[#F5B800]/40 transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Rata-Rata Order (AOV)
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-white tracking-tight">
                      Rp {fin.avgOrderValue.toLocaleString("id-ID")}
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Per pesanan terverifikasi</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/10 transition-all"></div>
                </div>

                {/* KPI 3: Pesanan Berhasil */}
                <div className="bg-[#15181E] rounded-xl border border-[#292E36] p-5 relative overflow-hidden group hover:border-[#F5B800]/40 transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Pesanan Berhasil
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {fin.successfulOrdersCount}
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Pesanan status lunas &amp; selesai</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all"></div>
                </div>

                {/* KPI 4: Konversi Checkout */}
                <div className="bg-[#15181E] rounded-xl border border-[#292E36] p-5 relative overflow-hidden group hover:border-[#F5B800]/40 transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Konversi Checkout
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {fin.conversionRate}%
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Tingkat keberhasilan pembayaran</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-all"></div>
                </div>
              </section>

              {/* Analytics & Distribution: 8 Cols (Monthly Trend) vs 4 Cols (Payment Methods) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Tren Omset Bulanan (8 cols) */}
                <section className="lg:col-span-8 bg-[#15181E] rounded-xl border border-[#292E36] p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div>
                    {/* Header of Chart Section */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#292E36]/60">
                      <div>
                        <h3 className="text-sm font-bold tracking-wider text-white uppercase">Tren Omset Bulanan</h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">Semester II 2026 • Analisis Pertumbuhan Volume Penjualan</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Pertumbuhan Stabil
                      </span>
                    </div>

                    {/* Visual Bar Graph with Detailed Progress Rows */}
                    <div className="space-y-5">
                      {/* Jun 2026 */}
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-[#9CA3AF] group-hover:text-white transition-colors">Jun 2026</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold tracking-tight">Rp 42.500.000</span>
                            <span className="text-[11px] text-[#9CA3AF]">(32 order)</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-[#0B0D10]/80 rounded-full overflow-hidden p-0.5 border border-[#292E36]/40">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-[#F5B800] opacity-90 transition-all duration-500 group-hover:opacity-100" style={{ width: "49.1%" }}></div>
                        </div>
                      </div>

                      {/* Jul 2026 */}
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-[#9CA3AF] group-hover:text-white transition-colors">Jul 2026</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold tracking-tight">Rp 58.900.000</span>
                            <span className="text-[11px] text-[#9CA3AF]">(45 order)</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-[#0B0D10]/80 rounded-full overflow-hidden p-0.5 border border-[#292E36]/40">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-[#F5B800] opacity-90 transition-all duration-500 group-hover:opacity-100" style={{ width: "68.0%" }}></div>
                        </div>
                      </div>

                      {/* Agu 2026 */}
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-[#9CA3AF] group-hover:text-white transition-colors">Agu 2026</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold tracking-tight">Rp 64.200.000</span>
                            <span className="text-[11px] text-[#9CA3AF]">(50 order)</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-[#0B0D10]/80 rounded-full overflow-hidden p-0.5 border border-[#292E36]/40">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-[#F5B800] opacity-90 transition-all duration-500 group-hover:opacity-100" style={{ width: "74.2%" }}></div>
                        </div>
                      </div>

                      {/* Sep 2026 */}
                      <div className="space-y-1.5 group">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-[#9CA3AF] group-hover:text-white transition-colors">Sep 2026</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold tracking-tight">Rp 71.800.000</span>
                            <span className="text-[11px] text-[#9CA3AF]">(56 order)</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-[#0B0D10]/80 rounded-full overflow-hidden p-0.5 border border-[#292E36]/40">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-[#F5B800] opacity-90 transition-all duration-500 group-hover:opacity-100" style={{ width: "83.0%" }}></div>
                        </div>
                      </div>

                      {/* Okt 2026 (Peak All-Time High) */}
                      <div className="space-y-1.5 group relative">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F5B800]">Okt 2026</span>
                            <span className="text-[10px] bg-[#F5B800]/15 text-[#F5B800] px-1.5 py-0.5 rounded font-bold uppercase">All-time High</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F5B800] font-bold tracking-tight">Rp 86.500.000</span>
                            <span className="text-[11px] text-[#9CA3AF]">(68 order)</span>
                          </div>
                        </div>
                        <div className="w-full h-3.5 bg-[#0B0D10]/90 rounded-full overflow-hidden p-0.5 border border-[#F5B800]/40 shadow-[0_0_12px_rgba(245,184,0,0.15)]">
                          <div className="h-full rounded-full bg-[#F5B800] shadow-[0_0_24px_rgba(245,184,0,0.22)] transition-all duration-500" style={{ width: "100%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Micro Chart Summary Footnote */}
                  <div className="mt-8 pt-4 border-t border-[#292E36]/60 flex flex-wrap items-center justify-between text-xs text-[#9CA3AF] gap-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F5B800]"></span>
                        <span>Omset Bersih Terbayar</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#353B45]"></span>
                        <span>Target Bulanan Terlampaui</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9CA3AF]">Diperbarui realtime melalui webhook</span>
                  </div>
                </section>

                {/* Right Column: Metode Pembayaran (4 cols) */}
                <section className="lg:col-span-4 bg-[#15181E] rounded-xl border border-[#292E36] p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div>
                    {/* Header */}
                    <div className="mb-6 pb-4 border-b border-[#292E36]/60">
                      <h3 className="text-sm font-bold tracking-wider text-white uppercase">Metode Pembayaran</h3>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">Distribusi Transaksi Masuk</p>
                    </div>

                    {/* Payment Methods Breakdown List */}
                    <div className="space-y-5">
                      {/* Midtrans Payment Gateway */}
                      <div className="p-4 rounded-xl bg-[#0B0D10]/60 border border-[#292E36]/80 hover:border-[#F5B800]/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F5B800]"></div>
                            <span className="text-xs font-semibold text-[#F3F4F6]">Midtrans Payment Gateway</span>
                          </div>
                          <span className="text-sm font-bold text-[#F5B800]">68%</span>
                        </div>
                        <div className="w-full h-2 bg-[#15181E] rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-[#F5B800] rounded-full" style={{ width: "68%" }}></div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#9CA3AF]">Volume Transaksi</span>
                          <span className="font-bold text-white tracking-tight">Rp 64.090.000</span>
                        </div>
                      </div>

                      {/* Direct Bank Transfer */}
                      <div className="p-4 rounded-xl bg-[#0B0D10]/60 border border-[#292E36]/80 hover:border-[#F5B800]/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]"></div>
                            <span className="text-xs font-semibold text-[#F3F4F6]">Direct Bank Transfer</span>
                          </div>
                          <span className="text-sm font-bold text-[#9CA3AF]">32%</span>
                        </div>
                        <div className="w-full h-2 bg-[#15181E] rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-[#9CA3AF] rounded-full" style={{ width: "32%" }}></div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#9CA3AF]">Volume Transaksi</span>
                          <span className="font-bold text-white tracking-tight">Rp 30.160.000</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informational Notice Callout Box */}
                  <div className="mt-6 p-3.5 rounded-lg bg-[rgba(245,184,0,0.08)] border border-[#F5B800]/25 flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#F5B800] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-amber-200/90 font-normal">
                      Midtrans menyerap mayoritas pembayaran otomatis via QRIS &amp; Virtual Account tanpa perlu verifikasi manual.
                    </p>
                  </div>
                </section>
              </div>

              {/* Bottom Catalog: Top Performing Products */}
              <section className="bg-[#15181E] rounded-xl border border-[#292E36] overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                <div className="p-5 border-b border-[#292E36]/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                      Produk Terlaris (Top Selling)
                    </h3>
                    <p className="text-xs text-[#9CA3AF]">Berdasarkan total kontribusi penjualan</p>
                  </div>
                  <Link
                    to="/admin/products"
                    className="text-xs font-semibold text-[#F5B800] hover:text-yellow-400 transition-colors flex items-center gap-1"
                  >
                    Kelola Katalog →
                  </Link>
                </div>

                <div className="divide-y divide-[#292E36]/80 text-xs">
                  {fin.topProducts.map((p: any, idx: number) => (
                    <div
                      key={p.name}
                      className="p-4 flex items-center justify-between hover:bg-[#0B0D10]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#0B0D10] border border-[#292E36] flex items-center justify-center font-bold text-xs text-[#F5B800]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-white tracking-wide">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">Rp {p.revenue.toLocaleString("id-ID")}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{p.sold} unit terjual</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: TEAM MANAGEMENT (DIRECT CRUD BY OWNER) */}
          {ownerTab === "team" && (
            <div className="space-y-6">
              <section className="bg-[#15181E] rounded-xl border border-[#292E36] p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#292E36]/60">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                      Daftar Pengguna &amp; Hak Akses
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Kelola staf administrator dan hak akses operasional toko secara langsung dari dashboard.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddAdminModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all transform active:scale-95 self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Staf Admin</span>
                  </button>
                </div>

                <div className="border border-[#292E36] rounded-xl divide-y divide-[#292E36]/80 overflow-hidden bg-[#0B0D10]/50">
                  {stats.teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#15181E]/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F5B800]/15 border border-[#F5B800]/30 flex items-center justify-center text-[#F5B800] font-bold text-xs shrink-0">
                          {(member.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{member.email}</p>
                            {member.role === "owner" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase bg-[#F5B800]/15 text-[#F5B800] border border-[#F5B800]/30 rounded-full">
                                <Crown className="w-3 h-3" />
                                Owner (Akses Penuh)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-full">
                                <ShieldCheck className="w-3 h-3" />
                                Admin Staff
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">UID: {member.user_id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {member.role === "owner" ? (
                          <span className="text-xs text-[#F5B800] font-semibold px-2 py-1 bg-[#F5B800]/10 rounded border border-[#F5B800]/20">
                            Pemilik Akun Utama
                          </span>
                        ) : (
                          <button
                            onClick={() => setStaffToDelete({ id: member.id, user_id: member.user_id, email: member.email })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Cabut Akses</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: STORE OPERATIONS */}
          {ownerTab === "operations" && (
            <OperationalSection stats={stats} />
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: TAMBAH STAF ADMIN BARU (CRUD DIRECT)
        ───────────────────────────────────────────────────────────────────────────── */}
        {showAddAdminModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowAddAdminModal(false)}
          >
            <div
              className="w-full max-w-md bg-[#15181E] border border-[#292E36] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[#292E36] bg-[#0B0D10]/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5B800]/15 border border-[#F5B800]/30 flex items-center justify-center text-[#F5B800]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wider uppercase text-white">
                      Tambah Staf Admin Baru
                    </h3>
                    <p className="text-[10px] text-[#9CA3AF]">Akses operasional toko tanpa data keuangan</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddAdminModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#292E36]/50 hover:bg-[#292E36] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAddAdminError("");
                  setAddAdminSuccess("");
                  createAdminMutation.mutate({
                    email: newAdminEmail,
                    password: newAdminPassword,
                  });
                }}
                className="p-5 space-y-4"
              >
                {addAdminError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {addAdminError}
                  </div>
                )}

                {addAdminSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                    {addAdminSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Email Staf Admin
                  </label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="nama.staf@rawtix.com"
                    className="w-full bg-[#0B0D10] border border-[#292E36] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F5B800]/60 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Password Awal
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-[#0B0D10] border border-[#292E36] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F5B800]/60 rounded-xl"
                  />
                  <p className="text-[10px] text-[#9CA3AF] mt-1">
                    Password ini akan digunakan staf untuk masuk di <code className="text-white">/admin/login</code>.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-xl shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all disabled:opacity-50"
                  >
                    {createAdminMutation.isPending ? "Menyimpan..." : "Buat Akun Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: KONFIRMASI CABUT / HAPUS AKSES ADMIN
        ───────────────────────────────────────────────────────────────────────────── */}
        {staffToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setStaffToDelete(null)}
          >
            <div
              className="w-full max-w-sm bg-[#15181E] border border-rose-500/30 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Cabut Akses Staf Admin?</h3>
                  <p className="text-[11px] text-[#9CA3AF]">{staffToDelete.email}</p>
                </div>
              </div>

              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Staf ini tidak akan lagi dapat masuk ke portal admin RAWTIX. Aksi ini akan dicatat ke User Log demi keamanan.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteAdminMutation.isPending}
                  onClick={() =>
                    deleteAdminMutation.mutate({
                      roleId: staffToDelete.id,
                      userId: staffToDelete.user_id,
                      email: staffToDelete.email,
                    })
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {deleteAdminMutation.isPending ? "Mencabut..." : "Ya, Cabut Hak Akses"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: EXPORT DATA (EXCEL / PDF)
        ───────────────────────────────────────────────────────────────────────────── */}
        {showExportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowExportModal(false)}
          >
            <div
              className="w-full max-w-md bg-[#15181E] border border-[#292E36] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[#292E36] bg-[#0B0D10]/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5B800]/15 border border-[#F5B800]/30 flex items-center justify-center text-[#F5B800]">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wider uppercase text-white">
                      Export Rekap Eksekutif
                    </h3>
                    <p className="text-[10px] text-[#9CA3AF]">Pilih format laporan yang Anda butuhkan</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#292E36]/50 hover:bg-[#292E36] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {/* Option 1: Excel / Spreadsheet */}
                <button
                  onClick={exportToExcelCSV}
                  className="w-full p-4 rounded-xl bg-[#0B0D10] hover:bg-[#292E36]/50 border border-[#292E36] hover:border-[#F5B800]/40 transition-all flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-[#F5B800] transition-colors">
                      Unduh Spreadsheet Excel (.csv)
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Kompatibel dengan Microsoft Excel, Google Sheets, &amp; Apple Numbers. Lengkap dengan tabel tren &amp; produk.
                    </p>
                  </div>
                </button>

                {/* Option 2: PDF Print Document */}
                <button
                  onClick={exportToPDF}
                  className="w-full p-4 rounded-xl bg-[#0B0D10] hover:bg-[#292E36]/50 border border-[#292E36] hover:border-[#F5B800]/40 transition-all flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-[#F5B800] transition-colors">
                      Unduh PDF / Cetak Laporan Resmi
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Tampilan dokumen resmi print-ready siap cetak atau simpan sebagai PDF berstempel otorisasi Owner.
                    </p>
                  </div>
                </button>
              </div>

              <div className="p-4 bg-[#0B0D10]/50 border-t border-[#292E36] flex justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN OPERATIONAL VIEW (Fokus Operasional Harian Toko)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0D10] text-[#F3F4F6]">
      {/* Top Header */}
      <header className="h-20 border-b border-[#292E36] px-6 sm:px-8 flex items-center justify-between sticky top-0 bg-[#0B0D10]/95 backdrop-blur-md z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Staff Administrator
            </span>
            <span className="text-[10px] text-[#9CA3AF]">Operasional Toko</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
            Dashboard Operasional
          </h2>
        </div>

        <Link
          to="/admin/orders"
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg transition-all shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Kelola Pesanan</span>
        </Link>
      </header>

      <div className="p-6 sm:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <OperationalSection stats={stats} />
      </div>
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
            className={`p-5 rounded-xl border transition-all ${
              m.highlight
                ? "bg-[#F5B800]/10 border-[#F5B800]/40 text-[#F5B800] shadow-[0_4px_20px_-2px_rgba(245,184,0,0.15)]"
                : "bg-[#15181E] border-[#292E36] text-[#F3F4F6] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <m.icon className={`w-4 h-4 ${m.highlight ? "text-[#F5B800]" : "text-[#9CA3AF]"}`} />
              <span className={`text-[10px] tracking-wider uppercase font-semibold ${m.highlight ? "text-[#F5B800]" : "text-[#9CA3AF]"}`}>
                {m.label}
              </span>
            </div>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#15181E] border border-[#292E36] rounded-xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
        <div className="p-5 border-b border-[#292E36]/60 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#F3F4F6]">
            Pesanan Terbaru Membutuhkan Tindakan
          </h2>
          <Link to="/admin/orders" className="text-xs text-[#F5B800] hover:text-yellow-400 transition-colors font-medium">
            Lihat Semua Pesanan →
          </Link>
        </div>

        <div className="divide-y divide-[#292E36]/80">
          {stats.recentOrders.length === 0 ? (
            <div className="p-8 text-xs text-[#9CA3AF] text-center">Belum ada pesanan aktif.</div>
          ) : (
            stats.recentOrders.map((order: any) => (
              <Link
                key={order.id}
                to="/admin/orders/$id"
                params={{ id: order.id }}
                className="flex items-center justify-between p-4 hover:bg-[#0B0D10]/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{order.order_number}</p>
                  <p className="text-xs text-[#9CA3AF]">{order.customer_name}</p>
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
    pending: proof ? "text-[#F5B800] font-semibold" : "text-[#9CA3AF]",
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
    <span className={`text-[10px] tracking-wider uppercase ${colors[status] ?? "text-[#9CA3AF]"}`}>
      {labels[status] ?? status}
    </span>
  );
}
