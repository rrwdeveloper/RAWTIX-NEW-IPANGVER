import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { formatPrice } from "@/lib/utils";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { ProductStatusBadge } from "./ProductStatusBadge";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

interface ProductCardProps {
  product: Product & { product_images: ProductImage[] };
  onQuickView: () => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const primaryImage = product.product_images?.find((img) => img.is_primary)
    ?? product.product_images?.[0];
  const fallbackImage = READY_STOCK_CATALOGUE.find(
    (item) => item.slug === product.slug
  )?.image;

  const isSoldOut = product.status === "sold_out";
  const isComingSoon = product.status === "coming_soon";
  const isPreorder = product.status === "preorder";

  return (
    <div className="group w-full text-left">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative mb-3 sm:mb-4 aspect-square overflow-hidden bg-card">
          {primaryImage?.url ?? fallbackImage ? (
            <img
              src={primaryImage?.url ?? fallbackImage}
              alt={primaryImage?.alt_text ?? product.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                isSoldOut ? "grayscale-[35%]" : ""
              }`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground text-xs uppercase tracking-widest">
                No Image
              </span>
            </div>
          )}

          <ProductStatusBadge status={product.status} />
        </div>

        <h3 className="font-heading text-xs uppercase tracking-[0.18em] text-foreground">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {formatPrice(product.price)}
        </p>
      </Link>

      {isSoldOut ? (
        <button
          type="button"
          disabled
          className="mt-2.5 sm:mt-3 w-full border border-border py-1.5 sm:py-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted/20 cursor-not-allowed"
        >
          Sold Out
        </button>
      ) : isComingSoon ? (
        <button
          type="button"
          disabled
          className="mt-2.5 sm:mt-3 w-full border border-sky-400/20 py-1.5 sm:py-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-sky-400/80 bg-muted/20 cursor-not-allowed"
        >
          Coming Soon
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onQuickView();
          }}
          className="mt-2.5 sm:mt-3 w-full border border-foreground/20 py-1.5 sm:py-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground"
        >
          {isPreorder ? "Pre-Order" : "Pilih Opsi"}
        </button>
      )}
    </div>
  );
}
