import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { createProduct, getAdminCategories } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductForm, type ProductFormData } from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/new")({
  component: AdminNewProductPage,
});

function AdminNewProductPage() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: catData } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => getAdminCategories({ data: { token: token! } }),
    enabled: !!token,
  });

  const signatureCategory = catData?.categories.find(
    (category) => category.slug === "signature-pieces"
  );

  const mutation = useMutation({
    mutationFn: (formData: ProductFormData) =>
      createProduct({
        data: {
          token: token!,
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
      queryClient.invalidateQueries({ queryKey: ["homepage-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Produk berhasil ditambahkan");
      navigate({ to: "/admin/products" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan produk";
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/products" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider uppercase text-foreground">
            Tambah Barang Baru
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Lengkapi formulir untuk menambahkan produk baru ke katalog</p>
        </div>
      </div>

      <ProductForm
        initialData={
          signatureCategory
            ? {
                name: "",
                slug: "",
                description: "",
                price: 0,
                categoryId: signatureCategory.id,
                status: "coming_soon",
                preorderEstimatedDate: "",
                featured: false,
                sortOrder: 0,
                variants: [{ size: "M", stock: 0 }],
                imageUrl: "",
                imageUrls: [],
              }
            : undefined
        }
        categories={catData?.categories ?? []}
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        error={mutation.error?.message}
      />
    </div>
  );
}
