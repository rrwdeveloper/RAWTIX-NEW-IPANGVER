import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Sun, Moon, Receipt, Menu, X, Search, Sparkles, MessageCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useTheme } from "@/hooks/useTheme";
import { useStoredOrders } from "@/lib/orderStorage";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { formatPrice } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { hasPending } = useStoredOrders();
  const navigate = useNavigate();

  // Close menus on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Filter catalogue for search
  const filteredCatalogue = searchQuery.trim() === ""
    ? []
    : READY_STOCK_CATALOGUE.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.series.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.detail.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/10 transition-colors">
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 md:px-12">
          
          {/* Left: Hamburger + Script Logo + IDR */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              type="button"
              aria-label="Buka menu navigasi"
              className="p-1 -ml-1 text-foreground hover:text-muted-foreground transition-colors focus-visible:outline-none"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* Script Logo like Saint P */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-script text-2xl sm:text-3xl text-foreground font-normal tracking-wide group-hover:opacity-80 transition-opacity">
                Rawtix
              </span>
            </Link>

            {/* Currency IDR Flag */}
            <div className="hidden xs:flex sm:flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/80 bg-secondary/50 text-[11px] font-medium tracking-wider text-muted-foreground">
              <span className="inline-block w-3.5 h-2.5 rounded-2xs overflow-hidden shadow-xs">
                <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
                  <path fill="#e11d48" d="M0 0h640v240H0z"/>
                  <path fill="#ffffff" d="M0 240h640v240H0z"/>
                </svg>
              </span>
              <span>IDR</span>
            </div>
          </div>

          {/* Center Brand Name (Desktop) */}
          <Link
            to="/"
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center tracking-[0.35em] text-xs uppercase font-medium text-foreground hover:text-muted-foreground transition-colors"
          >
            MODERN HERITAGE
          </Link>

          {/* Right: Search + Orders + Cart + Theme */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              type="button"
              aria-label="Cari produk"
              className="p-1.5 text-foreground hover:text-muted-foreground transition-colors"
              title="Cari produk..."
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={1.75} />
            </button>

            {/* Orders / Account */}
            <Link
              to="/orders"
              className="relative p-1.5 text-foreground hover:text-muted-foreground transition-colors"
              title={hasPending ? "Ada pesanan menunggu pembayaran" : "Lacak Pesanan"}
              aria-label="Riwayat & Lacak Pesanan"
            >
              <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={1.75} />
              {hasPending && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                </>
              )}
            </Link>

            {/* Shopping Bag with Badge */}
            <Link
              to="/cart"
              className="relative p-1.5 text-foreground hover:text-muted-foreground transition-colors"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-4.5 h-4.5 sm:w-5 sm:h-5" strokeWidth={1.75} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-foreground text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-foreground hover:text-muted-foreground transition-colors"
              aria-label="Ganti mode tampilan"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative z-50 w-full max-w-sm bg-card border-r border-border h-full flex flex-col justify-between p-6 sm:p-8 animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <span className="font-script text-3xl text-foreground">Rawtix</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1 text-foreground hover:text-muted-foreground transition-colors"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              <nav className="mt-8 space-y-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                    Koleksi &amp; Belanja
                  </p>
                  <ul className="space-y-3 font-heading text-sm uppercase tracking-[0.18em]">
                    <li>
                      <a
                        href="/#signature-pieces"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Signature Pieces
                      </a>
                    </li>
                    <li>
                      <a
                        href="/#daily-staples"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Daily Staples
                      </a>
                    </li>
                    <li>
                      <Link
                        to="/shop"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Ready Stock (All)
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/pre-order"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Pre-Order Catalog
                      </Link>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                    Atelier &amp; Layanan
                  </p>
                  <ul className="space-y-3 font-heading text-sm uppercase tracking-[0.18em]">
                    <li>
                      <a
                        href="/#bespoke"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Made to Measure / Bespoke
                      </a>
                    </li>
                    <li>
                      <Link
                        to="/company"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Profil Brand RAWTIX
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="block text-foreground hover:text-muted-foreground transition-colors"
                      >
                        Lacak Pesanan
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>

            {/* Direct Consultation WhatsApp CTA */}
            <div className="pt-6 border-t border-border space-y-3">
              <a
                href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20Bespoke%20/%20Katalog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background text-xs font-semibold uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Consultation
              </a>
              <p className="text-[11px] text-center text-muted-foreground">
                © 2026 RAWTIX. Modern Heritage &amp; Fine Bespoke Batik.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative z-50 w-full max-w-xl bg-card border border-border p-5 rounded-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Cari koleksi (Javas, Phoenix, Dragon, Sutra, Swarna)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Tutup pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {searchQuery.trim() !== "" && (
              <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-border">
                {filteredCatalogue.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground tracking-wider uppercase">
                    Tidak ada produk ditemukan untuk "{searchQuery}"
                  </p>
                ) : (
                  filteredCatalogue.map((item) => (
                    <div
                      key={item.slug}
                      onClick={() => {
                        setSearchOpen(false);
                        navigate({ to: "/product/$slug", params: { slug: item.slug } });
                      }}
                      className="flex items-center gap-4 py-3 hover:bg-secondary/40 px-2 cursor-pointer transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-14 object-cover rounded-2xs bg-secondary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-xs uppercase tracking-wider text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.series} · {item.detail}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-foreground shrink-0">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {searchQuery.trim() === "" && (
              <div className="mt-4 pt-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Rekomendasi Populer
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Javas Fireman Clasp", "Phoenix Fireman Clasp", "Dragon Fireman Clasp", "White Phoenix", "Sutra ATBM"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearchQuery(tag)}
                      className="px-2.5 py-1 text-[11px] rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
