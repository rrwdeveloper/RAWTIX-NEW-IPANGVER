import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Instagram } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import artboard3 from "../../asset/Artboard 3.png";
import artboard4 from "../../asset/Artboard 4.png";
import heroEnsemble from "../../asset/rawtix-hero-ensemble.png";
import { READY_STOCK_CATALOGUE as CATALOGUE } from "@/lib/catalogue";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type FeaturedProduct = Database["public"]["Tables"]["products"]["Row"] & {
  product_images: Database["public"]["Tables"]["product_images"]["Row"][];
  categories: { name: string; slug: string } | null;
};

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: featuredProducts, isLoading: isCatalogueLoading, error: catalogueError } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), categories!inner(name, slug)")
        .eq("featured", true)
        .eq("status", "active")
        .eq("categories.slug", "signature-pieces")
        .order("sort_order");
      if (error) throw error;
      return data as FeaturedProduct[];
    },
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main>
        <section className="relative isolate flex min-h-[min(860px,100svh)] items-center justify-center overflow-hidden border-b border-border px-5 py-28 sm:px-10 sm:py-32">
          <img
            src={heroEnsemble}
            alt="Model RAWTIX mengenakan koleksi batik dalam suasana editorial"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[58%_center] sm:object-center"
            fetchPriority="high"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" />

          <div className="relative z-10 max-w-full text-center text-white">
            <h1 className="font-heading text-4xl font-medium tracking-[0.24em] sm:text-7xl sm:tracking-[0.35em] lg:text-8xl">
              RAWTIX
            </h1>
            <p className="mt-4 text-[0.65rem] tracking-[0.08em] sm:mt-5 sm:text-base sm:tracking-[0.12em]">
              Modern Heritage &amp; Fine Bespoke Batik
            </p>
          </div>
        </section>

        <section id="story" className="mx-auto grid max-w-7xl gap-12 px-6 py-24 sm:px-10 md:py-36 lg:grid-cols-12 lg:gap-20 lg:px-16">
          <div className="lg:col-span-7">
            <p className="mb-6 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              01 / The house
            </p>
            <h2 className="max-w-3xl font-heading text-4xl font-medium uppercase leading-[0.98] tracking-[-0.035em] sm:text-6xl">
              Identitas busana yang membawa warisan ke masa kini.
            </h2>
          </div>
          <div className="space-y-6 lg:col-span-5 lg:pt-12">
            <p className="text-base leading-8 text-muted-foreground">
              RAWTIX lahir dari semangat untuk mendefinisikan kembali kain batik
              tradisional menjadi busana modern heritage yang berestetika oriental
              kontemporer.
            </p>
            <p className="text-base leading-8 text-muted-foreground">
              Setiap karya dirancang dengan perhatian pada konstruksi presisi, pilihan
              bahan, serta potongan bergaya Mandarin collar atau Shanghai.
            </p>
            <Link
              to="/company"
              className="inline-flex items-center gap-3 border-b border-foreground pb-2 text-xs font-semibold uppercase tracking-[0.22em] transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Baca profil RAWTIX <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="catalogue-heading" className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 md:py-36 lg:px-16">
            <div className="mb-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    02 / The catalogue
                </p>
                <h2 id="catalogue-heading" className="font-heading text-4xl uppercase tracking-[-0.035em] sm:text-6xl">
                  Signature pieces
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                Sebelas karya signature yang mempertemukan motif Nusantara, konstruksi
                Mandarin collar, dan karakter RAWTIX.
              </p>
            </div>

            {catalogueError && (
              <p className="border border-destructive/30 p-4 text-sm text-destructive">
                Katalog tidak dapat dimuat. Silakan coba lagi nanti.
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-12">
              {(featuredProducts ?? []).map((product, index) => {
                const fallback = CATALOGUE.find((item) => item.slug === product.slug);
                const primaryImage = product.product_images.find((image) => image.is_primary)
                  ?? product.product_images[0];
                const image = primaryImage?.url ?? fallback?.image;
                return (
                <Link
                  key={product.id}
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  className={`group ${index === 0 ? "col-span-2 lg:col-span-6 lg:row-span-2" : "lg:col-span-3"}`}
                >
                  <div className="overflow-hidden bg-secondary">
                    {image ? (
                      <img
                        src={image}
                        alt={primaryImage?.alt_text ?? product.name}
                        className="aspect-[7/9] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="flex aspect-[7/9] items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
                    <span>
                      <span className="block text-foreground">{product.name}</span>
                      <span className="mt-1 block normal-case tracking-normal">
                        {product.categories?.name ?? "Signature piece"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {product.status === "preorder" ? "Pre-order" : "Ready stock"}
                    </span>
                  </div>
                </Link>
                );
              })}
            </div>
            {!isCatalogueLoading && !catalogueError && featuredProducts?.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Belum ada produk featured.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="services-heading" className="mx-auto max-w-7xl px-6 py-24 sm:px-10 md:py-36 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-5">
              <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                03 / Services
              </p>
              <h2 id="services-heading" className="font-heading text-4xl uppercase leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                Dibuat untuk momen yang berarti.
              </h2>
              <p className="mt-7 max-w-md text-sm leading-7 text-muted-foreground">
                Dari koleksi siap pakai hingga busana yang dibuat khusus, RAWTIX
                mendampingi kebutuhan personal, pasangan, keluarga, dan acara.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border lg:col-span-7">
              {[
                ["01", "Ready to Wear", "Koleksi siap pakai untuk gaya sehari-hari yang tetap berkarakter."],
                ["02", "Made to Measure", "Busana dipersonalisasi mengikuti ukuran tubuh dan preferensi gaya."],
                ["03", "Group & Event Orders", "Solusi busana seragam untuk groomsmens, keluarga besar, dan event."],
                ["04", "Limited Collections", "Perilisan terbatas untuk menjaga karakter eksklusif tiap koleksi."],
              ].map(([number, title, description]) => (
                <div key={number} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6">
                  <span className="text-xs tracking-[0.2em] text-muted-foreground">{number}</span>
                  <div>
                    <h3 className="font-heading text-xl uppercase tracking-tight">{title}</h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-10 md:py-36 lg:px-16">
          <div className="relative overflow-hidden border border-border bg-black px-6 py-16 text-white sm:px-12 lg:px-20">
            <img
              src={artboard4}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="relative max-w-2xl">
              <p className="mb-5 text-xs uppercase tracking-[0.28em] text-white/60">04 / Bespoke</p>
              <h2 className="font-heading text-4xl uppercase leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                Ceritakan momen yang ingin kamu kenakan.
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/70">
                Konsultasikan kebutuhan busana personal, pasangan, keluarga, atau acara
                melalui kanal resmi RAWTIX.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20Custom%20Order"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-3 bg-white px-5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Konsultasi via WhatsApp <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="https://www.instagram.com/rawtix.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-3 border border-white/40 px-5 text-xs uppercase tracking-[0.2em] transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}
