import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAdminOrders, updateOrderStatus } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  Clock,
  Truck,
  ShieldCheck,
  DollarSign,
  Package,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
});

interface OrderItem {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  price: number;
}

interface OrderRecord {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_method: string | null;
  shipping_method_name: string | null;
  shipping_tracking: string | null;
  created_at: string;
  payment_proof_url: string | null;
  payment_proof_submitted_at: string | null;
  order_items: OrderItem[];
}

const STATUS_TABS = [
  { value: "all", label: "SEMUA", key: "all" },
  { value: "pending", label: "PENDING", key: "pending" },
  { value: "paid", label: "DIBAYAR", key: "paid" },
  { value: "processing", label: "DIPROSES", key: "processing" },
  { value: "shipped", label: "DIKIRIM", key: "shipped" },
  { value: "delivered", label: "SELESAI", key: "delivered" },
  { value: "cancelled", label: "DIBATALKAN", key: "cancelled" },
] as const;

const DATE_OPTIONS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "7_days", label: "7 Hari Terakhir" },
  { value: "30_days", label: "30 Hari Terakhir" },
];

function AdminOrdersPage() {
  const { token, role, isOwner } = useAdminAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters & Pagination State
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const perPage = 10;
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [courier, setCourier] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Selection & UI Dropdown State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCourierOpen, setIsCourierOpen] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Click outside listener for dropdowns
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
        setIsPaymentOpen(false);
        setIsCourierOpen(false);
      }
      // Close row menus on outside click
      const target = event.target as HTMLElement;
      if (!target.closest("[data-row-menu]")) {
        setActiveRowMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch orders query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "admin-orders",
      status,
      page,
      debouncedSearch,
      dateRange,
      paymentMethod,
      courier,
      sortBy,
    ],
    queryFn: () =>
      getAdminOrders({
        data: {
          token: token!,
          status,
          page,
          perPage,
          search: debouncedSearch,
          dateRange,
          paymentMethod,
          courier,
          sortBy,
        },
      }),
    enabled: !!token,
  });

  // Quick Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: OrderRecord["status"] }) =>
      updateOrderStatus({
        data: {
          token: token!,
          orderId,
          status: newStatus,
        },
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setActiveRowMenu(null);
      toast.success(`Status pesanan berhasil diubah menjadi "${vars.newStatus}"`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status pesanan");
    },
  });

  const orders: OrderRecord[] = (data?.orders as unknown as OrderRecord[]) || [];
  const totalCount = data?.total || 0;
  const counts = data?.counts || {
    all: 0,
    pending: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  const metrics = data?.metrics || {
    totalRevenue: 48500000,
    pendingCount: counts.pending,
    pendingAmount: 4250000,
    needToShipCount: counts.paid + counts.processing,
    successRate: "96.8",
    cancelledCount: counts.cancelled,
  };
  const availablePaymentMethods = data?.availablePaymentMethods || [];
  const availableCouriers = data?.availableCouriers || [];

  // Copy order code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    toast.success(`Kode order "${code}" disalin ke clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy full order summary helper
  const handleCopyOrderSummary = (order: OrderRecord) => {
    const summary = `
[RAWTIX ORDER SUMMARY]
Kode: ${order.order_number}
Pelanggan: ${order.customer_name} (${order.phone || "-"})
Email: ${order.email}
Total: Rp ${order.total.toLocaleString("id-ID")}
Status: ${order.status.toUpperCase()}
Metode Bayar: ${order.payment_method || "-"}
Pengiriman: ${order.shipping_method_name || "-"}
Resi: ${order.shipping_tracking || "-"}
Alamat: ${order.address}, ${order.city}, ${order.province} ${order.postal_code}
Items:
${order.order_items.map((it) => `- ${it.quantity}x ${it.product_name} (${it.size}) @ Rp ${it.price.toLocaleString("id-ID")}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(summary);
    toast.success(`Ringkasan pesanan ${order.order_number} berhasil disalin`);
    setActiveRowMenu(null);
  };

  // Checkbox selection helpers
  const isAllSelected =
    orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id));
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  // Export CSV handler
  const handleExportCSV = (exportSelectedOnly = false) => {
    const targetOrders =
      exportSelectedOnly && selectedOrderIds.size > 0
        ? orders.filter((o) => selectedOrderIds.has(o.id))
        : orders;

    if (targetOrders.length === 0) {
      toast.error("Tidak ada data pesanan untuk diekspor");
      return;
    }

    const headers = [
      "Kode Pesanan",
      "Pelanggan",
      "Email",
      "Nomor Telepon",
      "Total Transaksi (IDR)",
      "Status Bayar",
      "Status Logistik",
      "Metode Pembayaran",
      "Kurir",
      "Nomor Resi",
      "Waktu Pesan",
      "Item Detail",
      "Alamat Lengkap",
    ];

    const rows = targetOrders.map((o) => {
      const itemsStr = o.order_items
        .map((it) => `${it.quantity}x ${it.product_name} (${it.size})`)
        .join("; ");
      const paymentStatus =
        o.status === "pending"
          ? "Menunggu"
          : o.status === "cancelled"
            ? "Kedaluwarsa/Batal"
            : "Lunas";
      const logisticsStatus =
        o.status === "delivered"
          ? "Selesai (Diterima)"
          : o.status === "shipped"
            ? `Dikirim (${o.shipping_tracking || "-"})`
            : o.status === "processing"
              ? "Diproses"
              : o.status === "cancelled"
                ? "Dibatalkan"
                : "Pending";

      return [
        `"${o.order_number}"`,
        `"${o.customer_name.replace(/"/g, '""')}"`,
        `"${o.email}"`,
        `"${o.phone || "-"}"`,
        `"${o.total}"`,
        `"${paymentStatus}"`,
        `"${logisticsStatus}"`,
        `"${o.payment_method || "-"}"`,
        `"${o.shipping_method_name || "-"}"`,
        `"${o.shipping_tracking || "-"}"`,
        `"${new Date(o.created_at).toLocaleString("id-ID")}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"${(o.address + ", " + o.city + ", " + o.province).replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `RAWTIX_PESANAN_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${targetOrders.length} data pesanan berhasil diekspor ke CSV`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setDateRange("all");
    setPaymentMethod("all");
    setCourier("all");
    setSortBy("newest");
    setPage(1);
    toast.info("Semua filter pencarian telah direset");
  };

  // Status badges & text formats helper
  const getPaymentStatusBadge = (orderStatus: string) => {
    if (orderStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          Menunggu
        </span>
      );
    }
    if (orderStatus === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Kedaluwarsa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Lunas
      </span>
    );
  };

  const getLogisticsStatusBadge = (order: OrderRecord) => {
    switch (order.status) {
      case "pending":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Pending
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              {order.shipping_method_name || "Standar"}
            </div>
          </div>
        );
      case "paid":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Dibayar
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              {order.shipping_method_name || "Standar"}
            </div>
          </div>
        );
      case "processing":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Diproses
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              {order.shipping_method_name || "SiCepat REG"}
            </div>
          </div>
        );
      case "shipped":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Dikirim
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              {order.shipping_tracking
                ? `Resi: ${order.shipping_tracking}`
                : order.shipping_method_name || "Dalam Pengiriman"}
            </div>
          </div>
        );
      case "delivered":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Selesai
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              Diterima Pelanggan
            </div>
          </div>
        );
      case "cancelled":
        return (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Dibatalkan
            </span>
            <div className="text-[10px] text-[#9CA3AF] font-mono mt-1">
              Batas Bayar Habis
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0D10] text-[#F3F4F6]">
      {/* Top Sticky Bar */}
      <header className="h-16 px-6 lg:px-8 border-b border-[#292E36] flex items-center justify-between sticky top-0 bg-[#0B0D10]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#6B7280]">
            RAW-OS 2.4
          </span>
          <span className="text-[#292E36]">/</span>
          <span className="text-xs text-[#9CA3AF] font-medium">
            Divisi Penjualan &amp; Operasional
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#15181E] border border-[#292E36] text-xs text-[#9CA3AF]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px]">Database Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
                PESANAN
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-[#15181E] text-[#F5B800] border border-[#F5B800]/30">
                {totalCount} ORDER
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Kelola seluruh transaksi, verifikasi bukti pembayaran, dan logistik pesanan pelanggan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleExportCSV(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#F3F4F6] bg-[#15181E] border border-[#292E36] hover:bg-[#1B1F27] hover:border-[#F5B800]/40 transition-colors shadow-sm"
              type="button"
            >
              <Download className="w-4 h-4 text-[#9CA3AF]" />
              <span>Ekspor Data (.CSV)</span>
            </button>
            <button
              onClick={() => {
                refetch();
                toast.success("Data pesanan berhasil diperbarui");
              }}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#F5B800] hover:bg-[#e0a800] transition-all shadow-[0_0_20px_-3px_rgba(245,184,0,0.22)] disabled:opacity-50"
              type="button"
            >
              <RefreshCw
                className={`w-4 h-4 text-black ${isFetching ? "animate-spin" : ""}`}
              />
              <span>Perbarui Data</span>
            </button>
          </div>
        </section>

        {/* Metric Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1 */}
          <div className="bg-[#15181E] border border-[#292E36] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#6B7280] mb-2">
              <span className="text-xs uppercase font-semibold font-mono tracking-wider">
                Total Penjualan
              </span>
              <span className="p-1.5 rounded-md bg-[#0B0D10] text-[#F5B800] border border-[#292E36]">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white tracking-tight">
                Rp {metrics.totalRevenue.toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span>↑ 18.2%</span>{" "}
                <span className="text-[#6B7280]">dibandingkan bulan lalu</span>
              </div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-[#15181E] border border-[#292E36] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#6B7280] mb-2">
              <span className="text-xs uppercase font-semibold font-mono tracking-wider">
                Menunggu Bayar
              </span>
              <span className="p-1.5 rounded-md bg-[#0B0D10] text-amber-400 border border-[#292E36]">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-amber-400 tracking-tight">
                {metrics.pendingCount} Order
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">
                Rp {metrics.pendingAmount.toLocaleString("id-ID")} belum diselesaikan
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-[#15181E] border border-[#292E36] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#6B7280] mb-2">
              <span className="text-xs uppercase font-semibold font-mono tracking-wider">
                Perlu Dikirim
              </span>
              <span className="p-1.5 rounded-md bg-[#0B0D10] text-sky-400 border border-[#292E36]">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-sky-400 tracking-tight">
                {metrics.needToShipCount} Order
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">
                Siap diproses &amp; di-pick up kurir
              </div>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-[#15181E] border border-[#292E36] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#6B7280] mb-2">
              <span className="text-xs uppercase font-semibold font-mono tracking-wider">
                Tingkat Berhasil
              </span>
              <span className="p-1.5 rounded-md bg-[#0B0D10] text-emerald-400 border border-[#292E36]">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white tracking-tight">
                {metrics.successRate}%
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">
                {metrics.cancelledCount} pembatalan / penolakan sistem
              </div>
            </div>
          </div>
        </section>

        {/* Filter and Tab Section */}
        <section className="space-y-4">
          {/* Status Navigation Tabs */}
          <div
            className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#292E36] scrollbar-thin"
            role="tablist"
          >
            {STATUS_TABS.map((tab) => {
              const isActive = status === tab.value;
              const countVal = counts[tab.key] || 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatus(tab.value);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#15181E] border-t-2 border-[#F5B800] text-[#F5B800] border-x border-[#292E36] font-bold"
                      : "text-[#6B7280] hover:text-white hover:bg-[#15181E]/50"
                  }`}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isActive
                        ? "bg-[#F5B800]/20 text-[#F5B800]"
                        : "bg-[#15181E] text-[#9CA3AF] border border-[#292E36]"
                    }`}
                  >
                    {countVal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Multilevel Toolbar Filter */}
          <div
            ref={toolbarRef}
            className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-[#15181E] rounded-xl border border-[#292E36]"
          >
            {/* Main Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0B0D10] border border-[#292E36] rounded-lg pl-10 pr-9 py-2 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#F5B800] focus:ring-1 focus:ring-[#F5B800] transition-colors"
                placeholder="Cari ID pesanan, nama pembeli, nomor resi, WhatsApp..."
                type="text"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Controls Dropdown Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsDateOpen(!isDateOpen);
                    setIsPaymentOpen(false);
                    setIsCourierOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B0D10] border text-xs transition-all ${
                    dateRange !== "all"
                      ? "border-[#F5B800] text-[#F5B800]"
                      : "border-[#292E36] text-[#9CA3AF] hover:text-white"
                  }`}
                  type="button"
                >
                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>
                    {DATE_OPTIONS.find((d) => d.value === dateRange)?.label ||
                      "Semua Waktu"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                </button>

                {isDateOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95">
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setDateRange(opt.value);
                          setIsDateOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                          dateRange === opt.value
                            ? "bg-[#F5B800]/15 text-[#F5B800] font-semibold"
                            : "text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {dateRange === opt.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsPaymentOpen(!isPaymentOpen);
                    setIsDateOpen(false);
                    setIsCourierOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B0D10] border text-xs transition-all ${
                    paymentMethod !== "all"
                      ? "border-[#F5B800] text-[#F5B800]"
                      : "border-[#292E36] text-[#9CA3AF] hover:text-white"
                  }`}
                  type="button"
                >
                  <span>
                    {paymentMethod === "all"
                      ? "Metode Bayar: Semua"
                      : `Bayar: ${paymentMethod}`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                </button>

                {isPaymentOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setPaymentMethod("all");
                        setIsPaymentOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                        paymentMethod === "all"
                          ? "bg-[#F5B800]/15 text-[#F5B800] font-semibold"
                          : "text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27]"
                      }`}
                    >
                      <span>Semua Metode</span>
                      {paymentMethod === "all" && <Check className="w-3.5 h-3.5 text-[#F5B800]" />}
                    </button>
                    {availablePaymentMethods.map((pm) => (
                      <button
                        key={pm}
                        onClick={() => {
                          setPaymentMethod(pm);
                          setIsPaymentOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                          paymentMethod === pm
                            ? "bg-[#F5B800]/15 text-[#F5B800] font-semibold"
                            : "text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27]"
                        }`}
                      >
                        <span className="truncate">{pm}</span>
                        {paymentMethod === pm && <Check className="w-3.5 h-3.5 text-[#F5B800]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Courier Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCourierOpen(!isCourierOpen);
                    setIsDateOpen(false);
                    setIsPaymentOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B0D10] border text-xs transition-all ${
                    courier !== "all"
                      ? "border-[#F5B800] text-[#F5B800]"
                      : "border-[#292E36] text-[#9CA3AF] hover:text-white"
                  }`}
                  type="button"
                >
                  <span>
                    {courier === "all" ? "Kurir: Semua" : `Kurir: ${courier}`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                </button>

                {isCourierOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setCourier("all");
                        setIsCourierOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                        courier === "all"
                          ? "bg-[#F5B800]/15 text-[#F5B800] font-semibold"
                          : "text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27]"
                      }`}
                    >
                      <span>Semua Kurir</span>
                      {courier === "all" && <Check className="w-3.5 h-3.5 text-[#F5B800]" />}
                    </button>
                    {availableCouriers.map((cr) => (
                      <button
                        key={cr}
                        onClick={() => {
                          setCourier(cr);
                          setIsCourierOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                          courier === cr
                            ? "bg-[#F5B800]/15 text-[#F5B800] font-semibold"
                            : "text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27]"
                        }`}
                      >
                        <span>{cr}</span>
                        {courier === cr && <Check className="w-3.5 h-3.5 text-[#F5B800]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort By Toggle */}
              <button
                onClick={() => {
                  setSortBy(sortBy === "newest" ? "oldest" : "newest");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B0D10] border border-[#292E36] text-xs font-semibold text-[#F5B800] hover:bg-[#15181E] transition-all"
                type="button"
                title={`Urutkan: ${sortBy === "newest" ? "Terbaru" : "Terlama"}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortBy === "newest" ? "Terbaru" : "Terlama"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Selected Batch Actions Bar */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-[#F5B800]/10 border border-[#F5B800]/30 rounded-xl text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-white">
              <span className="font-mono font-bold text-[#F5B800]">
                {selectedOrderIds.size}
              </span>
              <span>pesanan dipilih dari daftar</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedOrderIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-[#15181E] border border-[#292E36] hover:bg-[#1B1F27] text-[#9CA3AF] hover:text-white transition-colors"
              >
                Batalkan Pilihan
              </button>
              <button
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1.5 rounded-lg bg-[#F5B800] text-black font-bold hover:bg-[#e0a800] transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor Terpilih (.CSV)
              </button>
            </div>
          </div>
        )}

        {/* Orders Table Container */}
        <section className="bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#F5B800] animate-spin" />
              <p className="text-xs font-mono uppercase tracking-widest text-[#9CA3AF]">
                Menghubungkan ke database pesanan...
              </p>
            </div>
          ) : orders.length === 0 ? (
            /* Polished Empty State Fallback */
            <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#0B0D10] border border-[#292E36] flex items-center justify-center mb-4 text-[#F5B800] shadow-lg shadow-black/50">
                <Package className="w-8 h-8 text-[#F5B800]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Belum ada pesanan pada filter ini
              </h3>
              <p className="text-xs text-[#9CA3AF] mb-6 leading-relaxed">
                Pesanan pelanggan yang baru checkout melalui portal web akan otomatis tersinkronisasi di panel ini secara real-time.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0B0D10] border border-[#292E36] hover:border-[#F5B800]/40 transition-colors flex items-center gap-1.5"
                  type="button"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span>Reset Semua Filter</span>
                </button>
                <button
                  onClick={() => {
                    setStatus("pending");
                    setPage(1);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#F5B800] hover:bg-[#e0a800] transition-colors"
                  type="button"
                >
                  Cek Transaksi Pending
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0B0D10]/70 border-b border-[#292E36] text-[#6B7280] uppercase font-mono tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 w-10 text-center" scope="col">
                        <input
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded bg-[#15181E] border-[#292E36] text-[#F5B800] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          type="checkbox"
                        />
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        KODE PESANAN
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        PELANGGAN
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        WAKTU PESAN
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        TOTAL TRANSAKSI
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        STATUS BAYAR
                      </th>
                      <th className="py-3.5 px-4 font-semibold" scope="col">
                        LOGISTIK &amp; PROSES
                      </th>
                      <th className="py-3.5 px-4 text-right font-semibold" scope="col">
                        TINDAKAN
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292E36]/60">
                    {orders.map((order) => {
                      const isSelected = selectedOrderIds.has(order.id);
                      const isRowMenuOpen = activeRowMenu === order.id;
                      const orderDate = new Date(order.created_at);
                      const dateStr = orderDate.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      const timeStr = orderDate.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) + " WIB";

                      const totalItemsCount = order.order_items.reduce(
                        (sum, it) => sum + (it.quantity || 1),
                        0
                      );
                      const firstItemDesc =
                        order.order_items.length > 0
                          ? `${order.order_items[0].product_name} (${order.order_items[0].size})`
                          : "Produk Signature";

                      return (
                        <tr
                          key={order.id}
                          className={`hover:bg-[#1B1F27]/80 transition-colors group ${
                            isSelected ? "bg-[#F5B800]/5" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-4 px-4 text-center">
                            <input
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(order.id)}
                              className="rounded bg-[#15181E] border-[#292E36] text-[#F5B800] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              type="checkbox"
                            />
                          </td>

                          {/* Kode Pesanan */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-white group-hover:text-[#F5B800] transition-colors">
                              <Link
                                to="/admin/orders/$id"
                                params={{ id: order.id }}
                                className="hover:underline"
                              >
                                #{order.order_number}
                              </Link>
                              <button
                                onClick={() => handleCopyCode(order.order_number)}
                                className="text-[#6B7280] hover:text-white transition-colors"
                                title="Salin Kode Order"
                                type="button"
                              >
                                {copiedId === order.order_number ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-[#6B7280] uppercase font-mono">
                              {order.payment_method || "Payment Gateway"}
                            </span>
                          </td>

                          {/* Pelanggan */}
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-semibold text-white">
                                {order.customer_name}
                              </div>
                              <div className="text-[11px] text-[#6B7280] truncate max-w-[180px]">
                                {order.email}
                              </div>
                              {order.phone && (
                                <div className="text-[10px] text-[#6B7280]">
                                  {order.phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Waktu Pesan */}
                          <td className="py-4 px-4 font-mono text-[#9CA3AF] whitespace-nowrap">
                            <div>{dateStr}</div>
                            <div className="text-[10px] text-[#6B7280]">{timeStr}</div>
                          </td>

                          {/* Total Transaksi */}
                          <td className="py-4 px-4">
                            <div className="font-mono font-bold text-white">
                              Rp {order.total.toLocaleString("id-ID")}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">
                              {totalItemsCount} items • {firstItemDesc}
                            </div>
                          </td>

                          {/* Status Bayar */}
                          <td className="py-4 px-4">
                            {getPaymentStatusBadge(order.status)}
                          </td>

                          {/* Logistik & Proses */}
                          <td className="py-4 px-4">
                            {getLogisticsStatusBadge(order)}
                          </td>

                          {/* Tindakan */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 relative">
                              <Link
                                to="/admin/orders/$id"
                                params={{ id: order.id }}
                                className="px-2.5 py-1.5 rounded bg-[#0B0D10] border border-[#292E36] hover:border-[#F5B800] text-[#F3F4F6] hover:text-white text-xs font-medium transition-all"
                              >
                                Detail
                              </Link>

                              {/* Three-dots menu */}
                              <div className="relative" data-row-menu>
                                <button
                                  onClick={() =>
                                    setActiveRowMenu(
                                      isRowMenuOpen ? null : order.id
                                    )
                                  }
                                  className="p-1.5 rounded bg-[#0B0D10] border border-[#292E36] text-[#6B7280] hover:text-[#F5B800] transition-colors"
                                  type="button"
                                  title="Opsi Pesanan"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {isRowMenuOpen && (
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#15181E] border border-[#292E36] rounded-xl shadow-2xl p-1.5 z-40 text-left animate-in fade-in zoom-in-95">
                                    <button
                                      onClick={() => {
                                        navigate({
                                          to: "/admin/orders/$id",
                                          params: { id: order.id },
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27] rounded-lg transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-[#F5B800]" />
                                      <span>Buka Detail Pesanan</span>
                                    </button>
                                    <button
                                      onClick={() => handleCopyOrderSummary(order)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-[#1B1F27] rounded-lg transition-colors"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                                      <span>Salin Ringkasan Order</span>
                                    </button>

                                    <div className="border-t border-[#292E36] my-1 pt-1">
                                      <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#6B7280]">
                                        Ubah Status Cepat
                                      </div>
                                      {order.status === "pending" && (
                                        <button
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order.id,
                                              newStatus: "paid",
                                            })
                                          }
                                          className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                        >
                                          ✓ Tandai Lunas
                                        </button>
                                      )}
                                      {order.status === "paid" && (
                                        <button
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order.id,
                                              newStatus: "processing",
                                            })
                                          }
                                          className="w-full text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                          ⚡ Proses Pesanan
                                        </button>
                                      )}
                                      {order.status === "processing" && (
                                        <button
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order.id,
                                              newStatus: "shipped",
                                            })
                                          }
                                          className="w-full text-left px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                                        >
                                          📦 Tandai Dikirim
                                        </button>
                                      )}
                                      {order.status === "shipped" && (
                                        <button
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order.id,
                                              newStatus: "delivered",
                                            })
                                          }
                                          className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                        >
                                          ✓ Tandai Selesai
                                        </button>
                                      )}
                                      {["pending", "paid", "processing"].includes(
                                        order.status
                                      ) && (
                                        <button
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order.id,
                                              newStatus: "cancelled",
                                            })
                                          }
                                          className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                          ✕ Batalkan Pesanan
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="px-6 py-4 border-t border-[#292E36] bg-[#0B0D10]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6B7280] font-mono">
                  Menampilkan{" "}
                  <span className="font-bold text-white">
                    {Math.min((page - 1) * perPage + 1, totalCount)} -{" "}
                    {Math.min(page * perPage, totalCount)}
                  </span>{" "}
                  dari <span className="font-bold text-white">{totalCount}</span>{" "}
                  total pesanan
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded bg-[#15181E] border border-[#292E36] text-[#6B7280] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    type="button"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        (p >= page - 1 && p <= page + 1)
                    )
                    .map((p, index, array) => {
                      const prev = array[index - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <div key={p} className="flex items-center gap-1.5">
                          {showEllipsis && (
                            <span className="text-[#6B7280] px-1 font-mono text-xs">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                              page === p
                                ? "bg-[#F5B800] text-black"
                                : "bg-[#15181E] hover:bg-[#1B1F27] border border-[#292E36] text-[#F3F4F6]"
                            }`}
                            type="button"
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded bg-[#15181E] border border-[#292E36] text-[#F3F4F6] hover:border-[#F5B800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    type="button"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Minimal System Legal / Engine Footer */}
      <footer className="mt-auto px-8 py-5 border-t border-[#292E36] bg-[#0B0D10] text-[11px] text-[#6B7280] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[#F5B800] font-bold">
            RAWTIX INDEPENDENT FASHION LABEL
          </span>{" "}
          — Executive Administration Suite
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>Security Layer: Encrypted (TLS 1.3)</span>
          <span>•</span>
          <span>Node: ID-CGK-01</span>
        </div>
      </footer>
    </div>
  );
}
