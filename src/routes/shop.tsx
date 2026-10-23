import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories?: { slug: string } | null;
};

// Fallback items converted into ProductWithRelations shape
const CATALOGUE_FALLBACK_PRODUCTS: ProductWithRelations[] = READY_STOCK_CATALOGUE.map((item, idx) => ({
  id: item.productId,
  name: item.name,
  slug: item.slug,
  price: item.price,
  description: item.description,
  status: "active",
  sort_order: idx + 1,
  category_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  preorder_estimated_date: null,
  product_images: [
    {
      id: `img-${item.slug}`,
      product_id: item.productId,
      url: item.image,
      alt_text: item.name,
      is_primary: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
    },
  ],
  product_variants: [
    { id: `${item.slug}-s`, product_id: item.productId, size: "S", stock: 8, created_at: new Date().toISOString() },
    { id: `${item.slug}-m`, product_id: item.productId, size: "M", stock: 8, created_at: new Date().toISOString() },
    { id: `${item.slug}-l`, product_id: item.productId, size: "L", stock: 6, created_at: new Date().toISOString() },
    { id: `${item.slug}-xl`, product_id: item.productId, size: "XL", stock: 5, created_at: new Date().toISOString() },
    { id: `${item.slug}-xxl`, product_id: item.productId, size: "XXL", stock: 3, created_at: new Date().toISOString() },
  ],
}));

export const Route = createFileRoute("/shop")({
  component: ShopPage,
});

function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["products", "ready-stock"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_images(*), product_variants(*)")
          .eq("status", "active")
          .order("sort_order");
        if (error) return null;
        return data as ProductWithRelations[];
      } catch {
        return null;
      }
    },
  });

  // Use database products if available and non-empty, otherwise use full ready stock catalogue
  const displayProducts = (dbProducts && dbProducts.length > 0)
    ? dbProducts
    : CATALOGUE_FALLBACK_PRODUCTS;

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

        {isLoading && (!displayProducts || displayProducts.length === 0) ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse bg-secondary" />
            ))}
          </div>
        ) : displayProducts && displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4 md:gap-6">
            {displayProducts.map((product) => (
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
