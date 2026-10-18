import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  useStoredOrders,
  saveOrderToHistory,
  removeStoredOrder,
  type StoredOrder,
} from "@/lib/orderStorage";
import { lookupGuestOrders, syncOrderPaymentStatus } from "@/utils/orders.functions";
import { formatPrice } from "@/lib/utils";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  Trash2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

type FilterTab = "all" | "pending" | "paid" | "cancelled";

function OrdersPage() {
  const navigate = useNavigate();
  const { orders, pendingOrders, paidOrders, cancelledOrders, refreshOrders } =
    useStoredOrders();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  // Tab filtering
  const displayedOrders = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return pendingOrders;
      case "paid":
        return paidOrders;
      case "cancelled":
        return cancelledOrders;
      default:
        return orders;
    }
  }, [activeTab, orders, pendingOrders, paidOrders, cancelledOrders]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Nomor pesanan disalin");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 3) {
      toast.error("Masukkan minimal 3 karakter nomor pesanan atau email");
      return;
    }

    setSearching(true);
    try {
      const results = await lookupGuestOrders({ data: { query } });
      if (!results || results.length === 0) {
        toast.error("Pesanan tidak ditemukan. Periksa kembali nomor atau email Anda.");
      } else {
        toast.success(`Ditemukan ${results.length} pesanan!`);
        // Simpan setiap pesanan yang ditemukan ke localStorage agar tersimpan di perangkat ini
        for (const item of results) {
          saveOrderToHistory({
            orderNumber: item.order_number,
            total: item.total,
            email: item.email,
            customerName: item.customer_name,
            createdAt: item.created_at,
            status: item.status,
            itemCount: item.items.reduce((acc, i) => acc + i.quantity, 0),
            itemsSummary: item.items
              .map((i) => `${i.product_name} (${i.size}) x${i.quantity}`)
              .join(", "),
          });
        }
        refreshOrders();

        // Jika hanya 1 hasil dan nomor order spesifik, bisa langsung buka detailnya jika diinginkan
        if (results.length === 1) {
          navigate({
            to: "/order-success",
            search: { order: results[0].order_number },
          });
        }
      }
    } catch (err) {
      console.error("Gagal melacak pesanan:", err);
      toast.error("Gagal melacak pesanan. Silakan periksa koneksi dan coba lagi.");
    } finally {
      setSearching(false);
    }
  };

  const handleSyncStatus = async (orderNumber: string) => {
    setSyncingOrderId(orderNumber);
    try {
      const result = await syncOrderPaymentStatus({ data: { orderNumber } });
      if (result) {
        saveOrderToHistory({
          orderNumber: result.order_number,
          total: result.total,
          email: result.email,
          customerName: result.customer_name,
          createdAt: result.created_at,
          status: result.status,
          itemCount: result.items.reduce((acc, i) => acc + i.quantity, 0),
          itemsSummary: result.items
            .map((i) => `${i.product_name} (${i.size}) x${i.quantity}`)
            .join(", "),
        });
        refreshOrders();
        toast.success(
          `Status pesanan #${orderNumber}: ${
            result.status === "paid"
              ? "Lunas"
              : result.status === "pending"
              ? "Menunggu Pembayaran"
              : "Dibatalkan"
          }`
        );
      }
    } catch (err) {
      console.error("Gagal sinkron status:", err);
      toast.error("Gagal sinkronisasi status");
    } finally {
      setSyncingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status: StoredOrder["status"]) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lunas</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Dibatalkan / Kedaluwarsa</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu Pembayaran</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />

      <main className="pt-[72px] px-4 sm:px-6 md:px-10 py-10 max-w-4xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-heading text-lg sm:text-xl tracking-[0.25em] uppercase font-bold mb-2">
            Riwayat & Lacak Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Lacak status transaksi Anda, selesaikan pembayaran tertunda, atau temukan pesanan sebelumnya.
          </p>
        </div>

        {/* Search Bar / Tracker */}
        <div className="mb-10 p-5 bg-card border border-border">
          <h2 className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-3">
            Cari / Lacak Pesanan
          </h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Masukkan Nomor Pesanan (misal: RX-...) atau Email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/60 border border-border px-4 py-2.5 text-xs outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 bg-foreground text-background text-xs tracking-wider uppercase font-semibold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mencari...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Lacak</span>
                </>
              )}
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground/80 mt-2">
            💡 Tips: Pesanan yang Anda buat di perangkat ini otomatis tersimpan. Anda juga dapat mencari pesanan lama dengan mengetik alamat email Anda.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-6 border-b border-border text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 tracking-wider uppercase transition-colors ${
              activeTab === "all"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 tracking-wider uppercase flex items-center gap-1.5 transition-colors ${
              activeTab === "pending"
                ? "bg-amber-500 text-black font-semibold"
                : "text-muted-foreground hover:text-amber-400"
            }`}
          >
            <span>Menunggu Pembayaran</span>
            {pendingOrders.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-600/30 text-[10px] rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`px-3 py-1.5 tracking-wider uppercase transition-colors ${
              activeTab === "paid"
                ? "bg-green-600 text-white font-semibold"
                : "text-muted-foreground hover:text-green-400"
            }`}
          >
            Lunas ({paidOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`px-3 py-1.5 tracking-wider uppercase transition-colors ${
              activeTab === "cancelled"
                ? "bg-zinc-700 text-white font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dibatalkan ({cancelledOrders.length})
          </button>
        </div>

        {/* Orders List */}
        {displayedOrders.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/60 p-8">
            <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {activeTab === "all"
                ? "Belum ada riwayat pesanan di perangkat ini"
                : `Tidak ada pesanan dengan status ${
                    activeTab === "pending"
                      ? "Menunggu Pembayaran"
                      : activeTab === "paid"
                      ? "Lunas"
                      : "Dibatalkan"
                  }`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Jika Anda pernah memesan sebelumnya, cari pesanan menggunakan kolom pencarian di atas dengan nomor pesanan atau email.
            </p>
            <div className="mt-6">
              <Link
                to="/shop"
                className="inline-block px-5 py-2.5 bg-foreground text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-foreground/90 transition-colors"
              >
                Mulai Belanja
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((order) => {
              const isPending = order.status === "pending";
              const isSyncing = syncingOrderId === order.orderNumber;

              return (
                <div
                  key={order.orderNumber}
                  className={`p-5 bg-card border transition-colors ${
                    isPending
                      ? "border-amber-500/40 bg-amber-500/[0.02]"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {/* Top Bar: Order Number, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground tracking-wide">
                        #{order.orderNumber}
                      </span>
                      <button
                        onClick={() => handleCopy(order.orderNumber)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Salin Nomor Pesanan"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                      {renderStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Body: Item Summary & Total */}
                  <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      {order.itemsSummary ? (
                        <p className="text-xs text-foreground font-medium line-clamp-2">
                          {order.itemsSummary}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {order.itemCount ? `${order.itemCount} barang dipesan` : "Detail produk pesanan"}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Penerima: {order.customerName || "Guest"} ({order.email})
                      </p>
                    </div>

                    <div className="text-left md:text-right shrink-0">
                      <span className="text-[10px] tracking-wider uppercase text-muted-foreground block">
                        Total Tagihan
                      </span>
                      <span className="font-heading text-base font-bold text-foreground">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* Tombol sinkronisasi status live */}
                      <button
                        onClick={() => handleSyncStatus(order.orderNumber)}
                        disabled={isSyncing}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Periksa status live terkini dari Midtrans"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isSyncing ? "animate-spin text-amber-400" : ""}`}
                        />
                        <span>{isSyncing ? "Memeriksa..." : "Cek Status Live"}</span>
                      </button>

                      {/* Tombol hapus dari lokal */}
                      <button
                        onClick={() => {
                          if (confirm(`Hapus pesanan #${order.orderNumber} dari riwayat perangkat ini?`)) {
                            removeStoredOrder(order.orderNumber);
                          }
                        }}
                        className="text-[11px] text-muted-foreground/60 hover:text-red-400 transition-colors ml-3 flex items-center gap-1"
                        title="Hapus dari penyimpanan browser ini"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {isPending ? (
                        <Link
                          to="/order-success"
                          search={{ order: order.orderNumber }}
                          className="px-5 py-2.5 bg-amber-500 text-black text-xs tracking-wider uppercase font-bold hover:bg-amber-400 transition-colors flex items-center gap-2"
                        >
                          <span>Bayar Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          to="/order-success"
                          search={{ order: order.orderNumber }}
                          className="px-4 py-2 border border-border text-xs tracking-wider uppercase hover:border-foreground transition-colors flex items-center gap-1.5"
                        >
                          <span>Lihat Invoice / Detail</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
