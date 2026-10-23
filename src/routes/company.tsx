import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, MessageCircle, Sparkles, Scissors, HeartHandshake, Users, Mail, Instagram } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Editorial Images
import editorialElevator from "../../asset/editorial/rawtix-editorial-elevator.png";
import editorialGroomsmen from "../../asset/editorial/rawtix-editorial-groomsmen.png";
import editorialJavas from "../../asset/editorial/rawtix-editorial-javas.png";

export const Route = createFileRoute("/company")({
  component: CompanyPage,
});

function CompanyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-neutral-800 selection:text-white">
      <Header />

      <main className="pt-24">
        {/* ============================================================== */}
        {/* HERO / INTRO                                                   */}
        {/* ============================================================== */}
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 md:py-24 lg:px-16">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-20 items-end">
            <div className="lg:col-span-7">
              <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                The House of RAWTIX / Profil &amp; Filosofi
              </p>
              <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl uppercase leading-[0.95] tracking-tight text-foreground">
                Modern Heritage
                <br />
                <span className="font-serif font-normal italic lowercase tracking-normal text-muted-foreground">
                  &amp; fine bespoke batik.
                </span>
              </h1>
            </div>
            <div className="lg:col-span-5">
              <p className="text-base sm:text-lg leading-relaxed text-muted-foreground">
                RAWTIX adalah rumah mode busana batik independen yang berfokus pada penciptaan karya modern heritage berestetika oriental contemporary.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] font-semibold text-foreground/80">
                Designed in Jakarta, Worn Beyond Borders.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 01 / THE CRAFT & ARTISAN STORY (PDF Page 2 & 3)                */}
        {/* ============================================================== */}
        <section className="border-y border-border bg-card/20">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-12 gap-0 items-stretch">
            {/* Artisan Photo Frame - Large & Full Uncropped */}
            <div className="lg:col-span-6 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-border bg-neutral-900/60 flex items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-lg overflow-hidden rounded-xs border border-border shadow-2xl">
                <img
                  src="/brand/02-craft.png"
                  alt="Pengrajin Batik Tradisional Canting RAWTIX"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Story Content */}
            <div className="lg:col-span-6 space-y-8 px-6 py-16 sm:px-10 lg:px-14 lg:py-20 flex flex-col justify-center">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                  01 / The Ethos
                </p>
                <h2 className="font-heading text-2xl sm:text-4xl uppercase tracking-tight text-foreground">
                  Meredefinisi Tradisi Menjadi Karakter.
                </h2>
              </div>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                <p>
                  Lahir dari semangat untuk meredefinisi kain batik tradisional menjadi busana penuh karakter, RAWTIX memadukan seni motif cetak dan grafis yang dinamis seperti <strong>Phoenix</strong> dan <strong>Dragon</strong> dengan aksentuasi fungsional modern seperti <em>fireman clasp</em> logam.
                </p>
                <p>
                  Kami melayani kebutuhan individu yang mengapresiasi eksklusivitas melalui koleksi <strong>Ready to Wear (RTW)</strong> edisi terbatas, serta layanan <strong>Custom Order / Made to Measure</strong> untuk momen-momen istimewa seperti prosesi lamaran, pernikahan (<em>groomsmen &amp; family set</em>), hingga acara formal berkelas.
                </p>
                <p>
                  Mengutamakan konstruksi presisi, pemilihan bahan premium (seperti <em>Sutra ATBM Prada</em>, Katun Primissima), dan potongan bergaya Mandarin Collar / Shanghai, RAWTIX berkomitmen menghadirkan busana yang bukan sekadar pakaian, melainkan sebuah warisan gaya yang bernilai tinggi.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20Made%20to%20Measure%20/%20Bespoke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-b border-foreground pb-1 text-xs uppercase tracking-[0.22em] font-semibold text-foreground hover:text-muted-foreground transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Konsultasi Custom Order Langsung
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* THE ICONIC MOTIF: DRAGON & MEGA MENDUNG                        */}
        {/* ============================================================== */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-12 gap-0 items-stretch">
            {/* Story Content */}
            <div className="lg:col-span-6 space-y-8 px-6 py-16 sm:px-10 lg:px-14 lg:py-20 flex flex-col justify-center order-2 lg:order-1">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                  02 / Signature Artwork
                </p>
                <h2 className="font-heading text-2xl sm:text-4xl uppercase tracking-tight text-foreground">
                  Seni Motif Dragon &amp; Phoenix.
                </h2>
              </div>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                <p>
                  Karakter RAWTIX berpijak pada keberanian memadukan ornamen mitologi oriental seperti naga dan burung phoenix dengan kelembutan awan Mega Mendung khas Nusantara.
                </p>
                <p>
                  Setiap guratan warna merah, emas, dan biru dirancang secara presisi di atas kain berlatar hitam pekat untuk menciptakan wibawa dan daya pikat yang tak lekang oleh waktu.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 border-b border-foreground pb-1 text-xs uppercase tracking-[0.22em] font-semibold text-foreground hover:text-muted-foreground transition-colors"
                >
                  Jelajahi Koleksi Dragon Series <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Dragon Photo Frame - Large & Full Uncropped */}
            <div className="lg:col-span-6 relative overflow-hidden border-b lg:border-b-0 lg:border-l border-border bg-neutral-900/60 flex items-center justify-center p-6 sm:p-10 order-1 lg:order-2">
              <div className="w-full max-w-lg overflow-hidden rounded-xs border border-border shadow-2xl">
                <img
                  src="/brand/01-about-us.png"
                  alt="Motif Naga dan Awan RAWTIX"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 03 / OUR VISION & OUR MISSION (PDF Page 4 & 5)                 */}
        {/* ============================================================== */}
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 md:py-28 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Vision Header */}
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                03 / Direction
              </p>
              <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-tight text-foreground leading-[1.05]">
                Our Vision &amp; Mission
              </h2>
              <div className="pt-4 border-t border-border">
                <h3 className="font-heading text-xs uppercase tracking-[0.22em] text-foreground font-bold mb-2">
                  OUR VISION
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  “Merancang identitas berbusana yang memadukan keagungan tradisi batik Nusantara dengan keberanian estetika oriental modern, memberdayakan setiap individu untuk tampil dengan rasa percaya diri, keanggunan, dan wibawa sejati.”
                </p>
              </div>

              <div className="overflow-hidden rounded-xs border border-border mt-6 shadow-xl bg-neutral-950">
                <img
                  src="/brand/03-vision.png"
                  alt="Koleksi Bahan Batik RAWTIX - Our Vision & Mission"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Mission 3 Pillars */}
            <div className="lg:col-span-7 space-y-6 lg:pt-8">
              <h3 className="font-heading text-xs uppercase tracking-[0.22em] text-foreground font-bold">
                OUR MISSION
              </h3>

              <div className="space-y-4">
                <div className="p-6 bg-card border border-border">
                  <span className="font-mono text-xs text-muted-foreground tracking-widest">MISSION 01</span>
                  <h4 className="font-heading text-base uppercase tracking-wider text-foreground mt-2">
                    Presisi &amp; Material Premium
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                    Menghadirkan konstruksi jahitan dan pemilihan bahan berkualitas tinggi pada setiap helai busana RTW maupun Bespoke (termasuk Sutra ATBM Prada dan tenun berpola).
                  </p>
                </div>

                <div className="p-6 bg-card border border-border">
                  <span className="font-mono text-xs text-muted-foreground tracking-widest">MISSION 02</span>
                  <h4 className="font-heading text-base uppercase tracking-wider text-foreground mt-2">
                    Inovasi Desain Modern-Heritage
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                    Berinovasi menggabungkan ornamen tradisional dengan aksen kontemporer (seperti kancing <em>fireman clasp</em> dan elemen kemeja kerah Shanghai).
                  </p>
                </div>

                <div className="p-6 bg-card border border-border">
                  <span className="font-mono text-xs text-muted-foreground tracking-widest">MISSION 03</span>
                  <h4 className="font-heading text-base uppercase tracking-wider text-foreground mt-2">
                    Pelayanan Custom yang Personal
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                    Memberikan pengalaman pembuatan busana <em>made-to-measure</em> yang dipersonalisasi untuk acara-acara sakral dan momen berharga pelanggan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 04 / CORE SERVICES (PDF Page 6, 7, 8, 9, 16)                   */}
        {/* ============================================================== */}
        <section className="border-t border-border bg-card/25 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl mb-14">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                04 / Offerings
              </p>
              <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-tight text-foreground mt-2">
                RAWTIX Core Services
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                Layanan pembuatan busana terintegrasi untuk kebutuhan personal maupun acara skala besar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  num: "01",
                  title: "Ready to Wear (RTW)",
                  subtitle: "Koleksi Siap Pakai",
                  desc: "Koleksi busana batik siap pakai edisi terbatas dengan potongan Mandarin collar presisi dan kenyamanan iklim tropis.",
                  img: editorialElevator,
                },
                {
                  num: "02",
                  title: "Bespoke & Made to Measure",
                  subtitle: "Custom Order Personal",
                  desc: "Layanan pembuatan busana batik yang disesuaikan secara khusus (tailored fit) untuk perorangan, pasangan, maupun keluarga.",
                  img: "/brand/06-bespoke.png",
                },
                {
                  num: "03",
                  title: "Group & Event Orders",
                  subtitle: "Groomsmen & Family Sets",
                  desc: "Solusi busana seragam acara bertema modern-heritage untuk tim groomsmen, seragam keluarga besar, hingga corporate VIP event.",
                  img: editorialGroomsmen,
                },
                {
                  num: "04",
                  title: "Limited Collections",
                  subtitle: "Exclusive Editions",
                  desc: "Perilisan koleksi terbatas bertema khusus seperti Phoenix Fireman Clasp Series yang diproduksi dalam kuota terbatas bagi kolektor fesyen.",
                  img: "/brand/07-limited.png",
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className="group flex flex-col bg-card border border-border overflow-hidden hover:border-foreground/40 transition-colors"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                    <img
                      src={s.img}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white/80">
                      {s.num}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                        {s.subtitle}
                      </span>
                      <h4 className="font-heading text-base uppercase tracking-wider text-foreground mt-1">
                        {s.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 05 / WHY CHOOSE RAWTIX (PDF Page 10)                           */}
        {/* ============================================================== */}
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 md:py-28 lg:px-16 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Frame */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-xs border border-border bg-neutral-900">
              <img
                src="/brand/08-why-rawtix.png"
                alt="Why Choose RAWTIX"
                className="w-full h-auto object-cover filter brightness-[0.92]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/70">
                  Tailored Distinction
                </p>
                <p className="font-heading text-sm uppercase tracking-wider mt-0.5">
                  Standar Kualitas &amp; Dedikasi Busana
                </p>
              </div>
            </div>

            {/* 3 Pillars */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                  05 / Distinction
                </p>
                <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-tight text-foreground mt-2">
                  Why Choose RAWTIX?
                </h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-card/60 border border-border">
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

                <div className="flex items-start gap-4 p-5 bg-card/60 border border-border">
                  <div className="p-2.5 bg-foreground/5 text-foreground shrink-0 border border-border">
                    <Scissors className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm uppercase tracking-wider text-foreground font-semibold">
                      Fleksibilitas Ukuran &amp; Pola
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                      Layanan <em>made to measure</em> memastikan setiap potongan mengikuti bentuk tubuh dan preferensi gaya pelanggan secara presisi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-card/60 border border-border">
                  <div className="p-2.5 bg-foreground/5 text-foreground shrink-0 border border-border">
                    <HeartHandshake className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm uppercase tracking-wider text-foreground font-semibold">
                      Pendampingan Konsultasi Acara
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                      Kami membantu memberikan rekomendasi paduan warna, motif, dan model yang paling sesuai dengan konsep acara lamaran atau pernikahan Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 06 / PRODUCTION WORKFLOW (PDF Page 11)                         */}
        {/* ============================================================== */}
        <section className="border-t border-border bg-card/20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
            <div className="text-center max-w-xl mx-auto mb-14">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                06 / Process
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-foreground mt-2">
                Production Workflow
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                5 tahapan alur produksi presisi untuk setiap helai mahakarya RAWTIX.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { step: "01", title: "Konsultasi", desc: "Konsultasi kebutuhan, konsep acara, warna, motif (Dragon/Phoenix), dan model kerah." },
                { step: "02", title: "Pengukuran", desc: "Measurement ukuran tubuh presisi dan pemilihan material premium (Sutra ATBM Prada)." },
                { step: "03", title: "Desain & Fitting", desc: "Konfirmasi detail desain, penempatan kancing fireman clasp, dan penyesuaian fitting." },
                { step: "04", title: "Penjahitan", desc: "Pemotongan kain presisi, penjahitan berstandar tailor, dan quality control berlapis." },
                { step: "05", title: "Pengemasan", desc: "Pengemasan eksklusif RAWTIX dan pengiriman aman hingga sampai ke tangan Anda." },
              ].map((item) => (
                <div key={item.step} className="p-5 border border-border bg-card/70 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-mono tracking-widest text-foreground font-bold">
                      STEP {item.step}
                    </span>
                    <h5 className="font-heading text-sm uppercase tracking-wider text-foreground mt-2.5 font-semibold">
                      {item.title}
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 07 / DIRECT CONSULTATION & CONTACT (PDF Page 21)               */}
        {/* ============================================================== */}
        <section className="border-t border-border bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground font-mono">
                  07 / Atelier Concierge
                </p>
                <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-tight text-foreground leading-[1.05]">
                  Mari Kenakan Keanggunan Warisan Budaya untuk Momen Abadi Anda.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Hubungi tim penjahit dan desainer RAWTIX untuk konsultasi busana pribadi, pesanan pasangan, seragam groomsmen pernikahan, maupun edisi koleksi terbatas.
                </p>

                <div className="pt-4 flex flex-wrap gap-4">
                  <a
                    href="https://wa.me/6285719636329?text=Halo%20RAWTIX,%20saya%20ingin%20konsultasi%20mengenai%20busana%20Batik%20Bespoke"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Consultation
                  </a>
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] font-semibold border border-border hover:border-foreground text-foreground transition-all"
                  >
                    Lihat Koleksi RTW <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Direct Info Card (from PDF Page 21) */}
              <div className="lg:col-span-5 p-8 border border-border bg-card/60 space-y-6">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-widest text-foreground">
                    RAW TIX
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                    Modern Heritage &amp; Fine Bespoke Batik
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-border text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                      WhatsApp / Direct Consultation
                    </span>
                    <a
                      href="https://wa.me/6285719636329"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-emerald-400 transition-colors mt-0.5 inline-block"
                    >
                      085719636329
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                      Email
                    </span>
                    <a
                      href="mailto:rawtix.official@gmail.com"
                      className="font-medium text-foreground hover:text-muted-foreground transition-colors mt-0.5 inline-block"
                    >
                      rawtix.official@gmail.com
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                      Instagram
                    </span>
                    <a
                      href="https://instagram.com/rawtix.id"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-muted-foreground transition-colors mt-0.5 inline-block"
                    >
                      @rawtix.id
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
