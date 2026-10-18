import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { createProduct, getAdminCategories } from "@/utils/admin.functions";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProductForm, type ProductFormData } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/new")({
  component: AdminNewProductPage,
});

function AdminNewProductPage() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();

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
      navigate({ to: "/admin/products" });
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-heading text-xl font-bold tracking-wider uppercase text-foreground">Tambah Produk</h1>
      <ProductForm
        initialData={signatureCategory ? {
          name: "",
          slug: "",
          description: "",
          price: 0,
          categoryId: signatureCategory.id,
          status: "draft",
          preorderEstimatedDate: "",
          featured: false,
          sortOrder: 0,
          variants: [{ size: "M", stock: 0 }],
          imageUrl: "",
          imageUrls: [],
        } : undefined}
        categories={catData?.categories ?? []}
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        error={mutation.error?.message}
      />
    </div>
  );
}
