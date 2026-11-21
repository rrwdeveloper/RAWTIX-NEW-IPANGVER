import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { ProductStatusBadge } from "@/components/product/ProductStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories?: { slug: string } | null;
};

export const Route = createFileRoute("/shop")({
  loader: async () => {
    // SSR & Client: pre-fetch all active products so the page renders with real data
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*), categories(id, name, slug)")
        .neq("status", "draft")
        .order("sort_order");
      if (error) return { products: null };
      return { products: data as ProductWithRelations[] };
    } catch {
      return { products: null };
    }
  },
  component: ShopPage,
});

function ShopPage() {
  const loaderData = Route.useLoaderData();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["products", "ready-stock"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_images(*), product_variants(*), categories(id, name, slug)")
          .neq("status", "draft")
          .order("sort_order");
        if (error) return null;
        return data as ProductWithRelations[];
      } catch {
        return null;
      }
    },
    // Seed from SSR loader so first paint is instant
    initialData: loaderData?.products ?? undefined,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const displayProducts: ProductWithRelations[] = dbProducts ?? [];

  const readyStockProducts = displayProducts.filter((p) => p.status === "active");
  const comingSoonProducts = displayProducts.filter((p) => p.status === "coming_soon" || p.status === "draft");
  const preOrderProducts = displayProducts.filter((p) => p.status === "preorder");
  const soldOutProducts = displayProducts.filter((p) => p.status === "sold_out");

  const renderProductCard = (product: ProductWithRelations, index: number) => {
    const primaryImage =
      product.product_images?.find((img) => img.is_primary) ??
      product.product_images?.[0];
    const fallbackImage = READY_STOCK_CATALOGUE.find((c) => c.slug === product.slug)?.image;
    const imageUrl = primaryImage?.url ?? fallbackImage ?? "";

    const isSoldOut = product.status === "sold_out";
    const isComingSoon = product.status === "coming_soon" || product.status === "draft";
    const isPreorder = product.status === "preorder";

    return (
      <div
        key={product.id}
        className={`group relative flex flex-col bg-card/40 border transition-all duration-300 ${
          index === 0 && !isSoldOut
            ? "border-foreground/35 shadow-lg"
            : "border-border hover:border-foreground/40 hover:shadow-md"
        } ${isSoldOut ? "opacity-75 hover:opacity-100" : ""}`}
      >
        {/* Product Image Frame (aspect-[4/5] uncropped) */}
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="relative aspect-[4/5] overflow-hidden bg-neutral-900/40 block"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={primaryImage?.alt_text ?? product.name}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
                isSoldOut ? "grayscale-[35%]" : ""
              }`}
              loading={index < 3 ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
              No Image
            </div>
          )}

          <ProductStatusBadge status={product.status} />
        </Link>

        {/* Product Details Bar */}
        <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 border-t border-border bg-card/60">
          <div>
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="block font-heading text-xs sm:text-sm uppercase tracking-[0.14em] text-foreground hover:text-muted-foreground transition-colors line-clamp-1"
            >
              {product.name}
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-border/60 flex items-center gap-1.5 sm:gap-2">
            {isSoldOut ? (
              <span className="flex-1 py-1.5 sm:py-2 text-[9px] sm:text-xs uppercase tracking-[0.16em] font-medium border border-border text-muted-foreground bg-muted/20 text-center cursor-not-allowed">
                Sold Out
              </span>
            ) : isComingSoon ? (
              <span className="flex-1 py-1.5 sm:py-2 text-[9px] sm:text-xs uppercase tracking-[0.16em] font-medium border border-sky-400/20 text-sky-400/80 bg-muted/20 text-center cursor-not-allowed">
                Coming Soon
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="flex-1 py-1.5 sm:py-2 text-[9px] sm:text-xs uppercase tracking-[0.16em] font-medium border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-center"
              >
                {isPreorder ? "Pre-Order" : "Pilih Opsi"}
              </button>
            )}
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="p-1.5 sm:p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Lihat Detail"
              aria-label={`Detail ${product.name}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-4 sm:px-8 md:px-14 pb-24 pt-28 sm:pt-36 max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-20">
          <h1 className="font-script text-5xl sm:text-7xl md:text-8xl text-foreground font-normal tracking-wide">
            Catalogue
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-foreground/90">
            KOLEKSI RAWTIX LENGKAP
          </p>
        </div>

        {isLoading && displayProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="space-y-14 sm:space-y-20">
            {readyStockProducts.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span className="text-[10px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-foreground">Ready Stock</span>
                  <div className="flex-1 h-px bg-border/70" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
                  {readyStockProducts.map((product, index) => renderProductCard(product, index))}
                </div>
              </section>
            )}

            {comingSoonProducts.length > 0 && (
              <section className={readyStockProducts.length > 0 ? "pt-12 sm:pt-16 border-t border-border" : ""}>
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span className="text-[10px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-sky-400">Coming Soon</span>
                  <div className="flex-1 h-px bg-border/70" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
                  {comingSoonProducts.map((product, index) => renderProductCard(product, index))}
                </div>
              </section>
            )}

            {preOrderProducts.length > 0 && (
              <section className={(readyStockProducts.length > 0 || comingSoonProducts.length > 0) ? "pt-12 sm:pt-16 border-t border-border" : ""}>
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span className="text-[10px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-amber-400">Pre-Order</span>
                  <div className="flex-1 h-px bg-border/70" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
                  {preOrderProducts.map((product, index) => renderProductCard(product, index))}
                </div>
              </section>
            )}

            {soldOutProducts.length > 0 && (
              <section className={(readyStockProducts.length > 0 || comingSoonProducts.length > 0 || preOrderProducts.length > 0) ? "pt-12 sm:pt-16 border-t border-border" : ""}>
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span className="text-[10px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-muted-foreground">Sold Out</span>
                  <div className="flex-1 h-px bg-border/70" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
                  {soldOutProducts.map((product, index) => renderProductCard(product, index))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-muted-foreground">
            Belum ada produk dalam katalog.
          </p>
        )}
      </main>
      <Footer />
      {selectedProduct && (
        <QuickViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
