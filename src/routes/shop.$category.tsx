import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export const Route = createFileRoute("/shop/$category")({
  loader: async ({ params }) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      if (!url || !key) return { categoryData: null, products: null };
      const serverClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: cat } = await serverClient
        .from("categories")
        .select("*")
        .eq("slug", params.category)
        .maybeSingle();

      const isSig = params.category === "signature-pieces" || params.category === "signature";

      let prodQuery = serverClient
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .neq("status", "draft")
        .order("sort_order");

      if (cat) {
        prodQuery = prodQuery.eq("category_id", cat.id);
      } else if (!isSig) {
        return { categoryData: null, products: [] };
      }

      const { data: prods } = await prodQuery;
      return {
        categoryData: cat,
        products: (prods as ProductWithRelations[]) || [],
      };
    } catch {
      return { categoryData: null, products: null };
    }
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);

  const isSignatureCategory = category === "signature-pieces" || category === "signature";

  const { data: categoryData } = useQuery({
    queryKey: ["category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", category)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    initialData: loaderData?.categoryData ?? undefined,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "category", category],
    queryFn: async () => {
      if (!categoryData) {
        // If this is signature-pieces and categoryData is not found, fetch all non-draft products
        if (isSignatureCategory) {
          const { data, error } = await supabase
            .from("products")
            .select("*, product_images(*), product_variants(*)")
            .neq("status", "draft")
            .order("sort_order");
          if (error) return [];
          return data as ProductWithRelations[];
        }
        return [];
      }
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .eq("category_id", categoryData.id)
        .neq("status", "draft")
        .order("sort_order");
      if (error) throw error;
      return data as ProductWithRelations[];
    },
    initialData: loaderData?.products ?? undefined,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // If DB products empty for signature pieces, synthesize catalogue fallback
  const displayProducts: ProductWithRelations[] =
    products && products.length > 0
      ? products
      : isSignatureCategory
      ? READY_STOCK_CATALOGUE.map((c) => ({
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
        }))
      : [];

  const titleName = categoryData?.name ?? (isSignatureCategory ? "Signature Pieces" : category);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-28 sm:pt-36 pb-24 px-4 sm:px-8 md:px-14 max-w-7xl mx-auto w-full">
        {/* Section Header with Spencerian Cursive Title to match Home */}
        <div className="text-center mb-14 sm:mb-20">
          <h1 className="font-script text-5xl sm:text-7xl md:text-8xl text-foreground font-normal tracking-wide">
            {titleName}
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-foreground/90">
            {isSignatureCategory ? "BROWSE OUR BEST SELLING PRODUCTS" : `KOLEKSI ${titleName.toUpperCase()}`}
          </p>
        </div>

        {isLoading && displayProducts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          /* 3-Column Product Grid to perfectly match Home Signature Pieces */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {displayProducts.map((product, index) => {
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
                    index === 0
                      ? "border-foreground/35 shadow-lg"
                      : "border-border hover:border-foreground/40 hover:shadow-md"
                  }`}
                >
                  {/* Product Image Frame */}
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    className="relative aspect-[4/5] overflow-hidden bg-neutral-900/40 block"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={primaryImage?.alt_text ?? product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
                        No Image
                      </div>
                    )}

                    {/* Subtle Badge */}
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
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-20 text-center">
            Belum ada produk di kategori ini.
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
