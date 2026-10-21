import { useState } from "react";
import { Instagram, ArrowRight, ShieldCheck, Truck, RefreshCw, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim() });
      if (error) {
        if (error.code === "23505") {
          toast.info("Email sudah terdaftar");
        } else {
          throw error;
        }
      } else {
        toast.success("Berhasil berlangganan!");
        setEmail("");
      }
    } catch {
      toast.error("Gagal, coba lagi nanti");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-border mt-20 bg-background">
      {/* Payment Methods Section (matching Saint P screenshot 5) */}
      <div className="px-6 md:px-12 py-10 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground/80 mb-6">
          Metode Pembayaran
        </p>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {[
            { name: "BCA", desc: "Bank Central Asia" },
            { name: "Mandiri", desc: "Bank Mandiri" },
            { name: "BNI", desc: "Bank Negara Indonesia" },
            { name: "BRI", desc: "Bank Rakyat Indonesia" },
            { name: "QRIS", desc: "Quick Response Code Indonesia Standard", highlight: true },
            { name: "GoPay", desc: "GoPay Wallet" },
            { name: "OVO", desc: "OVO Payment" },
            { name: "ShopeePay", desc: "ShopeePay" },
            { name: "Visa", desc: "Visa International" },
            { name: "Mastercard", desc: "Mastercard" },
          ].map((item) => (
            <div
              key={item.name}
              title={item.desc}
              className={`flex items-center justify-center px-3.5 py-2 rounded-xs border text-xs font-semibold tracking-wider uppercase transition-colors ${
                item.highlight
                  ? "border-foreground/40 bg-secondary text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 space-y-12">
        {/* Top: Newsletter + Brand Bio + Contact */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand Essence — Left */}
          <div className="md:col-span-5 space-y-4">
            <span className="font-script text-3xl sm:text-4xl text-foreground font-normal">
              Rawtix
            </span>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-medium">
              Modern Heritage &amp; Fine Bespoke Batik
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground/90 max-w-sm">
              Rumah mode busana batik independen berestetika oriental contemporary.
              Memadukan seni motif Nusantara dan aksentuasi modern fireman clasp.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-foreground" /> Kirim Seluruh Indonesia
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-foreground" /> Garansi Kualitas
              </span>
            </div>
          </div>

          {/* Newsletter — Center */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="font-heading text-xs tracking-[0.28em] uppercase text-foreground">
              Newsletter
            </h3>
            <p className="text-xs text-muted-foreground">
              Dapatkan informasi perilisan edisi terbatas dan akses koleksi terbaru.
            </p>
            <form
              onSubmit={handleSubscribe}
              className="flex border-b border-foreground/30 focus-within:border-foreground transition-colors"
            >
              <input
                type="email"
                placeholder="Alamat email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm py-2 outline-none placeholder:text-muted-foreground/60"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="p-2 text-foreground hover:text-muted-foreground transition-colors disabled:opacity-50"
                aria-label="Berlangganan"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Contact & Consultation — Right */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="font-heading text-xs tracking-[0.28em] uppercase text-foreground">
              Konsultasi &amp; Kontak
            </h3>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <a
                href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20Bespoke%20/%20Katalog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span>+62 857-1963-6329 (WhatsApp)</span>
              </a>
              <a
                href="https://www.instagram.com/rawtix.id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-foreground transition-colors"
              >
                <Instagram className="w-4 h-4 text-foreground" />
                <span>@rawtix.id</span>
              </a>
              <a
                href="mailto:rawtix.official@gmail.com"
                className="flex items-center gap-2.5 hover:text-foreground transition-colors"
              >
                <span className="w-4 text-center font-serif text-sm">@</span>
                <span>rawtix.official@gmail.com</span>
              </a>
              <p className="pt-1 text-[11px] text-muted-foreground/70">
                Jakarta, Indonesia
              </p>
            </div>
          </div>
        </div>

        {/* Policy Links & Orders */}
        <div className="pt-8 border-t border-border flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground tracking-wider uppercase">
          <Link
            to="/orders"
            className="hover:text-foreground text-foreground transition-colors font-semibold"
          >
            Lacak &amp; Riwayat Pesanan
          </Link>
          <Link
            to="/shop"
            className="hover:text-foreground transition-colors"
          >
            Semua Produk
          </Link>
          <Link
            to="/company"
            className="hover:text-foreground transition-colors"
          >
            Tentang Kami
          </Link>
          <Link
            to="/refund-policy"
            className="hover:text-foreground transition-colors"
          >
            Refund Policy
          </Link>
          <Link
            to="/privacy-policy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            to="/shipping-policy"
            className="hover:text-foreground transition-colors"
          >
            Shipping Policy
          </Link>
          <Link
            to="/contact"
            className="hover:text-foreground transition-colors"
          >
            Kontak
          </Link>
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70">
          <p>© 2026 rawtix.id. All rights reserved.</p>
          <p className="tracking-widest uppercase text-[10px]">
            Designed in Jakarta, Worn Beyond Borders
          </p>
        </div>
      </div>
    </footer>
  );
}
