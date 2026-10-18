import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { formatPrice } from "@/lib/utils";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";

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

  return (
    <div className="group w-full text-left">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative mb-4 aspect-square overflow-hidden bg-card">
          {primaryImage?.url ?? fallbackImage ? (
            <img
              src={primaryImage?.url ?? fallbackImage}
              alt={primaryImage?.alt_text ?? product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground text-xs uppercase tracking-widest">
                No Image
              </span>
            </div>
          )}

          {isSoldOut && (
            <div className="absolute top-3 left-3 bg-destructive/90 text-destructive-foreground px-2 py-1 text-[10px] font-heading tracking-[0.2em] uppercase">
              Sold Out
            </div>
          )}
          {product.status === "preorder" && (
            <div className="absolute top-3 left-3 bg-foreground/90 text-background px-2 py-1 text-[10px] font-heading tracking-[0.2em] uppercase">
              Pre-Order
            </div>
          )}
        </div>

        <h3 className="font-heading text-xs uppercase tracking-[0.18em] text-foreground">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {formatPrice(product.price)}
        </p>
      </Link>

      {!isSoldOut && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onQuickView();
          }}
          className="mt-3 w-full border border-foreground/20 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground"
        >
          Pilih Opsi
        </button>
      )}
    </div>
  );
}
