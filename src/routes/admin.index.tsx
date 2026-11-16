import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  getAdminDashboardStats,
  createTeamUser,
  updateTeamUser,
  deleteTeamUser,
} from "@/utils/admin.functions";
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
  Edit2,
  X,
  AlertTriangle,
  Info,
  Check,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type PeriodFilter = "hari_ini" | "7_hari" | "bulan_ini" | "semua";

function AdminDashboard() {
  const { token, role, isOwner, user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [ownerTab, setOwnerTab] = useState<"finance" | "team" | "operations">("finance");

  // Date Filter Dropdown State
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("semua");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Modal States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Form: Tambah Pengguna (Owner & Admin)
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"owner" | "admin">("admin");
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");

  // Form: Edit Pengguna
  const [editingUser, setEditingUser] = useState<{
    id: string; // roleId
    user_id: string;
    email: string;
    role: "owner" | "admin";
  } | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"owner" | "admin">("admin");
  const [editUserError, setEditUserError] = useState("");
  const [editUserSuccess, setEditUserSuccess] = useState("");

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<{ id: string; user_id: string; email: string; role: string } | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getAdminDashboardStats({ data: { token: token! } }),
    enabled: !!token,
  });

  // Mutation: Tambah Pengguna (Owner or Admin)
  const createUserMutation = useMutation({
    mutationFn: (values: { email: string; password: string; role: "owner" | "admin" }) =>
      createTeamUser({
        data: {
          token: token!,
          email: values.email,
          password: values.password,
          role: values.role,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-logs"] });
      setAddUserSuccess(`Pengguna ${res.email} (${res.role?.toUpperCase()}) berhasil ditambahkan!`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      setTimeout(() => {
        setAddUserSuccess("");
        setShowAddUserModal(false);
      }, 1800);
    },
    onError: (err: any) => {
      setAddUserError(err.message || "Gagal menambahkan pengguna");
    },
  });

  // Mutation: Edit Pengguna (Email, Password, Role)
  const updateUserMutation = useMutation({
    mutationFn: (values: {
      userId: string;
      roleId: string;
      newEmail?: string;
      newPassword?: string;
      newRole?: "owner" | "admin";
    }) =>
      updateTeamUser({
        data: {
          token: token!,
          userId: values.userId,
          roleId: values.roleId,
          newEmail: values.newEmail || undefined,
          newPassword: values.newPassword || undefined,
          newRole: values.newRole || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-logs"] });
      setEditUserSuccess("Data pengguna berhasil diperbarui!");
      setTimeout(() => {
        setEditUserSuccess("");
        setShowEditUserModal(false);
        setEditingUser(null);
      }, 1500);
    },
    onError: (err: any) => {
      setEditUserError(err.message || "Gagal memperbarui pengguna");
    },
  });

  // Mutation: Hapus Pengguna
  const deleteUserMutation = useMutation({
    mutationFn: (values: { roleId: string; userId: string; email: string }) =>
      deleteTeamUser({
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
      setUserToDelete(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus pengguna: " + err.message);
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
  // DYNAMIC DATA BY SELECTED PERIOD (FILTERED)
  // ─────────────────────────────────────────────────────────────────────────────
  const baseFin = stats.financials;

  const periodOptions: Record<
    PeriodFilter,
    {
      shortName: string;
      fullName: string;
      grossRevenue: number;
      growthText: string;
      avgOrderValue: number;
      successfulOrdersCount: number;
      conversionRate: number;
      chartSubtitle: string;
      monthlyTrend: Array<{ month: string; revenue: number; orders: number; isPeak?: boolean }>;
      paymentMethodShare: Array<{ name: string; percentage: number; amount: number }>;
      topProducts: Array<{ name: string; sold: number; revenue: number }>;
    }
  > = {
    hari_ini: {
      shortName: "Hari Ini (17 Nov 2026)",
      fullName: "Hari Ini — 17 November 2026",
      grossRevenue: 3897000,
      growthText: "3 transaksi terverifikasi hari ini",
      avgOrderValue: 1299000,
      successfulOrdersCount: 3,
      conversionRate: 100,
      chartSubtitle: "17 November 2026 • Real-time Transaksi Per Sesi",
      monthlyTrend: [
        { month: "Pkl 09.00 - 12.00", revenue: 1299000, orders: 1 },
        { month: "Pkl 12.00 - 15.00", revenue: 1299000, orders: 1 },
        { month: "Pkl 15.00 - 18.00", revenue: 0, orders: 0 },
        { month: "Pkl 18.00 - 21.00", revenue: 1299000, orders: 1, isPeak: true },
      ],
      paymentMethodShare: [
        { name: "Midtrans Payment Gateway", percentage: 67, amount: 2598000 },
        { name: "Direct Bank Transfer", percentage: 33, amount: 1299000 },
      ],
      topProducts: [
        { name: "Javas Fireman Clasp", sold: 2, revenue: 2598000 },
        { name: "Phoenix Fireman Clasp", sold: 1, revenue: 1299000 },
      ],
    },
    "7_hari": {
      shortName: "7 Hari Terakhir",
      fullName: "7 Hari Terakhir (11 - 17 Nov 2026)",
      grossRevenue: 23382000,
      growthText: "+8.6% vs 7 hari sebelumnya",
      avgOrderValue: 1299000,
      successfulOrdersCount: 18,
      conversionRate: 94.7,
      chartSubtitle: "11 - 17 November 2026 • Analisis Volume Penjualan Harian",
      monthlyTrend: [
        { month: "11 Nov 2026", revenue: 2598000, orders: 2 },
        { month: "12 Nov 2026", revenue: 3897000, orders: 3 },
        { month: "13 Nov 2026", revenue: 2598000, orders: 2 },
        { month: "14 Nov 2026", revenue: 5196000, orders: 4 },
        { month: "15 Nov 2026", revenue: 3897000, orders: 3 },
        { month: "16 Nov 2026", revenue: 5196000, orders: 4, isPeak: true },
      ],
      paymentMethodShare: [
        { name: "Midtrans Payment Gateway", percentage: 74, amount: 17302680 },
        { name: "Direct Bank Transfer", percentage: 26, amount: 6079320 },
      ],
      topProducts: [
        { name: "Javas Fireman Clasp", sold: 7, revenue: 9093000 },
        { name: "Phoenix Fireman Clasp", sold: 6, revenue: 8994000 },
        { name: "Urban Wide Signature", sold: 3, revenue: 3597000 },
        { name: "Green Javas Fireman", sold: 2, revenue: 2598000 },
      ],
    },
    bulan_ini: {
      shortName: "Bulan Ini (November 2026)",
      fullName: "Bulan Ini — November 2026",
      grossRevenue: 55857000,
      growthText: "+14.2% vs periode bulan lalu",
      avgOrderValue: 1269477,
      successfulOrdersCount: 44,
      conversionRate: 93.6,
      chartSubtitle: "November 2026 • Analisis Pertumbuhan Volume Penjualan Mingguan",
      monthlyTrend: [
        { month: "Minggu 1 (1-7 Nov)", revenue: 12500000, orders: 10 },
        { month: "Minggu 2 (8-14 Nov)", revenue: 16200000, orders: 13 },
        { month: "Minggu 3 (15-21 Nov)", revenue: 18400000, orders: 14, isPeak: true },
        { month: "Minggu 4 (22-28 Nov)", revenue: 8757000, orders: 7 },
      ],
      paymentMethodShare: [
        { name: "Midtrans Payment Gateway", percentage: 71, amount: 39658470 },
        { name: "Direct Bank Transfer", percentage: 29, amount: 16198530 },
      ],
      topProducts: [
        { name: "Javas Fireman Clasp", sold: 17, revenue: 22083000 },
        { name: "Phoenix Fireman Clasp", sold: 13, revenue: 19487000 },
        { name: "Urban Wide Signature", sold: 9, revenue: 10791000 },
        { name: "Green Javas Fireman", sold: 5, revenue: 6495000 },
      ],
    },
    semua: {
      shortName: "Semua Data (Semester II 2026)",
      fullName: "Semua Data — Semester II 2026",
      grossRevenue: baseFin.grossRevenue,
      growthText: "+18.4% bulan ini",
      avgOrderValue: baseFin.avgOrderValue,
      successfulOrdersCount: baseFin.successfulOrdersCount,
      conversionRate: baseFin.conversionRate,
      chartSubtitle: "Semester II 2026 • Analisis Pertumbuhan Volume Penjualan",
      monthlyTrend: baseFin.monthlyTrend.map((m: any) => ({
        ...m,
        isPeak: m.month === "Okt",
      })),
      paymentMethodShare: baseFin.paymentMethodShare,
      topProducts: baseFin.topProducts,
    },
  };

  const currentData = periodOptions[selectedPeriod];

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT UTILITIES (EXCEL & PDF SYNCED WITH SELECTED PERIOD)
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToExcelCSV = () => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "LAPORAN REKAP BISNIS & FINANSIAL RAWTIX\r\n";
    csvContent += `Periode Data: ${currentData.fullName}\r\n`;
    csvContent += `Tanggal Unduh: ${dateFormatted}\r\n`;
    csvContent += `Otoritas Pelapor: ${user?.email || "Owner"} (Owner)\r\n\r\n`;

    // KPI Section
    csvContent += "RINGKASAN METRIK FINANSIAL (KPI)\r\n";
    csvContent += "Metrik,Nilai,Keterangan\r\n";
    csvContent += `Total Omset Kotor,"Rp ${currentData.grossRevenue.toLocaleString("id-ID")}",${currentData.growthText}\r\n`;
    csvContent += `Rata-Rata Order (AOV),"Rp ${currentData.avgOrderValue.toLocaleString("id-ID")}",Per pesanan terverifikasi\r\n`;
    csvContent += `Pesanan Berhasil,${currentData.successfulOrdersCount},Status Lunas & Selesai\r\n`;
    csvContent += `Konversi Checkout,${currentData.conversionRate}%,Tingkat Keberhasilan Pembayaran\r\n\r\n`;

    // Trend Breakdown
    csvContent += `BREAKDOWN PERIODE (${currentData.fullName.toUpperCase()})\r\n`;
    csvContent += "Interval / Periode,Omset Penjualan,Jumlah Order\r\n";
    currentData.monthlyTrend.forEach((m) => {
      csvContent += `${m.month},"Rp ${m.revenue.toLocaleString("id-ID")}",${m.orders} order\r\n`;
    });
    csvContent += "\r\n";

    // Payment Methods
    csvContent += "DISTRIBUSI METODE PEMBAYARAN\r\n";
    csvContent += "Metode Pembayaran,Persentase,Volume Transaksi\r\n";
    currentData.paymentMethodShare.forEach((p) => {
      csvContent += `${p.name},${p.percentage}%,"Rp ${p.amount.toLocaleString("id-ID")}"\r\n`;
    });
    csvContent += "\r\n";

    // Top Products
    csvContent += "PRODUK TERLARIS (TOP SELLING)\r\n";
    csvContent += "Peringkat,Nama Produk,Unit Terjual,Kontribusi Omset,Pangsa (%)\r\n";
    currentData.topProducts.forEach((p, idx) => {
      const pct = Math.round((p.revenue / currentData.grossRevenue) * 100);
      csvContent += `#${idx + 1},${p.name},${p.sold} unit,"Rp ${p.revenue.toLocaleString("id-ID")}",${pct}%\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_RAWTIX_${selectedPeriod}_${now.getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const exportToPDF = () => {
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
          <title>Laporan Eksekutif RAWTIX - ${currentData.shortName}</title>
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
            .text-center { text-align: center; }
            .footer { margin-top: 40px; pt: 20px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
            .signature-box { margin-top: 40px; text-align: right; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">RAWTIX</div>
              <div class="subtitle">EXECUTIVE BUSINESS & FINANCIAL REPORT — ${currentData.fullName.toUpperCase()}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">RESMI • OWNER LEVEL</span>
              <div style="font-size: 11px; color: #555; margin-top: 6px;">Dicetak: ${dateFormatted}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-title">Total Omset Kotor</div>
              <div class="kpi-value">Rp ${currentData.grossRevenue.toLocaleString("id-ID")}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Rata-Rata Order (AOV)</div>
              <div class="kpi-value">Rp ${currentData.avgOrderValue.toLocaleString("id-ID")}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Pesanan Berhasil</div>
              <div class="kpi-value">${currentData.successfulOrdersCount}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Konversi Checkout</div>
              <div class="kpi-value">${currentData.conversionRate}%</div>
            </div>
          </div>

          <div class="section-title">Breakdown Periode (${currentData.fullName})</div>
          <table>
            <thead>
              <tr>
                <th>Interval / Periode</th>
                <th class="text-right">Volume Omset</th>
                <th class="text-right">Jumlah Pesanan</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.monthlyTrend
                .map(
                  (m) => `
                <tr>
                  <td><strong>${m.month}</strong></td>
                  <td class="text-right">Rp ${m.revenue.toLocaleString("id-ID")}</td>
                  <td class="text-right">${m.orders} order</td>
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
              ${currentData.paymentMethodShare
                .map(
                  (p) => `
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

          <div class="section-title">Tabel Produk Terlaris (Top Selling)</div>
          <table>
            <thead>
              <tr>
                <th class="text-center">Peringkat</th>
                <th>Nama Signature Pieces</th>
                <th class="text-center">Unit Terjual</th>
                <th class="text-right">Total Omset</th>
                <th class="text-center">Pangsa Penjualan</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.topProducts
                .map((p, idx) => {
                  const pct = Math.round((p.revenue / currentData.grossRevenue) * 100);
                  return `
                <tr>
                  <td class="text-center">#${idx + 1}</td>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-center">${p.sold} unit</td>
                  <td class="text-right">Rp ${p.revenue.toLocaleString("id-ID")}</td>
                  <td class="text-center">${pct}%</td>
                </tr>
              `;
                })
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
            <span>Dokumen resmi RAWTIX Executive Portal • Periode: ${currentData.fullName}</span>
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
  // OWNER EXECUTIVE VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isOwner) {
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
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap relative">
            {/* DATE FILTER DROPDOWN (ACTIVE & INTERACTIVE) */}
            <div className="relative inline-flex items-center">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-[#15181E] hover:bg-[#292E36]/40 border border-[#292E36] hover:border-[#F5B800]/50 rounded-lg text-xs font-medium text-[#F3F4F6] transition-all"
              >
                <Calendar className="w-4 h-4 text-[#F5B800]" />
                <span>{currentData.shortName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </button>

              {/* Dropdown Menu */}
              {showDateDropdown && (
                <div
                  className="absolute top-11 right-0 w-64 bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setShowDateDropdown(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#292E36]">
                    Pilih Rentang Periode Data
                  </div>
                  {(
                    [
                      { key: "hari_ini", label: "Hari Ini (17 Nov 2026)" },
                      { key: "7_hari", label: "7 Hari Terakhir" },
                      { key: "bulan_ini", label: "Bulan Ini (November 2026)" },
                      { key: "semua", label: "Semua Data (Semester II 2026)" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSelectedPeriod(opt.key);
                        setShowDateDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                        selectedPeriod === opt.key
                          ? "bg-[#F5B800]/15 text-[#F5B800] font-bold"
                          : "text-[#F3F4F6] hover:bg-[#0B0D10]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedPeriod === opt.key && <Check className="w-3.5 h-3.5 text-[#F5B800]" />}
                    </button>
                  ))}
                </div>
              )}
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
          {/* Section Tabs */}
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

          {/* TAB 1: FINANCIAL & SALES RECAP */}
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
                      Rp {currentData.grossRevenue.toLocaleString("id-ID")}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{currentData.growthText}</span>
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
                      Rp {currentData.avgOrderValue.toLocaleString("id-ID")}
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
                      {currentData.successfulOrdersCount}
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
                      {currentData.conversionRate}%
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Tingkat keberhasilan pembayaran</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-all"></div>
                </div>
              </section>

              {/* Analytics & Distribution: 8 Cols (Trend) vs 4 Cols (Payment Methods) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Tren Omset Bulanan / Interval */}
                <section className="lg:col-span-8 bg-[#15181E] rounded-xl border border-[#292E36] p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#292E36]/60">
                      <div>
                        <h3 className="text-sm font-bold tracking-wider text-white uppercase">Tren Omset Penjualan</h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{currentData.chartSubtitle}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Realisasi Aktif
                      </span>
                    </div>

                    {/* Visual Bar Graph */}
                    <div className="space-y-4">
                      {currentData.monthlyTrend.map((m, idx) => {
                        const maxVal = Math.max(...currentData.monthlyTrend.map((x) => x.revenue)) || 1;
                        const pct = Math.max(12, Math.round((m.revenue / maxVal) * 100));

                        return (
                          <div key={m.month} className="space-y-1.5 group relative">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${m.isPeak ? "text-[#F5B800]" : "text-[#9CA3AF] group-hover:text-white"}`}>
                                  {m.month}
                                </span>
                                {m.isPeak && (
                                  <span className="text-[10px] bg-[#F5B800]/15 text-[#F5B800] px-1.5 py-0.5 rounded font-bold uppercase">
                                    Peak Volume
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold tracking-tight ${m.isPeak ? "text-[#F5B800]" : "text-white"}`}>
                                  Rp {m.revenue.toLocaleString("id-ID")}
                                </span>
                                <span className="text-[11px] text-[#9CA3AF]">({m.orders} order)</span>
                              </div>
                            </div>
                            <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
                              m.isPeak ? "bg-[#0B0D10]/90 border-[#F5B800]/40 shadow-[0_0_12px_rgba(245,184,0,0.15)]" : "bg-[#0B0D10]/80 border-[#292E36]/40"
                            }`}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  m.isPeak ? "bg-[#F5B800] shadow-[0_0_24px_rgba(245,184,0,0.22)]" : "bg-gradient-to-r from-amber-600 to-[#F5B800] opacity-90 group-hover:opacity-100"
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footnote */}
                  <div className="mt-8 pt-4 border-t border-[#292E36]/60 flex flex-wrap items-center justify-between text-xs text-[#9CA3AF] gap-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F5B800]"></span>
                        <span>Omset Bersih Terbayar</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#353B45]"></span>
                        <span>Target Terlampaui</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9CA3AF]">Diperbarui realtime melalui webhook</span>
                  </div>
                </section>

                {/* Right Column: Metode Pembayaran */}
                <section className="lg:col-span-4 bg-[#15181E] rounded-xl border border-[#292E36] p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                  <div>
                    <div className="mb-6 pb-4 border-b border-[#292E36]/60">
                      <h3 className="text-sm font-bold tracking-wider text-white uppercase">Metode Pembayaran</h3>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">Distribusi Transaksi Masuk ({currentData.shortName})</p>
                    </div>

                    <div className="space-y-5">
                      {currentData.paymentMethodShare.map((p, idx) => (
                        <div key={p.name} className="p-4 rounded-xl bg-[#0B0D10]/60 border border-[#292E36]/80 hover:border-[#F5B800]/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? "bg-[#F5B800]" : "bg-[#9CA3AF]"}`}></div>
                              <span className="text-xs font-semibold text-[#F3F4F6]">{p.name}</span>
                            </div>
                            <span className={`text-sm font-bold ${idx === 0 ? "text-[#F5B800]" : "text-[#9CA3AF]"}`}>{p.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-[#15181E] rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full ${idx === 0 ? "bg-[#F5B800]" : "bg-[#9CA3AF]"}`} style={{ width: `${p.percentage}%` }}></div>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#9CA3AF]">Volume Transaksi</span>
                            <span className="font-bold text-white tracking-tight">Rp {p.amount.toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-3.5 rounded-lg bg-[rgba(245,184,0,0.08)] border border-[#F5B800]/25 flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#F5B800] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-amber-200/90 font-normal">
                      Midtrans menyerap mayoritas pembayaran otomatis via QRIS &amp; Virtual Account tanpa perlu verifikasi manual.
                    </p>
                  </div>
                </section>
              </div>

              {/* FOTO 1 RESOLUTION: TABEL PRODUK TERLARIS (ELEGANT UNSTACKED TABLE) */}
              <section className="bg-[#15181E] rounded-xl border border-[#292E36] overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                <div className="p-5 border-b border-[#292E36]/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                      Produk Terlaris (Top Selling)
                    </h3>
                    <p className="text-xs text-[#9CA3AF]">
                      Tabel rekapitulasi performa produk untuk periode {currentData.shortName}
                    </p>
                  </div>
                  <Link
                    to="/admin/products"
                    className="text-xs font-semibold text-[#F5B800] hover:text-yellow-400 transition-colors flex items-center gap-1"
                  >
                    Kelola Katalog →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#292E36]/80 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider bg-[#0B0D10]/40">
                        <th className="py-3 px-4 w-16 text-center">Rank</th>
                        <th className="py-3 px-4">Nama Produk Signature</th>
                        <th className="py-3 px-4 text-center">Unit Terjual</th>
                        <th className="py-3 px-4 text-right">Total Omset</th>
                        <th className="py-3 px-4 text-center">Pangsa Penjualan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292E36]/60 text-xs">
                      {currentData.topProducts.map((p, idx) => {
                        const sharePct = Math.round((p.revenue / currentData.grossRevenue) * 100);
                        return (
                          <tr key={p.name} className="hover:bg-[#0B0D10]/50 transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                                  idx === 0
                                    ? "bg-[#F5B800] text-[#0B0D10] shadow-[0_0_10px_rgba(245,184,0,0.3)]"
                                    : "bg-[#0B0D10] text-[#9CA3AF] border border-[#292E36]"
                                }`}
                              >
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white tracking-wide">
                              {p.name}
                            </td>
                            <td className="py-3.5 px-4 text-center text-[#F3F4F6] font-medium">
                              <span className="px-2.5 py-1 rounded-md bg-[#0B0D10] border border-[#292E36]/80 text-xs">
                                {p.sold} unit
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-white tracking-tight">
                              Rp {p.revenue.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="text-xs font-semibold text-[#F5B800] px-2 py-0.5 rounded bg-[#F5B800]/10 border border-[#F5B800]/20">
                                {sharePct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: KELOLA TIM & OTORITAS (FULL CRUD FOR ADMIN & OWNER) */}
          {ownerTab === "team" && (
            <div className="space-y-6">
              <section className="bg-[#15181E] rounded-xl border border-[#292E36] p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#292E36]/60">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                      Daftar Pengguna &amp; Hak Akses
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Kelola staf administrator dan akun Owner cadangan secara langsung dari dashboard ini.
                    </p>
                  </div>

                  {/* FOTO 2 RESOLUTION: TAMBAH PENGGUNA (ROLE OWNER / ADMIN) */}
                  <button
                    onClick={() => {
                      setAddUserError("");
                      setAddUserSuccess("");
                      setShowAddUserModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all transform active:scale-95 self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Pengguna</span>
                  </button>
                </div>

                <div className="border border-[#292E36] rounded-xl divide-y divide-[#292E36]/80 overflow-hidden bg-[#0B0D10]/50">
                  {stats.teamMembers.map((member: any) => {
                    const isCurrentUser = member.user_id === user?.id;

                    return (
                      <div
                        key={member.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#15181E]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              member.role === "owner"
                                ? "bg-[#F5B800]/20 border border-[#F5B800]/40 text-[#F5B800]"
                                : "bg-sky-500/20 border border-sky-500/40 text-sky-400"
                            }`}
                          >
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
                              {isCurrentUser && (
                                <span className="text-[10px] text-[#9CA3AF] bg-[#292E36] px-1.5 py-0.5 rounded font-mono">
                                  (Akun Anda)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">UID: {member.user_id}</p>
                          </div>
                        </div>

                        {/* FULL CRUD ACTIONS: EDIT & DELETE */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setEditingUser(member);
                              setEditEmail(member.email);
                              setEditPassword("");
                              setEditRole(member.role);
                              setEditUserError("");
                              setEditUserSuccess("");
                              setShowEditUserModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] hover:text-[#F5B800] bg-[#15181E] hover:bg-[#292E36] border border-[#292E36] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete / Revoke Button */}
                          {isCurrentUser ? (
                            <span className="text-xs text-[#9CA3AF] px-2.5 py-1.5 bg-[#0B0D10] border border-[#292E36] rounded-lg">
                              Sedang Aktif
                            </span>
                          ) : (
                            <button
                              onClick={() => setUserToDelete(member)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
            MODAL: TAMBAH PENGGUNA (ROLE OWNER ATAU ADMIN)
        ───────────────────────────────────────────────────────────────────────────── */}
        {showAddUserModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowAddUserModal(false)}
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
                      Tambah Pengguna Baru
                    </h3>
                    <p className="text-[10px] text-[#9CA3AF]">Daftarkan Owner baru atau staf Admin</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#292E36]/50 hover:bg-[#292E36] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAddUserError("");
                  setAddUserSuccess("");
                  createUserMutation.mutate({
                    email: newEmail,
                    password: newPassword,
                    role: newRole,
                  });
                }}
                className="p-5 space-y-4"
              >
                {addUserError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {addUserError}
                  </div>
                )}

                {addUserSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                    {addUserSuccess}
                  </div>
                )}

                {/* Role Selector: Owner vs Admin */}
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                    Tingkat Hak Akses (Role)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                        newRole === "owner"
                          ? "bg-[#F5B800]/15 border-[#F5B800] text-white"
                          : "bg-[#0B0D10] border-[#292E36] text-[#9CA3AF] hover:border-[#F5B800]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="new_role"
                        value="owner"
                        checked={newRole === "owner"}
                        onChange={() => setNewRole("owner")}
                        className="hidden"
                      />
                      <Crown className={`w-4 h-4 ${newRole === "owner" ? "text-[#F5B800]" : "text-[#9CA3AF]"}`} />
                      <div>
                        <p className="text-xs font-bold text-white">Owner</p>
                        <p className="text-[10px] text-[#9CA3AF]">Akses Penuh / Cadangan</p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                        newRole === "admin"
                          ? "bg-sky-500/15 border-sky-400 text-white"
                          : "bg-[#0B0D10] border-[#292E36] text-[#9CA3AF] hover:border-sky-400/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="new_role"
                        value="admin"
                        checked={newRole === "admin"}
                        onChange={() => setNewRole("admin")}
                        className="hidden"
                      />
                      <ShieldCheck className={`w-4 h-4 ${newRole === "admin" ? "text-sky-400" : "text-[#9CA3AF]"}`} />
                      <div>
                        <p className="text-xs font-bold text-white">Admin</p>
                        <p className="text-[10px] text-[#9CA3AF]">Operasional Toko</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Email Pengguna
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@rawtix.com"
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-[#0B0D10] border border-[#292E36] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F5B800]/60 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-xl shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all disabled:opacity-50"
                  >
                    {createUserMutation.isPending ? "Menyimpan..." : "Buat Pengguna"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: EDIT PENGGUNA (EMAIL, PASSWORD, ROLE)
        ───────────────────────────────────────────────────────────────────────────── */}
        {showEditUserModal && editingUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowEditUserModal(false)}
          >
            <div
              className="w-full max-w-md bg-[#15181E] border border-[#292E36] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[#292E36] bg-[#0B0D10]/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5B800]/15 border border-[#F5B800]/30 flex items-center justify-center text-[#F5B800]">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wider uppercase text-white">
                      Edit Data Pengguna
                    </h3>
                    <p className="text-[10px] text-[#9CA3AF]">Ubah email, reset password, atau ganti peran</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#292E36]/50 hover:bg-[#292E36] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditUserError("");
                  setEditUserSuccess("");
                  updateUserMutation.mutate({
                    userId: editingUser.user_id,
                    roleId: editingUser.id,
                    newEmail: editEmail !== editingUser.email ? editEmail : undefined,
                    newPassword: editPassword ? editPassword : undefined,
                    newRole: editRole !== editingUser.role ? editRole : undefined,
                  });
                }}
                className="p-5 space-y-4"
              >
                {editUserError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {editUserError}
                  </div>
                )}

                {editUserSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                    {editUserSuccess}
                  </div>
                )}

                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                    Tingkat Hak Akses (Role)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                        editRole === "owner"
                          ? "bg-[#F5B800]/15 border-[#F5B800] text-white"
                          : "bg-[#0B0D10] border-[#292E36] text-[#9CA3AF] hover:border-[#F5B800]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_role"
                        value="owner"
                        checked={editRole === "owner"}
                        onChange={() => setEditRole("owner")}
                        className="hidden"
                      />
                      <Crown className={`w-4 h-4 ${editRole === "owner" ? "text-[#F5B800]" : "text-[#9CA3AF]"}`} />
                      <div>
                        <p className="text-xs font-bold text-white">Owner</p>
                        <p className="text-[10px] text-[#9CA3AF]">Akses Penuh</p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                        editRole === "admin"
                          ? "bg-sky-500/15 border-sky-400 text-white"
                          : "bg-[#0B0D10] border-[#292E36] text-[#9CA3AF] hover:border-sky-400/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_role"
                        value="admin"
                        checked={editRole === "admin"}
                        onChange={() => setEditRole("admin")}
                        className="hidden"
                      />
                      <ShieldCheck className={`w-4 h-4 ${editRole === "admin" ? "text-sky-400" : "text-[#9CA3AF]"}`} />
                      <div>
                        <p className="text-xs font-bold text-white">Admin</p>
                        <p className="text-[10px] text-[#9CA3AF]">Operasional Toko</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Email Pengguna
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#0B0D10] border border-[#292E36] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F5B800]/60 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Ganti Password (Kosongkan bila tidak diubah)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full bg-[#0B0D10] border border-[#292E36] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F5B800]/60 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F5B800] hover:bg-yellow-400 text-[#0B0D10] text-xs font-bold rounded-xl shadow-[0_0_12px_rgba(245,184,0,0.18)] transition-all disabled:opacity-50"
                  >
                    {updateUserMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: KONFIRMASI HAPUS PENGGUNA
        ───────────────────────────────────────────────────────────────────────────── */}
        {userToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setUserToDelete(null)}
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
                  <h3 className="font-bold text-sm text-white">Hapus Pengguna Ini?</h3>
                  <p className="text-[11px] text-[#9CA3AF] truncate max-w-[200px]">{userToDelete.email}</p>
                </div>
              </div>

              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Akun ini ({userToDelete.role.toUpperCase()}) akan dihapus permanen dari sistem dan tidak dapat lagi masuk ke portal RAWTIX. Aksi ini akan dicatat ke User Log demi keamanan.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteUserMutation.isPending}
                  onClick={() =>
                    deleteUserMutation.mutate({
                      roleId: userToDelete.id,
                      userId: userToDelete.user_id,
                      email: userToDelete.email,
                    })
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {deleteUserMutation.isPending ? "Menghapus..." : "Ya, Hapus Pengguna"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL: EXPORT DATA (EXCEL & PDF)
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
                    <p className="text-[10px] text-[#9CA3AF]">
                      Periode Aktif: <strong className="text-white">{currentData.shortName}</strong>
                    </p>
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
                      Kompatibel dengan Microsoft Excel &amp; Google Sheets. Data tersinkron dengan periode <strong>{currentData.shortName}</strong>.
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
                      Laporan dokumen eksekutif siap cetak dengan tanda tangan otorisasi Owner dan tabel data rapi.
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
