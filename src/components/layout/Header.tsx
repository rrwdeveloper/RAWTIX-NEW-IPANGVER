import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Sun, Moon, Receipt } from "lucide-react";
import { CategoryDropdown } from "./CategoryDropdown";
import { useCart } from "@/hooks/useCart";
import { useTheme } from "@/hooks/useTheme";
import { useStoredOrders } from "@/lib/orderStorage";

export function Header() {
  const [shopOpen, setShopOpen] = useState(false);
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { hasPending } = useStoredOrders();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 md:px-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShopOpen(!shopOpen)}
              type="button"
              aria-expanded={shopOpen}
              aria-controls="catalogue-menu"
              className="font-heading text-xs tracking-[0.3em] uppercase text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Catalogue
            </button>
            <Link
              to="/company"
              className="hidden text-xs uppercase tracking-[0.3em] text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline"
            >
              PROFIL
            </Link>
            <button
              onClick={toggleTheme}
              className="text-foreground hover:text-muted-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="font-heading text-base sm:text-lg tracking-[0.35em] uppercase font-bold text-foreground">
              RAWTIX
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/orders"
              className="relative text-foreground hover:text-muted-foreground transition-colors p-1"
              title={hasPending ? "Ada pesanan menunggu pembayaran" : "Riwayat & Lacak Pesanan"}
              aria-label="Riwayat & Lacak Pesanan"
            >
              <Receipt className="w-5 h-5" strokeWidth={1.5} />
              {hasPending && (
                <>
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                </>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative text-foreground hover:text-muted-foreground transition-colors p-1"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[10px] font-medium flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <CategoryDropdown
        id="catalogue-menu"
        open={shopOpen}
        onClose={() => setShopOpen(false)}
      />
    </>
  );
}
