import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { ProductStatusBadge } from "@/components/product/ProductStatusBadge";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .eq("slug", params.slug)
        .maybeSingle();
      if (error) return { product: null };
      return { product: data as ProductWithRelations | null };
    } catch {
      return { product: null };
    }
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { addItem } = useCart();
  const router = useRouter();

  const { data: dbProduct, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_images(*), product_variants(*)")
          .eq("slug", slug)
          .maybeSingle();
        if (error) return null;
        return data as ProductWithRelations | null;
      } catch {
        return null;
      }
    },
    initialData: loaderData?.product ?? undefined,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const catalogueItem = READY_STOCK_CATALOGUE.find((item) => item.slug === slug);

  // Use live product or synthesized catalogue product fallback
  const product: ProductWithRelations | null = dbProduct || (catalogueItem ? {
    id: catalogueItem.productId,
    name: catalogueItem.name,
    slug: catalogueItem.slug,
    price: catalogueItem.price,
    description: catalogueItem.description,
    status: "active",
    sort_order: 1,
    featured: false,
    category_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    preorder_estimated_date: null,
    product_images: [
      {
        id: `img-${catalogueItem.slug}`,
        product_id: catalogueItem.productId,
        url: catalogueItem.image,
        alt_text: catalogueItem.name,
        is_primary: true,
        sort_order: 0,
      },
    ],
    product_variants: [
      { id: `${catalogueItem.slug}-s`, product_id: catalogueItem.productId, size: "S", stock: 8, sku: null },
      { id: `${catalogueItem.slug}-m`, product_id: catalogueItem.productId, size: "M", stock: 8, sku: null },
      { id: `${catalogueItem.slug}-l`, product_id: catalogueItem.productId, size: "L", stock: 6, sku: null },
      { id: `${catalogueItem.slug}-xl`, product_id: catalogueItem.productId, size: "XL", stock: 5, sku: null },
      { id: `${catalogueItem.slug}-xxl`, product_id: catalogueItem.productId, size: "XXL", stock: 3, sku: null },
    ],
  } : null);

  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-[72px] px-4 sm:px-6 md:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="aspect-square bg-secondary animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 bg-secondary animate-pulse w-1/2" />
              <div className="h-4 bg-secondary animate-pulse w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-[72px] flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-muted-foreground">Produk tidak ditemukan.</p>
            <Link
              to="/shop"
              className="mt-4 inline-block text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1"
            >
              Kembali ke Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Sort images: primary first, then by sort_order
  const sortedImages = [...(product.product_images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const activeImage = sortedImages[activeImageIndex] ?? sortedImages[0];
  const activeImageUrl = activeImage?.url ?? catalogueItem?.image;
  const variants = product.product_variants ?? [];
  const selectedVariant = variants.find((v) => v.size === selectedSize);
  const isSoldOut = product.status === "sold_out";
  const isComingSoon = product.status === "coming_soon";
  const isPreorder = product.status === "preorder";

  const handleAddToCart = () => {
    if (!selectedSize || !selectedVariant) {
      toast.error("Pilih ukuran terlebih dahulu");
      return;
    }
    if (!isSoldOut && !isPreorder && selectedVariant.stock <= 0) {
      toast.error("Stok habis untuk ukuran ini");
      return;
    }
    if (!isSoldOut && !isPreorder && quantity > selectedVariant.stock) {
      toast.error(`Jumlah melebihi stok yang tersedia (${selectedVariant.stock})`);
      return;
    }
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      size: selectedSize,
      price: product.price,
      quantity,
      image: activeImageUrl ?? "",
    });
    toast.success("Ditambahkan ke keranjang");
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/#signature-pieces" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-10 flex flex-col justify-center">
        <div className="w-full max-w-5xl mx-auto">
          {/* Top navigation bar with single Close (X) button */}
          <div className="flex items-center justify-end pb-4 mb-2 border-b border-border/40">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup dan kembali"
              className="p-2 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-card transition-all"
              title="Tutup (Kembali)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-6">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden flex items-center justify-center">
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={activeImage?.alt_text ?? product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
                  No Image
                </div>
              )}
              <ProductStatusBadge status={product.status} />
            </div>
            {sortedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sortedImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 border overflow-hidden transition-colors ${
                      idx === activeImageIndex ? "border-foreground" : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              rawtix.id
            </p>
            <h1 className="font-heading text-lg sm:text-xl tracking-[0.2em] uppercase mt-2">
              {product.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              {formatPrice(product.price)}
            </p>

            {isPreorder && product.preorder_estimated_date && (
              <p className="text-xs text-muted-foreground mt-3 border border-border px-3 py-2 inline-block w-fit">
                Pre-Order — Estimasi kirim{" "}
                {new Date(product.preorder_estimated_date).toLocaleDateString(
                  "id-ID",
                  { month: "long", year: "numeric" }
                )}
              </p>
            )}

            {/* Size */}
            <div className="mt-8">
              <p className="text-xs tracking-[0.2em] uppercase mb-3">Ukuran</p>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {["S", "M", "L", "XL", "XXL"].map((s) => (
                    <div key={s} className="px-4 py-2 text-xs tracking-wider uppercase border border-border text-muted-foreground/30 animate-pulse cursor-not-allowed select-none">
                      {s}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const outOfStock = (v.stock <= 0 && !isPreorder) || isSoldOut || isComingSoon;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !outOfStock && setSelectedSize(v.size)}
                        disabled={outOfStock}
                        className={`px-4 py-2 text-xs tracking-wider uppercase border transition-colors ${
                          selectedSize === v.size
                            ? "bg-foreground text-background border-foreground"
                            : outOfStock
                              ? "border-border text-muted-foreground/40 cursor-not-allowed line-through"
                              : "border-border text-foreground hover:border-foreground"
                        }`}
                      >
                        {v.size}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quantity — only shown after DB resolves and product is not sold out or coming soon */}
            {!isLoading && !isSoldOut && !isComingSoon && (
              <div className="mt-6">
                <p className="text-xs tracking-[0.2em] uppercase mb-3">Jumlah</p>
                <div className="flex items-center border border-border w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-4 text-sm min-w-[40px] text-center">{quantity}</span>
                  <button
                    onClick={() => {
                      const maxStock = selectedVariant && !isPreorder ? selectedVariant.stock : 99;
                      if (quantity < maxStock) {
                        setQuantity(quantity + 1);
                      } else {
                        toast.info(`Batas stok tersedia untuk ukuran ini: ${maxStock}`);
                      }
                    }}
                    disabled={selectedVariant && !isPreorder ? quantity >= selectedVariant.stock : false}
                    className="p-2 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions — always wait for DB before showing real button */}
            <div className="mt-8 space-y-3">
              {isLoading ? (
                <div className="w-full py-3 bg-muted animate-pulse" />
              ) : isSoldOut ? (
                <button
                  disabled
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Sold Out
                </button>
              ) : isComingSoon ? (
                <button
                  disabled
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-muted text-sky-400/80 cursor-not-allowed border border-sky-400/20"
                >
                  Coming Soon
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  {isPreorder ? "Pre-Order" : "Add to Cart"}
                </button>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-10 pt-8 border-t border-border">
                <p className="text-xs tracking-[0.2em] uppercase mb-4">Deskripsi</p>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
