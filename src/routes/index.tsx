import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Star, CheckCircle2, MessageCircle, ChevronRight, Sparkles, Scissors, ShieldCheck, HeartHandshake, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { READY_STOCK_CATALOGUE } from "@/lib/catalogue";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

// Images
import heroEnsemble from "../../asset/rawtix-hero-ensemble.png";
import editorialElevator from "../../asset/editorial/rawtix-editorial-elevator.png";
import editorialGroomsmen from "../../asset/editorial/rawtix-editorial-groomsmen.png";
import editorialJavas from "../../asset/editorial/rawtix-editorial-javas.png";
import editorialVintage from "../../asset/editorial/rawtix-editorial-vintage.png";
import editorialTemple from "../../asset/editorial/rawtix-editorial-temple.png";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);

  // Fetch live products if available
  const { data: dbProducts } = useQuery({
    queryKey: ["homepage-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .eq("status", "active")
        .order("sort_order");
      if (error) return null;
      return data;
    },
  });

  // Group items according to Saint P layout references:
  // 1. Signature Pieces (6 bestselling items, 3 cols x 2 rows)
  const signatureItems = READY_STOCK_CATALOGUE.slice(0, 6);

  // 2. Daily Staples (3 items, 3 cols)
  const dailyStaplesItems = READY_STOCK_CATALOGUE.slice(6, 9);

  // Helper to open quick view modal for an item
  const handleOpenQuickView = (item: (typeof READY_STOCK_CATALOGUE)[0]) => {
    // Check if live db product exists
    const liveDbMatch = dbProducts?.find((p) => p.slug === item.slug);
    if (liveDbMatch) {
      setQuickViewProduct(liveDbMatch);
      return;
    }

    // Fallback product structure for catalogue item
    setQuickViewProduct({
      id: item.productId,
      name: item.name,
      slug: item.slug,
      price: item.price,
      status: "active",
      description: item.description,
      preorder_estimated_date: null,
      product_images: [
        {
          id: `img-${item.slug}`,
          url: item.image,
          is_primary: true,
          alt_text: item.name,
          product_id: item.productId,
        },
      ],
      product_variants: [
        { id: `${item.slug}-s`, size: "S", stock: 8, product_id: item.productId },
        { id: `${item.slug}-m`, size: "M", stock: 8, product_id: item.productId },
        { id: `${item.slug}-l`, size: "L", stock: 6, product_id: item.productId },
        { id: `${item.slug}-xl`, size: "XL", stock: 5, product_id: item.productId },
        { id: `${item.slug}-xxl`, size: "XXL", stock: 3, product_id: item.productId },
      ],
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-neutral-800 selection:text-white">
      <Header />

      <main className="relative">
        {/* ============================================================== */}
        {/* HERO SECTION (Foto 1: media_1792608740375_ec9d34f5.jpg)         */}
        {/* ============================================================== */}
        <section className="relative isolate flex min-h-[92vh] sm:min-h-screen items-center justify-center overflow-hidden border-b border-white/10 px-6 py-28 sm:py-36">
          <img
            src={heroEnsemble}
            alt="Model RAWTIX mengenakan koleksi modern heritage batik dengan Mandarin collar dan fireman clasp"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[52%_center] filter brightness-[0.82] contrast-[1.08]"
            fetchPriority="high"
          />
          {/* Subtle dark gradient overlay for black/grey dominance */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/45 to-black/85" />

          <div className="relative z-10 max-w-4xl text-center text-white px-4">
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight leading-[1.12] drop-shadow-md">
              Designed in Jakarta, Worn Beyond Borders.
            </h1>
            <p className="mt-5 text-xs sm:text-sm uppercase tracking-[0.28em] text-white/80 font-light max-w-xl mx-auto">
              Modern Heritage &amp; Fine Bespoke Batik
            </p>
            <div className="mt-8 sm:mt-10">
              <a
                href="#signature-pieces"
                className="inline-block text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-white border-b border-white pb-1.5 hover:text-white/70 hover:border-white/70 transition-colors"
              >
                EXPLORE THE COLLECTION
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 1: SIGNATURE PIECES (Foto 2 & 3: Saint P reference)    */}
        {/* ============================================================== */}
        <section id="signature-pieces" className="px-4 sm:px-8 md:px-14 py-20 sm:py-28 max-w-7xl mx-auto">
          {/* Section Header with Spencerian Cursive Title */}
          <div className="text-center mb-14 sm:mb-20">
            <h2 className="font-script text-5xl sm:text-7xl md:text-8xl text-foreground font-normal tracking-wide">
              Signature Pieces
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-foreground/90">
              BROWSE OUR BEST SELLING PRODUCTS
            </p>
          </div>

          {/* 3-Column Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {signatureItems.map((item, index) => (
              <div
                key={item.slug}
                className={`group relative flex flex-col bg-card/40 border transition-all duration-300 ${
                  index === 0
                    ? "border-foreground/35 shadow-lg"
                    : "border-border hover:border-foreground/40 hover:shadow-md"
                }`}
              >
                {/* Product Image Frame */}
                <Link
                  to="/product/$slug"
                  params={{ slug: item.slug }}
                  className="relative aspect-[4/5] overflow-hidden bg-neutral-900/40 block"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  {/* Subtle Badge */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white/90 px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase border border-white/10">
                    {item.series}
                  </div>
                </Link>

                {/* Product Details Bar */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 border-t border-border bg-card/60">
                  <div>
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="block font-heading text-xs sm:text-sm uppercase tracking-[0.14em] text-foreground hover:text-muted-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickView(item)}
                      className="flex-1 py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-center"
                    >
                      Pilih Opsi
                    </button>
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground transition-colors"
                      title="Lihat Detail"
                      aria-label={`Detail ${item.name}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 2: DAILY STAPLES (Foto 3 & 4: Saint P reference)       */}
        {/* ============================================================== */}
        <section id="daily-staples" className="px-4 sm:px-8 md:px-14 py-20 sm:py-28 max-w-7xl mx-auto border-t border-border">
          {/* Section Header with Spencerian Cursive Title */}
          <div className="text-center mb-14 sm:mb-20">
            <h2 className="font-script text-5xl sm:text-7xl md:text-8xl text-foreground font-normal tracking-wide">
              Daily Staples
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-foreground/90">
              ELEVATED BASICS FOR EVERYDAY WEAR
            </p>
          </div>

          {/* 3-Column Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {dailyStaplesItems.map((item) => (
              <div
                key={item.slug}
                className="group relative flex flex-col bg-card/40 border border-border hover:border-foreground/40 hover:shadow-md transition-all duration-300"
              >
                {/* Product Image Frame */}
                <Link
                  to="/product/$slug"
                  params={{ slug: item.slug }}
                  className="relative aspect-[4/5] overflow-hidden bg-neutral-900/40 block"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white/90 px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase border border-white/10">
                    {item.series}
                  </div>
                </Link>

                {/* Product Details Bar */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 border-t border-border bg-card/60">
                  <div>
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="block font-heading text-xs sm:text-sm uppercase tracking-[0.14em] text-foreground hover:text-muted-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickView(item)}
                      className="flex-1 py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-center"
                    >
                      Pilih Opsi
                    </button>
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground transition-colors"
                      title="Lihat Detail"
                      aria-label={`Detail ${item.name}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 3: THE ATELIER & COMPANY PROFILE CORE                  */}
        {/* (From PDF: FILE RAWTIX_compressed.pdf - Base Colour: Hitam Abu) */}
        {/* ============================================================== */}
        <section id="bespoke" className="border-t border-border bg-card/25 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-14">
            
            {/* Top Overview: About Us & Ethos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-5 space-y-6">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-medium">
                  03 / The House Profile
                </p>
                <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-[-0.03em] leading-[1.05] text-foreground">
                  Modern Heritage &amp; Fine Bespoke Batik.
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  RAWTIX adalah rumah mode busana batik independen yang berfokus pada
                  penciptaan karya modern heritage berestetika oriental contemporary.
                  Lahir dari semangat untuk meredefinisi kain batik tradisional menjadi
                  busana penuh karakter, kami memadukan motif dinamis seperti Phoenix dan
                  Dragon dengan aksentuasi fungsional modern seperti <em>fireman clasp</em>.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link
                    to="/company"
                    className="inline-flex items-center gap-2 border-b border-foreground pb-1 text-xs uppercase tracking-[0.22em] font-semibold hover:text-muted-foreground transition-colors"
                  >
                    Profil Lengkap Perusahaan <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20Made%20to%20Measure%20/%20Bespoke"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Konsultasi Custom Order
                  </a>
                </div>
              </div>

              {/* Editorial Photos Duo */}
              <div className="lg:col-span-7 grid grid-cols-2 gap-4 sm:gap-6">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xs border border-border shadow-xl">
                  <img
                    src={editorialElevator}
                    alt="Koleksi Phoenix Fireman Clasp RAWTIX"
                    className="w-full h-full object-cover filter brightness-[0.9] hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-xs p-3 text-white border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/60">Phoenix Series</p>
                    <p className="text-xs font-medium tracking-wider">Fireman Clasp Silhouette</p>
                  </div>
                </div>

                <div className="relative aspect-[3/4] overflow-hidden rounded-xs border border-border shadow-xl mt-6 sm:mt-10">
                  <img
                    src={editorialJavas}
                    alt="Koleksi Javas Fireman Clasp RAWTIX Hitam Abu"
                    className="w-full h-full object-cover filter brightness-[0.9] hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-xs p-3 text-white border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/60">Javas Series</p>
                    <p className="text-xs font-medium tracking-wider">Monochrome Black &amp; Grey</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Pillars: Core Services from PDF */}
            <div className="mt-24 pt-16 border-t border-border">
              <div className="max-w-2xl mb-12">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-medium">
                  04 / Core Services
                </p>
                <h3 className="font-heading text-2xl sm:text-4xl uppercase tracking-tight text-foreground mt-2">
                  Layanan Busana RAWTIX
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                  Dari busana ready to wear siap pakai hingga custom order untuk hari sakral dan acara prestisius.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    num: "01",
                    title: "Ready to Wear (RTW)",
                    desc: "Koleksi busana batik siap pakai edisi terbatas dengan potongan Mandarin collar presisi dan kenyamanan iklim tropis.",
                  },
                  {
                    num: "02",
                    title: "Made to Measure",
                    desc: "Layanan busana tailored fit yang dipersonalisasi mengikuti ukuran tubuh dan preferensi gaya untuk lamaran & pernikahan.",
                  },
                  {
                    num: "03",
                    title: "Group & Event Orders",
                    desc: "Solusi busana seragam untuk tim groomsmen, seragam keluarga besar, hingga corporate VIP event dengan estetika selaras.",
                  },
                  {
                    num: "04",
                    title: "Limited Collections",
                    desc: "Perilisan khusus seperti Phoenix Fireman Clasp Series yang dirilis terbatas untuk kolektor dan penikmat fesyen.",
                  },
                ].map((s) => (
                  <div
                    key={s.num}
                    className="p-6 bg-card border border-border hover:border-foreground/40 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs tracking-widest text-muted-foreground">
                        {s.num}
                      </span>
                      <h4 className="font-heading text-base uppercase tracking-wider text-foreground mt-3">
                        {s.title}
                      </h4>
                      <p className="text-xs leading-relaxed text-muted-foreground mt-3">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Step Production Workflow from PDF */}
            <div className="mt-20 pt-16 border-t border-border">
              <div className="text-center max-w-xl mx-auto mb-12">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-medium">
                  Atelier Standards
                </p>
                <h3 className="font-heading text-2xl sm:text-3xl uppercase tracking-tight text-foreground mt-2">
                  Alur Produksi Presisi
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { step: "01", title: "Konsultasi", desc: "Penentuan warna, motif naga/phoenix, dan model kemeja/jaket." },
                  { step: "02", title: "Pengukuran", desc: "Measurement presisi & pemilihan material premium (Sutra ATBM)." },
                  { step: "03", title: "Desain & Fitting", desc: "Konfirmasi rancangan detail, kancing fireman clasp & fitting." },
                  { step: "04", title: "Penjahitan", desc: "Pemotongan presisi dan quality control berlapis oleh artisan." },
                  { step: "05", title: "Pengemasan", desc: "Packaging eksklusif RAWTIX siap dikirim ke seluruh nusantara." },
                ].map((item) => (
                  <div key={item.step} className="p-4 border border-border/80 bg-background/50 rounded-xs">
                    <span className="text-[11px] font-mono tracking-widest text-foreground font-bold">
                      STEP {item.step}
                    </span>
                    <h5 className="font-heading text-xs uppercase tracking-wider text-foreground mt-2 font-semibold">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-normal mt-1.5">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Choose RAWTIX? (From PDF Page 10) */}
            <div className="mt-20 pt-16 border-t border-border">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Collar Detail Graphic Frame */}
                <div className="lg:col-span-5 relative overflow-hidden rounded-xs border border-border bg-neutral-900/40">
                  <img
                    src="/brand/08-why-rawtix.png"
                    alt="Detail Kerah Mandarin dan Motif Batik RAWTIX"
                    className="w-full h-auto object-cover filter brightness-[0.92] contrast-[1.05]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/70">
                      Signature Tailoring Code
                    </p>
                    <p className="font-heading text-sm uppercase tracking-wider mt-0.5">
                      Mandarin Collar &amp; Fireman Clasp Precision
                    </p>
                  </div>
                </div>

                {/* 3 Pillars List */}
                <div className="lg:col-span-7 space-y-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-medium">
                      The Standard of Distinction
                    </p>
                    <h3 className="font-heading text-2xl sm:text-4xl uppercase tracking-tight text-foreground mt-2">
                      Why Choose RAWTIX?
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-5 bg-card/60 border border-border/80">
                      <div className="p-2.5 bg-foreground/5 text-foreground shrink-0 border border-border">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm uppercase tracking-wider text-foreground font-semibold">
                          Eksklusivitas &amp; Desain Otentik
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                          Setiap karya dirancang khusus dengan gabungan motif ikonik (Phoenix, Dragon, Mega Mendung) dan fitur kancing <em>fireman clasp</em> yang membedakan RAWTIX dari batik konvensional.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 bg-card/60 border border-border/80">
                      <div className="p-2.5 bg-foreground/5 text-foreground shrink-0 border border-border">
                        <Scissors className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm uppercase tracking-wider text-foreground font-semibold">
                          Fleksibilitas Ukuran &amp; Pola
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                          Layanan <em>made to measure</em> memastikan setiap potongan mengikuti bentuk tubuh dan preferensi gaya pelanggan secara presisi untuk kenyamanan berbusana tingkat tinggi.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 bg-card/60 border border-border/80">
                      <div className="p-2.5 bg-foreground/5 text-foreground shrink-0 border border-border">
                        <HeartHandshake className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm uppercase tracking-wider text-foreground font-semibold">
                          Pendampingan Konsultasi Acara
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                          Kami membantu memberikan rekomendasi paduan warna, motif, dan model yang paling sesuai dengan konsep acara lamaran, perayaan sakral, atau pernikahan Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Order Portfolio: Groomsmen Set & Made-to-Measure Womenswear (From PDF Pages 7, 15, 16, 18, 19) */}
            <div className="mt-20 pt-16 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-medium">
                    Ceremonial &amp; Bespoke Line
                  </p>
                  <h3 className="font-heading text-2xl sm:text-4xl uppercase tracking-tight text-foreground mt-2">
                    Groomsmen &amp; Womenswear Bespoke
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  Solusi busana seragam untuk momen sakral pernikahan dan kreasi siluet busana wanita pesanan khusus.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card 1: Groomsmen & Grooms Set (PDF Page 16) */}
                <div className="group relative overflow-hidden border border-border bg-card flex flex-col">
                  <div className="relative aspect-[16/10] sm:aspect-[16/11] overflow-hidden bg-neutral-900">
                    <img
                      src={editorialGroomsmen}
                      alt="Groomsmen and Groom Set RAWTIX"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase border border-white/10 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-amber-400" /> Bulk &amp; Wedding Set
                    </div>
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-heading text-lg sm:text-xl uppercase tracking-wider text-foreground">
                        Group &amp; Event Orders (Groomsmen Sets)
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5">
                        Solusi busana seragam acara bertema modern-heritage. Kami melayani pembuatan seri bulk/group order untuk tim groomsmen, seragam keluarga besar, hingga corporate/VIP event dengan konsistensi kualitas dan estetika yang selaras.
                      </p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
                      <a
                        href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20pembuatan%20Groomsmen%20Set%20/%20Seragam%20Acara"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Konsultasi Groomsmen <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-[11px] font-mono text-muted-foreground">Bulk Order</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Womenswear Made to Measure (PDF Page 15, 18, 19) */}
                <div className="group relative overflow-hidden border border-border bg-card flex flex-col">
                  <div className="relative aspect-[16/10] sm:aspect-[16/11] overflow-hidden bg-neutral-900">
                    <img
                      src={editorialVintage}
                      alt="Womenswear Made to Measure RAWTIX"
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase border border-white/10 flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-amber-400" /> Tailored Fit
                    </div>
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-heading text-lg sm:text-xl uppercase tracking-wider text-foreground">
                        Womenswear Made to Measure
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5">
                        Layanan busana batik yang disesuaikan secara khusus bagi wanita dan pasangan. Menghadirkan siluet blus kerah Shanghai kontemporer, set peplum, dan detail kancing <em>fireman clasp</em> untuk prosesi lamaran dan perayaan prestisius.
                      </p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
                      <a
                        href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20Womenswear%20/%20Bespoke%20Batik"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Konsultasi Busana Wanita <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-[11px] font-mono text-muted-foreground">Custom Fit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 4: TESTIMONIALS / POSTCARDS (Foto 5: Saint P reference)*/}
        {/* ============================================================== */}
        <section className="px-4 sm:px-8 md:px-14 py-24 sm:py-32 max-w-7xl mx-auto border-t border-border">
          {/* Postcard Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Postcard 1: Rizky Pratama */}
            <div className="relative p-6 sm:p-7 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col justify-between overflow-hidden">
              {/* Airmail Postal Postmark Stamp */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-60">
                <div className="w-12 h-12 rounded-full border border-dashed border-amber-600/70 flex items-center justify-center text-[8px] font-mono tracking-tighter text-amber-500 uppercase text-center rotate-12">
                  JAKARTA<br/>RAWTIX<br/>2026
                </div>
                <div className="hidden sm:flex flex-col gap-0.5 text-amber-500/70">
                  <span className="w-6 h-px bg-amber-500/60" />
                  <span className="w-6 h-px bg-amber-500/60" />
                  <span className="w-6 h-px bg-amber-500/60" />
                </div>
              </div>

              <div>
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-bold tracking-wider border border-border">
                    RP
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-foreground">
                      Rizky Pratama
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      @atlantastore2024
                    </p>
                  </div>
                </div>

                {/* 5-Star Rating */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-xs font-medium text-foreground ml-1">(5)</span>
                </div>

                {/* Review Quote */}
                <p className="text-xs leading-relaxed text-muted-foreground italic">
                  “Dari segi kualitas, bahan, hingga design sangat sangat bagus, apalagi buat art sekarang, semuanya udah berubah menjadi simple yang membuat rawtix semakin gila dengan produknya.”
                </p>
              </div>

              {/* Postcard Attached Product Mini */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Product: Javas Fireman Clasp
                </span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified Patron
                </span>
              </div>
            </div>

            {/* Postcard 2: Rifaldi Maulana */}
            <div className="relative p-6 sm:p-7 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col justify-between overflow-hidden">
              {/* Airmail Postal Postmark Stamp */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-60">
                <div className="w-12 h-12 rounded-full border border-dashed border-amber-600/70 flex items-center justify-center text-[8px] font-mono tracking-tighter text-amber-500 uppercase text-center -rotate-6">
                  JAKARTA<br/>RAWTIX<br/>2026
                </div>
                <div className="hidden sm:flex flex-col gap-0.5 text-amber-500/70">
                  <span className="w-6 h-px bg-amber-500/60" />
                  <span className="w-6 h-px bg-amber-500/60" />
                  <span className="w-6 h-px bg-amber-500/60" />
                </div>
              </div>

              <div>
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-bold tracking-wider border border-border">
                    RM
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-foreground">
                      Rifaldi Maulana
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      @rifaldi.maulana
                    </p>
                  </div>
                </div>

                {/* 5-Star Rating */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-xs font-medium text-foreground ml-1">(5)</span>
                </div>

                {/* Review Quote */}
                <p className="text-xs leading-relaxed text-muted-foreground italic">
                  “Kualitasnya pokoknya baguss, it's been two years now tapi masih awet banget, merk lain mungkin warnanya bakal memudar and the printing will crack, but not for rawtix.”
                </p>
              </div>

              {/* Postcard Attached Product Mini */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Product: White Phoenix Clasp
                </span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified Patron
                </span>
              </div>
            </div>

            {/* Postcard 3: Deviana Rachma Cholida (with Polaroid Photo like Saint P Screenshot 5) */}
            <div className="relative p-6 sm:p-7 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col justify-between overflow-hidden">
              {/* Airmail Postal Postmark Stamp */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-60">
                <div className="w-12 h-12 rounded-full border border-dashed border-amber-600/70 flex items-center justify-center text-[8px] font-mono tracking-tighter text-amber-500 uppercase text-center rotate-6">
                  JAKARTA<br/>RAWTIX<br/>2026
                </div>
              </div>

              <div>
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-bold tracking-wider border border-border">
                    DR
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-foreground">
                      Deviana Rachma Cholida
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      @ecreanaived
                    </p>
                  </div>
                </div>

                {/* 5-Star Rating */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-xs font-medium text-foreground ml-1">(5)</span>
                </div>

                {/* Review Text + Polaroid Photo Side by Side */}
                <div className="flex gap-4 items-start">
                  <p className="flex-1 text-xs leading-relaxed text-muted-foreground italic">
                    “Selalu dipuji cakep kalau pakai product dari rawtix, bahannya juga bagus semua, cuttingannya pas dan berwibawa di badanku hahah, I love rawtix!”
                  </p>
                  {/* Attached Polaroid Snapshot */}
                  <div className="w-18 shrink-0 bg-white p-1 rounded-2xs shadow-md border border-neutral-300 -rotate-3 hover:rotate-0 transition-transform">
                    <img
                      src={editorialVintage}
                      alt="Deviana wearing RAWTIX"
                      className="w-full h-18 object-cover object-top"
                    />
                    <p className="text-[7px] text-center text-neutral-800 font-mono mt-0.5 tracking-tighter">
                      rawtix #fit
                    </p>
                  </div>
                </div>
              </div>

              {/* Postcard Attached Product Mini */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Product: White Phoenix Clasp
                </span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified Patron
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 5: "View all" (Foto 5: Saint P reference)              */}
        {/* ============================================================== */}
        <section className="py-20 sm:py-28 text-center max-w-7xl mx-auto px-4 border-t border-border">
          <h2 className="font-script text-6xl sm:text-8xl md:text-9xl text-foreground font-normal tracking-wide">
            View all
          </h2>
          <div className="mt-3">
            <Link
              to="/shop"
              className="inline-block text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-foreground hover:text-muted-foreground border-b border-foreground/50 pb-1.5 transition-colors"
            >
              VIEW ALL PRODUCTS
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      {/* Quick View Modal for Instant Buying / Option Selection */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}
