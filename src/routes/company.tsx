import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import artboard4 from "../../asset/Artboard 4.png";
import artboard10 from "../../asset/Artboard 10.png";

export const Route = createFileRoute("/company")({
  component: CompanyPage,
});

function CompanyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24">
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 md:py-32 lg:grid-cols-12 lg:gap-20 lg:px-16">
          <div className="lg:col-span-7">
            <Link to="/" className="mb-12 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
            </Link>
            <p className="mb-5 text-xs uppercase tracking-[0.28em] text-muted-foreground">RAWTIX / Profil</p>
            <h1 className="font-heading text-5xl uppercase leading-[0.92] tracking-[-0.045em] sm:text-7xl">
              Modern heritage
              <br />
              <span className="font-serif font-normal italic tracking-normal text-muted-foreground">
                & fine bespoke batik.
              </span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pt-20">
            <p className="text-lg leading-8">
              RAWTIX adalah rumah mode busana batik independen yang berfokus pada
              penciptaan karya modern heritage berestetika oriental kontemporer.
            </p>
          </div>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
            <img src={artboard4} alt="Koleksi Dragon Fireman Clasp RAWTIX" className="h-full min-h-[28rem] w-full object-cover" />
            <div className="space-y-10 px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">01 / About</p>
                <h2 className="font-heading text-3xl uppercase tracking-[-0.03em] sm:text-5xl">Identitas yang dirancang dengan niat.</h2>
              </div>
              <div className="space-y-5 text-sm leading-7 text-muted-foreground">
                <p>
                  RAWTIX lahir dari semangat untuk meredefinisi kain batik tradisional
                  menjadi busana penuh karakter, dengan motif seperti Phoenix dan Dragon
                  yang dipadukan dengan aksentuasi fungsional modern seperti fireman clasp.
                </p>
                <p>
                  Visi RAWTIX adalah merancang identitas berbusana yang memadukan
                  keagungan batik Nusantara dengan keindahan estetika oriental modern,
                  sekaligus memberdayakan individu untuk tampil percaya diri.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 md:py-32 lg:grid-cols-12 lg:gap-20 lg:px-16">
          <div className="lg:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">02 / Mission</p>
            <h2 className="font-heading text-4xl uppercase leading-none tracking-[-0.035em] sm:text-6xl">
              Presisi & material premium.
            </h2>
          </div>
          <div className="space-y-8 lg:col-span-7">
            <p className="max-w-2xl text-lg leading-8">
              Setiap helai mengutamakan konstruksi jahitan presisi dan pemilihan bahan
              berkualitas tinggi, baik untuk busana ready to wear maupun bespoke.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {["Made to measure", "Group & event orders", "Custom order"].map((item) => (
                <div key={item} className="border-t border-border pt-4 text-xs uppercase tracking-[0.16em]">
                  {item}
                </div>
              ))}
            </div>
            <img src={artboard10} alt="Batik Dragon Series RAWTIX" className="aspect-[4/3] w-full object-cover" loading="lazy" />
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-20 sm:px-10 md:flex-row md:items-end md:justify-between md:py-28 lg:px-16">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">03 / Continue</p>
              <h2 className="font-heading text-4xl uppercase tracking-[-0.035em] sm:text-6xl">Temukan koleksinya.</h2>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.2em] underline underline-offset-8 hover:text-muted-foreground">
              Buka katalog <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
