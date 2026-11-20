import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAdminProducts, deleteProduct } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { token, role } = useAdminAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "preorder" | "draft" | "coming_soon" | "sold_out">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => getAdminProducts({ data: { token: token! } }),
    enabled: !!token,
  });

  const filteredProducts = useMemo(
    () => data?.products.filter((product) => statusFilter === "all" || product.status === statusFilter) ?? [],
    [data?.products, statusFilter]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { token: token!, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produk berhasil dihapus");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal menghapus produk";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider uppercase text-foreground">Katalog Produk</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola etalase, varian stok, dan harga produk</p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold tracking-wider uppercase bg-foreground text-background hover:bg-foreground/90 transition-colors rounded shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Barang Baru
        </Link>
      </div>

      <div className="flex flex-wrap gap-1">
        {([
          ["all", "Semua"],
          ["active", "Ready Stock"],
          ["preorder", "Pre-order"],
          ["sold_out", "Sold Out"],
          ["coming_soon", "Coming Soon"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`border px-3 py-1.5 text-[10px] tracking-wider uppercase transition-colors rounded ${
              statusFilter === value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center border border-border">Memuat data produk...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12 border border-border">Belum ada produk.</div>
      ) : (
        <div className="border border-border divide-y divide-border rounded">
          {filteredProducts.map((product) => {
            const primaryImage = product.product_images?.find((img: { is_primary: boolean }) => img.is_primary);
            const totalStock = product.product_variants?.reduce((sum: number, v: { stock: number }) => sum + v.stock, 0) ?? 0;

            return (
              <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-card/40 transition-colors">
                {primaryImage ? (
                  <img src={primaryImage.url} alt={product.name} className="w-12 h-12 object-cover border border-border rounded" />
                ) : (
                  <div className="w-12 h-12 bg-card border border-border flex items-center justify-center text-[10px] text-muted-foreground rounded">
                    —
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">Rp {product.price.toLocaleString("id-ID")}</span>
                    <span>·</span>
                    <span className={product.status === "active" ? "text-green-500 font-medium" : product.status === "sold_out" ? "text-red-500 font-medium" : "text-yellow-500 font-medium"}>
                      {product.status === "active" ? "Ready Stock" : product.status === "preorder" ? "Pre-order" : product.status === "sold_out" ? "Sold Out" : "Coming Soon"}
                    </span>
                    <span>·</span>
                    <span>Stok: {totalStock}</span>
                    {product.categories && (
                      <>
                        <span>·</span>
                        <span>{(product.categories as { name: string }).name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to="/admin/products/$id"
                    params={{ id: product.id }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded border border-transparent hover:border-border transition-colors"
                    title="Edit Produk"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>

                  {deleteId === product.id ? (
                    <div className="flex items-center gap-1 bg-background p-1 border border-border rounded">
                      <span className="text-[10px] text-muted-foreground px-1">Hapus?</span>
                      <button
                        onClick={() => deleteMutation.mutate(product.id)}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 text-[10px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded"
                      >
                        {deleteMutation.isPending ? "..." : "Ya"}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:text-foreground rounded"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(product.id)}
                      title="Hapus Produk"
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
