import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories: { slug: string } | null;
};

export const Route = createFileRoute("/pre-order")({
  component: PreOrderPage,
});

function PreOrderPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "preorder"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*), categories!inner(slug)")
        .eq("status", "preorder")
        .eq("categories.slug", "signature-pieces")
        .order("sort_order");
      if (error) throw error;
      return data as ProductWithRelations[];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-6 pb-16 pt-28 md:px-10">
        <div className="border-b border-border pb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Pre-order
          </p>
          <h1 className="mt-4 font-heading text-4xl uppercase tracking-[-0.035em] sm:text-6xl">
            Koleksi pre-order
          </h1>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse bg-secondary" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[45vh] items-center justify-center px-6 text-center">
            <div className="max-w-md">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Koleksi pre-order belum tersedia saat ini. Silakan kembali lagi
                nanti untuk melihat pembaruan terbaru.
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center bg-foreground px-6 py-3 text-xs tracking-[0.2em] uppercase text-background transition-colors hover:bg-foreground/90"
              >
                Kembali
              </Link>
            </div>
          </div>
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
