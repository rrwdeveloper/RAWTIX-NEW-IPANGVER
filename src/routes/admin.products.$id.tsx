import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { updateProduct, getAdminProductById, getAdminCategories } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductForm, type ProductFormData } from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/$id")({
  component: AdminEditProductPage,
});

function AdminEditProductPage() {
  const { id } = Route.useParams();
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: productData, isLoading: loadingProduct, error: productError } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => getAdminProductById({ data: { token: token!, id } }),
    enabled: !!token && !!id,
  });

  const { data: catData } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => getAdminCategories({ data: { token: token! } }),
    enabled: !!token,
  });

  const product = productData?.product;

  const mutation = useMutation({
    mutationFn: (formData: ProductFormData) =>
      updateProduct({
        data: {
          token: token!,
          id,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          price: formData.price,
          categoryId: formData.categoryId || null,
          status: formData.status,
          preorderEstimatedDate: formData.preorderEstimatedDate || null,
          featured: formData.featured,
          sortOrder: formData.sortOrder,
          variants: formData.variants,
          imageUrl: formData.imageUrl,
          imageUrls: formData.imageUrls?.map((img) => ({
            url: img.url,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      queryClient.invalidateQueries({ queryKey: ["homepage-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produk berhasil diperbarui");
      navigate({ to: "/admin/products" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui produk";
      toast.error(msg);
    },
  });

  if (loadingProduct) return <div className="text-sm text-muted-foreground py-12 text-center">Memuat detail produk...</div>;
  if (productError || !product) {
    return (
      <div className="text-center py-12 border border-border">
        <p className="text-sm text-muted-foreground">Produk tidak ditemukan atau gagal dimuat.</p>
        <Link to="/admin/products" className="text-xs text-foreground hover:underline mt-2 inline-block">← Kembali ke daftar produk</Link>
      </div>
    );
  }

  const existingImages = product.product_images?.map((img: { id: string; url: string; is_primary: boolean; sort_order: number }) => ({
    id: img.id,
    url: img.url,
    isPrimary: img.is_primary,
    sortOrder: img.sort_order,
  })) ?? [];

  const initialData: ProductFormData = {
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    price: product.price,
    categoryId: product.category_id || "",
    status: product.status,
    preorderEstimatedDate: product.preorder_estimated_date || "",
    featured: product.featured,
    sortOrder: product.sort_order,
    variants: product.product_variants?.map((v: { size: string; stock: number; sku: string | null }) => ({
      size: v.size,
      stock: v.stock,
      sku: v.sku || "",
    })) ?? [],
    imageUrl: "",
    imageUrls: existingImages,
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/products" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider uppercase text-foreground">Edit Produk</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ubah rincian, status, varian stok, dan foto produk</p>
        </div>
      </div>
      <ProductForm
        initialData={initialData}
        categories={catData?.categories ?? []}
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        error={mutation.error?.message}
      />
    </div>
  );
}
