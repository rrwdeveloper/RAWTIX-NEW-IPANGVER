import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { z } from "zod";
import { useState, useEffect, useCallback } from "react";
import { getOrderByNumber, syncOrderPaymentStatus, type DetailedOrderResult } from "@/utils/orders.functions";
import { formatPrice } from "@/lib/utils";
import { Check, Clock, X, RefreshCw, Copy, CheckCheck, AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { saveOrderToHistory, updateStoredOrderStatus } from "@/lib/orderStorage";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

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
  const [resumingPayment, setResumingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
                data.midtrans_status === "expire"
                  ? "Pembayaran telah kedaluwarsa di Midtrans."
                  : "Pembayaran dibatalkan atau ditolak di Midtrans."
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

  // Initial load
  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    fetchOrder(false);
  }, [orderNumber, fetchOrder]);

  // Polling otomatis setiap 8 detik jika status masih pending
  useEffect(() => {
    if (!orderNumber || !orderData || orderData.status !== "pending") return;

    const interval = setInterval(() => {
      getOrderByNumber({ data: { orderNumber } })
        .then((fresh) => {
          if (fresh && fresh.status !== orderData.status) {
            setOrderData(fresh);
            updateStoredOrderStatus(fresh.order_number, fresh.status);
            if (fresh.status === "paid") {
              toast.success("Pembayaran Anda berhasil terverifikasi!");
            } else if (fresh.status === "cancelled") {
              toast.error("Status pembayaran berubah menjadi dibatalkan/kedaluwarsa.");
            }
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [orderNumber, orderData]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Tersalin ke papan klip");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleResumePayment = () => {
    if (!orderData?.snap_token) {
      toast.error("Token pembayaran tidak ditemukan. Silakan hubungi admin atau pesan ulang.");
      return;
    }

    if (!window.snap) {
      toast.error("Modul pembayaran Midtrans sedang dimuat. Silakan coba lagi.");
      return;
    }

    setResumingPayment(true);
    window.snap.pay(orderData.snap_token, {
      onSuccess: () => {
        setResumingPayment(false);
        updateStoredOrderStatus(orderData.order_number, "paid");
        toast.success("Pembayaran berhasil!");
        fetchOrder(false);
      },
      onPending: () => {
        setResumingPayment(false);
        updateStoredOrderStatus(orderData.order_number, "pending");
        toast.info("Menunggu pembayaran diselesaikan.");
        fetchOrder(false);
      },
      onError: () => {
        setResumingPayment(false);
        updateStoredOrderStatus(orderData.order_number, "cancelled");
        toast.error("Pembayaran ditolak atau terjadi kendala.");
        fetchOrder(false);
      },
      onClose: () => {
        setResumingPayment(false);
        toast.info("Popup pembayaran ditutup.");
        fetchOrder(false);
      },
    });
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
            Menyinkronkan status pesanan dari Midtrans...
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const isPending = !orderData || orderData.status === "pending";
  const isPaid = orderData?.status === "paid";
  const isCancelled = orderData?.status === "cancelled";
  const isExpired = orderData?.midtrans_status === "expire";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-[72px] flex items-center justify-center py-16 px-4 sm:px-6">
        <div className="max-w-lg w-full space-y-8">
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
                Pesanan telah dicatat, namun <strong className="text-foreground">belum dibayar</strong>. Silakan selesaikan pembayaran agar pesanan dapat segera kami proses.
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
                  : "Pembayaran Anda ditolak atau dibatalkan oleh penyedia pembayaran. Tidak ada dana yang terpotong."}
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
                <span className="font-heading tracking-wide text-foreground font-semibold">
                  {formatPrice(orderData.total)}
                </span>
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
            {orderData?.payment_type && (
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-3">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Kanal Pembayaran</span>
                <span className="text-xs uppercase tracking-wider text-foreground font-mono">
                  {orderData.payment_type.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {/* Batas Waktu jika ada */}
            {orderData?.expiry_time && isPending && (
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Batas Waktu Bayar</span>
                <span className="text-xs text-amber-400 font-mono">{orderData.expiry_time}</span>
              </div>
            )}
          </div>

          {/* Instruksi Virtual Account / QRIS jika sedang Pending */}
          {isPending && (
            <div className="space-y-4">
              {/* Virtual Account Info */}
              {orderData?.va_numbers && orderData.va_numbers.length > 0 && (
                <div className="border border-border p-5 space-y-3 bg-secondary/20">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    Nomor Virtual Account
                  </h3>
                  {orderData.va_numbers.map((va) => (
                    <div key={va.va_number} className="space-y-2">
                      <div className="flex items-center justify-between bg-background border border-border p-3">
                        <div>
                          <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Bank {va.bank.toUpperCase()}
                          </p>
                          <p className="font-mono text-base font-bold text-foreground tracking-wider">
                            {va.va_number}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(va.va_number, `va-${va.va_number}`)}
                          className="px-3 py-1.5 text-xs uppercase tracking-wider border border-border hover:border-foreground transition-colors flex items-center gap-1.5"
                        >
                          {copiedKey === `va-${va.va_number}` ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mandiri Bill Info */}
              {orderData?.bill_key && (
                <div className="border border-border p-5 space-y-3 bg-secondary/20">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    Mandiri Bill Payment
                  </h3>
                  {orderData.biller_code && (
                    <div className="flex items-center justify-between bg-background border border-border p-3">
                      <div>
                        <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Perusahaan / Biller</p>
                        <p className="font-mono text-sm font-bold text-foreground">{orderData.biller_code}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(orderData.biller_code!, "biller")}
                        className="px-3 py-1.5 text-xs uppercase border border-border hover:border-foreground"
                      >
                        Salin
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-background border border-border p-3">
                    <div>
                      <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Nomor Tagihan / Bill Key</p>
                      <p className="font-mono text-sm font-bold text-foreground">{orderData.bill_key}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(orderData.bill_key!, "billkey")}
                      className="px-3 py-1.5 text-xs uppercase border border-border hover:border-foreground"
                    >
                      Salin
                    </button>
                  </div>
                </div>
              )}

              {/* QRIS / E-Wallet Info */}
              {orderData?.payment_type === "qris" && (
                <div className="border border-border p-4 bg-secondary/20 text-center space-y-2">
                  <p className="text-xs uppercase tracking-wider font-medium text-foreground">
                    Metode: QRIS (GoPay, BCA, ShopeePay, dll)
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Jika Anda menutup scan QR sebelumnya, klik tombol <strong>Lanjutkan Pembayaran</strong> di bawah untuk membuka kembali QRIS.
                  </p>
                </div>
              )}

              {/* Action Buttons: Bayar Sekarang & Cek Status */}
              <div className="space-y-3 pt-2">
                {orderData?.snap_token && (
                  <button
                    onClick={handleResumePayment}
                    disabled={resumingPayment}
                    className="w-full py-3.5 text-xs tracking-[0.25em] uppercase bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {resumingPayment ? "Membuka Pembayaran..." : "Bayar Sekarang (Buka Midtrans)"}
                  </button>
                )}

                <button
                  onClick={() => fetchOrder(true)}
                  disabled={checking}
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase border border-border hover:border-foreground transition-colors flex items-center justify-center gap-2 text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Memeriksa Status..." : "Cek Status Pembayaran"}
                </button>
              </div>

              {/* Notice Banner Pencegahan Kesalahpahaman */}
              <div className="border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3 items-start">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pesanan hanya akan diproses setelah pembayaran berhasil diverifikasi oleh Midtrans. Sistem melakukan sinkronisasi otomatis setiap beberapa detik.
                </p>
              </div>
            </div>
          )}

          {/* Tombol aksi jika status sudah dibatalkan atau lunas */}
          {isPaid && (
            <div className="space-y-3 text-center">
              <Link
                to="/shop"
                className="block w-full py-3.5 text-xs tracking-[0.25em] uppercase bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
              >
                Lanjut Belanja
              </Link>
            </div>
          )}

          {isCancelled && (
            <div className="space-y-3 text-center">
              <Link
                to="/shop"
                className="block w-full py-3.5 text-xs tracking-[0.25em] uppercase bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
              >
                Pesan Ulang / Belanja Lagi
              </Link>
              <button
                onClick={() => fetchOrder(true)}
                disabled={checking}
                className="w-full py-3 text-xs tracking-[0.2em] uppercase border border-border hover:border-foreground transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
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
    </div>
  );
}
