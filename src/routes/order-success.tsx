import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { z } from "zod";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOrderByNumber,
  syncOrderPaymentStatus,
  submitPaymentProof,
  type DetailedOrderResult,
} from "@/utils/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { formatPrice } from "@/lib/utils";
import {
  Check,
  Clock,
  X,
  RefreshCw,
  Copy,
  CheckCheck,
  AlertCircle,
  CreditCard,
  ExternalLink,
  QrCode,
  UploadCloud,
  MessageCircle,
  Download,
  User,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { saveOrderToHistory, updateStoredOrderStatus } from "@/lib/orderStorage";

const searchSchema = z.object({
  order: z.string().optional(),
});

export const Route = createFileRoute("/order-success")({
  validateSearch: (search) => searchSchema.parse(search),
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { order: orderNumber } = useSearch({ from: "/order-success" });
  const [orderData, setOrderData] = useState<DetailedOrderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [dokuModalOpen, setDokuModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"qris" | "id">("qris");

  // Payment proof states
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitProofFn = useServerFn(submitPaymentProof);

  const fetchOrder = useCallback(
    async (showFeedback = false) => {
      if (!orderNumber) return;
      if (showFeedback) setChecking(true);
      try {
        const data = await syncOrderPaymentStatus({ data: { orderNumber } });
        if (data) {
          setOrderData(data);
          saveOrderToHistory({
            orderNumber: data.order_number,
            total: data.total,
            email: data.email,
            customerName: data.customer_name,
            createdAt: data.created_at,
            status: data.status,
            itemCount: (data.items || []).reduce((acc, i) => acc + i.quantity, 0),
            itemsSummary: (data.items || []).map((i) => `${i.product_name} (${i.size}) x${i.quantity}`).join(", "),
          });
          if (showFeedback) {
            if (data.status === "paid") {
              toast.success("Pembayaran terkonfirmasi! Pesanan lunas.");
            } else if (data.status === "cancelled") {
              toast.error(
                data.expiry_time && new Date(data.expiry_time).getTime() <= Date.now()
                  ? "Batas waktu pembayaran telah kedaluwarsa."
                  : "Pembayaran dibatalkan atau ditolak."
              );
            } else {
              toast.info("Status pesanan saat ini: Menunggu Pembayaran.");
            }
          }
        }
      } catch (err) {
        console.error("Gagal sinkron status:", err);
        if (showFeedback) {
          toast.error("Gagal memeriksa status pembayaran. Silakan coba lagi.");
        }
      } finally {
        setLoading(false);
        if (showFeedback) setChecking(false);
      }
    },
    [orderNumber]
  );

  const [countdownText, setCountdownText] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    fetchOrder(false);
  }, [orderNumber, fetchOrder]);

  // Live countdown timer for active pending payment
  useEffect(() => {
    if (!orderData?.expiry_time || orderData.status !== "pending") {
      setCountdownText(null);
      return;
    }

    const expiryMs = new Date(orderData.expiry_time).getTime();
    if (isNaN(expiryMs)) return;

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      if (remainingSeconds <= 0) {
        setCountdownText("Waktu Habis");
        // Automatically sync to update status to expired on client
        fetchOrder(false);
      } else {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        setCountdownText(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [orderData?.expiry_time, orderData?.status, fetchOrder]);

  const isOrderPending = orderData?.status === "pending";

  // Bounded polling if pending; stops immediately on terminal states (paid/cancelled)
  useEffect(() => {
    if (!orderNumber || !isOrderPending) return;

    let pollCount = 0;
    const maxPolls = 60; // 60 cycles (~8 mins active polling)

    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        return;
      }

      getOrderByNumber({ data: { orderNumber } })
        .then((fresh) => {
          if (fresh) {
            setOrderData((prev) => {
              if (prev && fresh.status !== prev.status) {
                updateStoredOrderStatus(fresh.order_number, fresh.status);
                if (fresh.status === "paid") {
                  toast.success("Pembayaran Anda berhasil terverifikasi!");
                } else if (fresh.status === "cancelled") {
                  toast.error(
                    fresh.expiry_time && new Date(fresh.expiry_time).getTime() <= Date.now()
                      ? "Batas waktu pembayaran telah kedaluwarsa."
                      : "Status pembayaran berubah menjadi dibatalkan/kedaluwarsa."
                  );
                }
              }
              return fresh;
            });
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [orderNumber, isOrderPending]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Tersalin ke papan klip");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async () => {
    if (!orderNumber || !proofFile || !proofPreview) {
      toast.error("Pilih file bukti pembayaran terlebih dahulu");
      return;
    }

    setUploadingProof(true);
    try {
      const res = await submitProofFn({
        data: {
          orderNumber,
          fileBase64: proofPreview,
          fileName: proofFile.name,
          contentType: proofFile.type,
        },
      });

      if (res?.success) {
        toast.success("Bukti pembayaran berhasil diunggah! Menunggu konfirmasi admin.");
        setProofFile(null);
        setProofPreview(null);
        fetchOrder(false);
      }
    } catch (err) {
      console.error("Gagal unggah bukti:", err);
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah bukti pembayaran");
    } finally {
      setUploadingProof(false);
    }
  };

  if (!orderNumber) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-[72px] flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Tidak ada pesanan ditemukan.</p>
            <Link
              to="/shop"
              className="mt-4 inline-block text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1"
            >
              Belanja
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-[72px] flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground tracking-wider uppercase text-xs">
            Menyinkronkan status pesanan...
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const isPending = !orderData || orderData.status === "pending";
  const isPaid = orderData?.status === "paid";
  const isCancelled = orderData?.status === "cancelled";
  const isExpired =
    isCancelled &&
    (orderData?.expiry_time ? new Date(orderData.expiry_time).getTime() <= Date.now() : true);

  const isDokuGatewayUrl =
    orderData?.payment_proof_url &&
    orderData.payment_proof_url.startsWith("http") &&
    orderData.payment_proof_url.includes("doku.com");

  const hasSubmittedProof = Boolean(
    orderData?.payment_proof_submitted_at ||
    (orderData?.payment_proof_url && !orderData.payment_proof_url.includes("doku.com"))
  );

  const waMessage = orderData
    ? `Halo Admin RAWTIX, saya ingin konfirmasi pembayaran pesanan saya:

• Nomor Pesanan : ${orderData.order_number}
• Nama Pemesan  : ${orderData.customer_name}
• Total Tagihan : Rp ${orderData.total.toLocaleString("id-ID")}
• Metode Bayar  : DOKU (${activeTab === "qris" ? "QRIS" : "DOKU ID: 1208636329"})
• Status Bukti  : ${hasSubmittedProof ? "Sudah diupload di web" : "Akan dilampirkan via chat"}

Mohon dicek dan diverifikasi agar pesanan segera diproses. Terima kasih!`
    : "";

  const waUrl = `https://wa.me/6285719636329?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-[72px] flex items-center justify-center py-16 px-4 sm:px-6">
        <div className="max-w-xl w-full space-y-8">
          {/* Header Status Visual */}
          {isPaid && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="font-heading text-sm sm:text-base tracking-[0.3em] uppercase text-emerald-400">
                Pesanan Diterima — Pembayaran Berhasil
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Terima kasih telah berbelanja di RAWTIX. Pembayaran Anda telah kami terima dan pesanan Anda akan segera diproses untuk pengiriman.
              </p>
            </div>
          )}

          {isPending && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <h1 className="font-heading text-sm sm:text-base tracking-[0.3em] uppercase text-amber-400">
                Menunggu Pembayaran
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pesanan telah dicatat, namun <strong className="text-foreground">belum dibayar</strong>. Silakan selesaikan pembayaran ke rekening DOKU di bawah agar pesanan segera kami proses.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto border border-destructive/40 bg-destructive/10 flex items-center justify-center">
                <X className="w-7 h-7 text-destructive" />
              </div>
              <h1 className="font-heading text-sm sm:text-base tracking-[0.3em] uppercase text-destructive">
                {isExpired ? "Pembayaran Kedaluwarsa" : "Pembayaran Ditolak / Dibatalkan"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isExpired
                  ? "Batas waktu pembayaran untuk pesanan ini telah habis (expired). Silakan buat pesanan baru jika masih ingin membeli."
                  : "Pembayaran Anda ditolak atau dibatalkan. Tidak ada dana yang terpotong."}
              </p>
            </div>
          )}

          {/* Rincian Pesanan Box */}
          <div className="border border-border p-6 space-y-4 bg-card/40">
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-3">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Nomor Pesanan</span>
              <span className="font-heading tracking-wide text-foreground font-medium">{orderNumber}</span>
            </div>

            {orderData && (
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-3">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Total Tagihan</span>
                <div className="flex items-center gap-2">
                  <span className="font-heading tracking-wide text-foreground font-semibold">
                    {formatPrice(orderData.total)}
                  </span>
                  <button
                    onClick={() => handleCopy(orderData.total.toString(), "total-tagihan")}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Salin nominal total"
                  >
                    {copiedKey === "total-tagihan" ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-3">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Status Pembayaran</span>
              {isPaid && (
                <span className="px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 font-medium">
                  Lunas
                </span>
              )}
              {isPending && (
                <span className="px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase bg-amber-500/10 text-amber-400 border border-amber-500/40 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Belum Dibayar
                </span>
              )}
              {isCancelled && (
                <span className="px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase bg-destructive/10 text-destructive border border-destructive/40 font-medium">
                  {isExpired ? "Kedaluwarsa" : "Ditolak / Dibatalkan"}
                </span>
              )}
            </div>

            {/* Metode Pembayaran Terdeteksi */}
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-3">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Metode Pembayaran</span>
              <span className="text-xs uppercase tracking-wider text-foreground font-mono">
                DOKU (QRIS / ID)
              </span>
            </div>

            {/* Batas Waktu jika ada */}
            {orderData?.expiry_time && isPending && (
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Batas Waktu Bayar
                </span>
                <span className="text-xs text-amber-400 font-mono font-medium">
                  {countdownText ? (
                    <span className="bg-amber-500/10 px-2 py-0.5 border border-amber-500/30">
                      Sisa: {countdownText}
                    </span>
                  ) : (
                    new Date(orderData.expiry_time).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  )}
                </span>
              </div>
            )}
          </div>

          {/* DOKU DIRECT PAYMENT CARD (QRIS & ID) */}
          {isPending && (
            <div className="space-y-6">
              {/* Profile Card Sesuai Gambar DOKU */}
              <div className="border border-border/80 bg-gradient-to-b from-card/80 to-card/40 p-6 rounded-lg space-y-6 shadow-sm">
                {/* Header Profil Akun Penerima */}
                <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-border/60">
                  <div className="w-14 h-14 rounded-full bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground shadow-inner">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-foreground tracking-wide">
                      Yoke Pongky Trisutrisno
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Diverifikasi</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Akun Pembayaran Resmi DOKU e-Wallet &amp; Virtual Account
                  </p>
                </div>

                {/* Tab Switcher: QRIS vs ID/VA */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/40 border border-border rounded-md">
                  <button
                    type="button"
                    onClick={() => setActiveTab("qris")}
                    className={`py-2.5 text-xs font-semibold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 ${
                      activeTab === "qris"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    QRIS DOKU
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("id")}
                    className={`py-2.5 text-xs font-semibold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 ${
                      activeTab === "id"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    DOKU ID / VA
                  </button>
                </div>

                {/* Tab 1: QRIS DOKU Content */}
                {activeTab === "qris" && (
                  <div className="space-y-5 text-center">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Scan &amp; Bayar Cepat
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Mendukung DOKU e-Wallet, GoPay, OVO, Dana, ShopeePay, BCA, Mandiri &amp; Seluruh Aplikasi QRIS
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="relative inline-block mx-auto p-4 bg-white rounded-xl shadow-lg border border-border/40">
                      <img
                        src="/doku-qris.png"
                        alt="QRIS DOKU Yoke Pongky Trisutrisno"
                        className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                      />
                      <div className="mt-2 text-[10px] text-zinc-600 font-mono tracking-wider font-semibold">
                        DOKU ID: 1208636329
                      </div>
                    </div>

                    {/* QR Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <a
                        href="/doku-qris.png"
                        download="qris-doku-rawtix.png"
                        className="px-4 py-2 text-xs uppercase tracking-wider border border-border hover:border-foreground bg-secondary/30 transition-colors flex items-center gap-2 text-foreground font-medium rounded-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh QR Code
                      </a>
                      {orderData && (
                        <button
                          onClick={() => handleCopy(orderData.total.toString(), "copy-total-qris")}
                          className="px-4 py-2 text-xs uppercase tracking-wider border border-border hover:border-foreground bg-secondary/30 transition-colors flex items-center gap-2 text-foreground font-medium rounded-sm"
                        >
                          {copiedKey === "copy-total-qris" ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Nominal Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Nominal Tagihan</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Petunjuk QRIS */}
                    <div className="bg-secondary/20 border border-border/60 p-4 rounded text-left space-y-2">
                      <p className="text-xs font-semibold text-foreground tracking-wide uppercase">
                        Cara Pembayaran QRIS:
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>Buka aplikasi <strong>DOKU</strong> atau e-Wallet / Mobile Banking favorit Anda.</li>
                        <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
                        <li>Arahkan kamera ke kode QR di atas (atau unggah dari galeri jika mengunduh).</li>
                        <li>
                          Pastikan nama penerima: <strong className="text-foreground">Yoke Pongky Trisutrisno</strong> dan nominal tepat: <strong className="text-foreground">{formatPrice(orderData?.total || 0)}</strong>.
                        </li>
                        <li>Selesaikan pembayaran dan simpan bukti transfer.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Tab 2: DOKU ID / VA Content */}
                {activeTab === "id" && (
                  <div className="space-y-5">
                    {/* DOKU ID Highlight Box */}
                    <div className="bg-background border-2 border-amber-500/40 p-5 rounded-lg space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                          Nomor DOKU ID (Virtual Account)
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Diverifikasi
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-secondary/30 p-3 rounded border border-border">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">DOKU ID</p>
                          <p className="font-mono text-xl sm:text-2xl font-bold text-foreground tracking-wider">
                            1208636329
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy("1208636329", "doku-id")}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center gap-1.5 rounded-sm"
                        >
                          {copiedKey === "doku-id" ? (
                            <>
                              <CheckCheck className="w-4 h-4 text-emerald-600" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Salin ID</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1 text-muted-foreground">
                        <span>Nama Akun Tujuan:</span>
                        <strong className="text-foreground font-semibold">Yoke Pongky Trisutrisno</strong>
                      </div>
                    </div>

                    {/* Petunjuk Transfer ID */}
                    <div className="bg-secondary/20 border border-border/60 p-4 rounded text-left space-y-3">
                      <p className="text-xs font-semibold text-foreground tracking-wide uppercase">
                        Petunjuk Transfer ke DOKU ID:
                      </p>
                      <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                        <div className="border-l-2 border-foreground/40 pl-3">
                          <strong className="text-foreground block mb-0.5">1. Sesama Pengguna DOKU:</strong>
                          Buka aplikasi DOKU &gt; Menu Transfer &gt; Ke DOKU ID &gt; Masukkan ID <strong>1208636329</strong> &gt; Masukkan nominal tagihan.
                        </div>
                        <div className="border-l-2 border-foreground/40 pl-3">
                          <strong className="text-foreground block mb-0.5">2. Transfer dari Bank (BCA, Mandiri, Permata, dll):</strong>
                          Buka Mobile Banking / ATM &gt; Pilih menu Transfer Virtual Account / Top Up DOKU &gt; Masukkan nomor tujuan <strong>1208636329</strong> &gt; Pastikan tertera <strong>Yoke Pongky Trisutrisno</strong>.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: UPLOAD BUKTI PEMBAYARAN */}
              <div className="border border-border p-6 rounded-lg bg-card/50 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-foreground" />
                    <h3 className="text-xs font-heading tracking-[0.2em] uppercase font-semibold text-foreground">
                      Unggah Bukti Transfer
                    </h3>
                  </div>
                  {hasSubmittedProof && (
                    <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-medium">
                      Sudah Diunggah
                    </span>
                  )}
                </div>

                {hasSubmittedProof && orderData?.payment_proof_url && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <Check className="w-4 h-4" />
                      <span>Bukti pembayaran berhasil tersimpan!</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Admin RAWTIX sedang memverifikasi pembayaran Anda. Anda juga dapat melihat bukti yang diunggah di bawah.
                    </p>
                    <div className="pt-2">
                      <a
                        href={orderData.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium underline underline-offset-4 hover:text-emerald-400"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Lihat Bukti yang Telah Diunggah ↗
                      </a>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                  />

                  {proofPreview ? (
                    <div className="space-y-3">
                      <div className="relative border border-border rounded p-2 bg-background flex items-center gap-3">
                        <img
                          src={proofPreview}
                          alt="Preview Bukti"
                          className="w-16 h-16 object-cover rounded border border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{proofFile?.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {((proofFile?.size || 0) / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProofFile(null);
                            setProofPreview(null);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleUploadProof}
                        disabled={uploadingProof}
                        className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-foreground text-background font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 rounded-sm"
                      >
                        {uploadingProof ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Mengunggah Bukti...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Kirim Bukti Pembayaran</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-border/80 hover:border-foreground/80 rounded-lg bg-secondary/10 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group"
                    >
                      <UploadCloud className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <p className="text-xs font-medium text-foreground">
                        {hasSubmittedProof ? "Unggah Bukti Baru (Opsional)" : "Pilih File Bukti Transfer"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Format JPG, PNG, atau WEBP (Maksimal 5MB)</p>
                    </button>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS: WHATSAPP KONFIRMASI & CEK STATUS */}
              <div className="space-y-3 pt-2">
                {/* 1. Tombol Konfirmasi WhatsApp Admin */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 text-xs tracking-[0.2em] uppercase bg-[#25D366] text-white font-bold hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 rounded-sm shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  Konfirmasi via WhatsApp (+62 857-1963-6329)
                </a>

                {/* DOKU Gateway Mode Fallback (if gateway checkout URL is returned) */}
                {isDokuGatewayUrl && (
                  <button
                    onClick={() => setDokuModalOpen(true)}
                    className="w-full py-3 text-xs tracking-[0.2em] uppercase border border-amber-500/50 bg-amber-500/10 text-amber-400 font-bold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2 rounded-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Halaman DOKU Checkout
                  </button>
                )}

                {/* 2. Cek Status Pembayaran */}
                <button
                  onClick={() => fetchOrder(true)}
                  disabled={checking}
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase border border-border hover:border-foreground transition-colors flex items-center justify-center gap-2 text-foreground disabled:opacity-50 rounded-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Memeriksa Status..." : "Cek Status Pembayaran"}
                </button>
              </div>

              {/* Notice Banner Keamanan */}
              <div className="border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3 items-start rounded-sm">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Setelah melakukan transfer, silakan lampirkan bukti pembayaran melalui formulir upload di atas atau kirimkan via WhatsApp untuk verifikasi cepat oleh tim RAWTIX.
                </p>
              </div>
            </div>
          )}

          {/* Tombol aksi jika status sudah dibatalkan atau lunas */}
          {isPaid && (
            <div className="space-y-3 text-center">
              <Link
                to="/shop"
                className="block w-full py-3.5 text-xs tracking-[0.25em] uppercase bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors rounded-sm"
              >
                Lanjut Belanja
              </Link>
            </div>
          )}

          {isCancelled && (
            <div className="space-y-3 text-center">
              <Link
                to="/shop"
                className="block w-full py-3.5 text-xs tracking-[0.25em] uppercase bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors rounded-sm"
              >
                Pesan Ulang / Belanja Lagi
              </Link>
              <button
                onClick={() => fetchOrder(true)}
                disabled={checking}
                className="w-full py-3 text-xs tracking-[0.2em] uppercase border border-border hover:border-foreground transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50 rounded-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Memeriksa..." : "Periksa Status Ulang"}
              </button>
            </div>
          )}

          {/* Bantuan WhatsApp */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Butuh bantuan terkait pembayaran? Hubungi kami via{" "}
            <a
              href="https://wa.me/6285719636329"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-muted-foreground transition-colors border-b border-foreground/30 font-medium"
            >
              WhatsApp (+62 857-1963-6329)
            </a>
          </p>
        </div>
      </main>
      <Footer />

      {/* DOKU Gateway Payment Modal Fallback */}
      {dokuModalOpen && isDokuGatewayUrl && orderData?.payment_proof_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative bg-card border border-border w-full max-w-lg rounded-sm shadow-2xl overflow-hidden flex flex-col" style={{ height: 'min(85vh, 700px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
              <span className="text-xs tracking-[0.2em] uppercase font-medium text-foreground">
                Pembayaran DOKU
              </span>
              <button
                onClick={() => setDokuModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Iframe */}
            <iframe
              src={orderData.payment_proof_url}
              className="flex-1 w-full border-0"
              title="DOKU Checkout"
            />
            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-background text-center">
              <a
                href={orderData.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Buka di tab baru ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
