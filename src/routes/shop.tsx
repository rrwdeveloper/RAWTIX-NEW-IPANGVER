import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuickViewModal } from "@/components/product/QuickViewModal";
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
    // SSR: pre-fetch all active products so the page renders with real data
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      if (!url || !key) return { products: null };
      const serverClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await serverClient
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

  // Use database products dynamically if present, fallback to READY_STOCK_CATALOGUE
  const displayProducts: ProductWithRelations[] =
    dbProducts && dbProducts.length > 0
      ? dbProducts
      : READY_STOCK_CATALOGUE.map((c) => ({
          id: c.productId,
          name: c.name,
          slug: c.slug,
          price: c.price,
          description: c.description,
          status: "active" as const,
          sort_order: 1,
          category_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          featured: false,
          preorder_estimated_date: null,
          product_images: [
            {
              id: `img-${c.slug}`,
              product_id: c.productId,
              url: c.image,
              alt_text: c.name,
              is_primary: true,
              sort_order: 0,
              created_at: new Date().toISOString(),
            },
          ],
          product_variants: [
            { id: `${c.slug}-s`, product_id: c.productId, size: "S", stock: 8, sku: null, created_at: new Date().toISOString() },
            { id: `${c.slug}-m`, product_id: c.productId, size: "M", stock: 8, sku: null, created_at: new Date().toISOString() },
            { id: `${c.slug}-l`, product_id: c.productId, size: "L", stock: 6, sku: null, created_at: new Date().toISOString() },
            { id: `${c.slug}-xl`, product_id: c.productId, size: "XL", stock: 5, sku: null, created_at: new Date().toISOString() },
            { id: `${c.slug}-xxl`, product_id: c.productId, size: "XXL", stock: 3, sku: null, created_at: new Date().toISOString() },
          ],
        }));

  // Separate into available ready products and sold out products
  const availableProducts = displayProducts.filter((p) => p.status !== "sold_out");
  const soldOutProducts = displayProducts.filter((p) => p.status === "sold_out");

  const renderProductCard = (product: ProductWithRelations, index: number) => {
    const primaryImage =
      product.product_images?.find((img) => img.is_primary) ??
      product.product_images?.[0];
    const fallbackImage = READY_STOCK_CATALOGUE.find((c) => c.slug === product.slug)?.image;
    const imageUrl = primaryImage?.url ?? fallbackImage ?? "";

    const isSoldOut = product.status === "sold_out";
    const isPreorder = product.status === "preorder";
    const series = product.name.split(" ")[0] || "Signature";

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

          {/* Series Badge */}
          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white/90 px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase border border-white/10">
            {series}
          </div>

          {isSoldOut && (
            <div className="absolute top-3 right-3 bg-destructive/90 text-destructive-foreground px-2 py-1 text-[10px] font-heading tracking-[0.2em] uppercase">
              Sold Out
            </div>
          )}
          {isPreorder && (
            <div className="absolute top-3 right-3 bg-foreground/90 text-background px-2 py-1 text-[10px] font-heading tracking-[0.2em] uppercase">
              Pre-Order
            </div>
          )}
        </Link>

        {/* Product Details Bar */}
        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 border-t border-border bg-card/60">
          <div>
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="block font-heading text-xs sm:text-sm uppercase tracking-[0.14em] text-foreground hover:text-muted-foreground transition-colors"
            >
              {product.name}
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
            {isSoldOut ? (
              <span className="flex-1 py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium border border-border text-muted-foreground bg-muted/20 text-center cursor-not-allowed">
                Sold Out
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="flex-1 py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-center"
              >
                Pilih Opsi
              </button>
            )}
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground transition-colors"
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
            Ready Stock
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-foreground/90">
            KOLEKSI RAWTIX YANG SIAP DIKIRIM HARI INI
          </p>
        </div>

        {isLoading && displayProducts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="space-y-24">
            {/* 1. SEKSI PRODUK TERSEDIA (READY) */}
            {availableProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                {availableProducts.map((product, index) => renderProductCard(product, index))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Saat ini semua produk ready stock sedang dalam proses restock.
              </p>
            )}

            {/* 2. SEKSI PRODUK HABIS (SOLD OUT / ARCHIVE) */}
            {soldOutProducts.length > 0 && (
              <div className="pt-16 border-t border-border">
                <div className="text-center mb-12 sm:mb-16">
                  <span className="text-[10px] tracking-[0.3em] uppercase bg-muted/40 text-muted-foreground px-3 py-1 font-medium border border-border">
                    Archive Collection
                  </span>
                  <h2 className="mt-4 font-heading text-xl sm:text-2xl uppercase tracking-[0.16em] text-foreground">
                    Sold Out Pieces
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                  {soldOutProducts.map((product, index) => renderProductCard(product, index))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-muted-foreground">
            Belum ada produk ready stock.
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
