import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X, Clock, ArrowRight, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import { useStoredOrders } from "@/lib/orderStorage";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { pendingOrders } = useStoredOrders();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-[72px] px-6 md:px-10 py-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-xs tracking-[0.3em] uppercase">
            Keranjang
          </h1>
          <Link
            to="/orders"
            className="text-xs text-muted-foreground hover:text-foreground tracking-wider uppercase flex items-center gap-1.5 transition-colors"
          >
            <span>Riwayat Transaksi</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Banner Pesanan Belum Selesai (Pending) */}
        {pendingOrders.length > 0 && (
          <div className="mb-10 p-5 sm:p-6 bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3.5">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h2 className="font-heading text-xs tracking-[0.2em] uppercase text-amber-400 font-semibold">
                    Pesanan Menunggu Pembayaran ({pendingOrders.length})
                  </h2>
                  <Link
                    to="/orders"
                    className="text-[11px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    Lihat Semua Pesanan &rarr;
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Anda memiliki pesanan yang belum diselesaikan. Anda dapat langsung melanjutkan pembayaran berikut ini tanpa harus checkout ulang:
                </p>

                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.orderNumber}
                      className="p-4 bg-background/80 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[10px] tracking-widest uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 font-medium">
                            Menunggu Pembayaran
                          </span>
                        </div>
                        {order.itemsSummary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {order.itemsSummary}
                          </p>
                        )}
                        <p className="text-xs text-foreground font-medium mt-1">
                          Total: {formatPrice(order.total)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to="/order-success"
                          search={{ order: order.orderNumber }}
                          className="px-5 py-2.5 bg-amber-500 text-black text-xs tracking-wider uppercase font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <span>Bayar Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 border-t border-border/50">
            <p className="text-muted-foreground text-sm">
              Keranjang belanja Anda saat ini kosong.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <Link
                to="/shop"
                className="inline-block text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1 hover:text-muted-foreground transition-colors"
              >
                Lanjut Belanja
              </Link>
              <Link
                to="/orders"
                className="inline-block text-xs tracking-[0.2em] uppercase border-b border-muted-foreground text-muted-foreground pb-1 hover:text-foreground transition-colors"
              >
                Lacak / Riwayat Pesanan
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-4 pb-6 border-b border-border"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-card flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-heading text-xs tracking-[0.15em] uppercase">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Size: {item.size}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                          className="p-1.5 hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs min-w-[32px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                          className="p-1.5 hover:bg-secondary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs tracking-[0.2em] uppercase">
                  Subtotal
                </span>
                <span className="font-heading">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Ongkos kirim dihitung saat checkout.
              </p>
              <Link
                to="/checkout"
                className="block w-full py-3 text-xs tracking-[0.2em] uppercase text-center bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Checkout
              </Link>
              <Link
                to="/shop"
                className="block w-full py-3 mt-3 text-xs tracking-[0.2em] uppercase text-center border border-border hover:border-foreground transition-colors"
              >
                Lanjut Belanja
              </Link>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
