import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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

export const Route = createFileRoute("/shop")({
  component: ShopPage,
});

function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "ready-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*), categories!inner(slug)")
        .eq("status", "active")
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
        <div className="flex flex-col gap-4 border-b border-border pb-10 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Shop / Ready stock
            </p>
            <h1 className="font-heading text-4xl uppercase tracking-[-0.035em] sm:text-6xl">
              Ready stock
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Seluruh signature pieces RAWTIX yang tersedia untuk dipilih sekarang.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
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
