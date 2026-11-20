import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getSiteSettings, updateSiteSettings } from "@/utils/admin.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Crown, Sparkles, Image as ImageIcon, Save, RotateCcw, AlertTriangle, Eye, Check, Sliders, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/customizer")({
  component: AdminCustomizerPage,
});

const DEFAULT_HERO = {
  headline: "Designed in Jakarta, Worn Beyond Borders.",
  subheadline: "Modern Heritage & Fine Bespoke Batik",
  cta_text: "EXPLORE THE COLLECTION",
  cta_link: "#signature-pieces",
  background_image: "",
  overlay_opacity: 60,
};

interface HeroSettings {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_link?: string;
  background_image?: string;
  overlay_opacity?: number;
}

function AdminCustomizerPage() {
  const { token, isOwner, role } = useAdminAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULT_HERO);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const { data: initialSettings, isLoading } = useQuery({
    queryKey: ["admin_site_settings_hero"],
    queryFn: () => getSiteSettings({ data: { key: "homepage_hero" } }),
  });

  useEffect(() => {
    if (initialSettings) {
      const s = initialSettings as unknown as HeroSettings;
      setForm({
        headline: s.headline || DEFAULT_HERO.headline,
        subheadline: s.subheadline || DEFAULT_HERO.subheadline,
        cta_text: s.cta_text || DEFAULT_HERO.cta_text,
        cta_link: s.cta_link || DEFAULT_HERO.cta_link,
        background_image: s.background_image || "",
        overlay_opacity: s.overlay_opacity ?? DEFAULT_HERO.overlay_opacity,
      });
    }
  }, [initialSettings]);

  const saveMutation = useMutation({
    mutationFn: (values: typeof form) =>
      updateSiteSettings({
        data: {
          token: token!,
          key: "homepage_hero",
          value: values,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_site_settings_hero"] });
      queryClient.invalidateQueries({ queryKey: ["homepage_hero_settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-logs"] });
      // Optimistically update homepage hero cache immediately
      queryClient.setQueryData(["homepage_hero_settings"], form);
      queryClient.setQueryData(["admin_site_settings_hero"], form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
  });

  // Upload image to product-images public bucket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `hero-custom-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, background_image: publicUrl }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset layout & background hero kembali ke pengaturan bawaan RAWTIX?")) {
      setForm(DEFAULT_HERO);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  // ─── Akses Khusus Owner Guard ───
  if (!isOwner) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-zinc-900 border border-rose-500/30 rounded-2xl text-center space-y-4 my-12">
        <div className="w-12 h-12 mx-auto bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-white">
          Akses Khusus Owner
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Sebagai Administrator Toko ({role}), Anda hanya memiliki wewenang operasional pesanan dan katalog. Kustomisasi layout dan background tampilan utama website dikunci khusus untuk <strong>Owner</strong>.
        </p>
        <button
          onClick={() => navigate({ to: "/admin" })}
          className="px-5 py-2.5 text-xs font-semibold tracking-wider uppercase bg-white hover:bg-zinc-200 text-black rounded-xl transition-all"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-xs tracking-widest uppercase text-zinc-400 animate-pulse">Memuat kustomizer...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full">
                <Crown className="w-3 h-3 text-amber-400" />
                Owner Exclusive
              </span>
              <span className="text-[11px] text-zinc-400">Desain &amp; Branding Beranda</span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-wider uppercase text-white">
              Kustomisasi Layout &amp; Hero Background
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Ubah teks headline, slogan hero, tombol CTA, dan gambar latar belakang beranda utama secara instan.
            </p>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            Lihat Web Live
          </a>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Pengaturan tampilan berhasil disimpan dan langsung aktif di halaman utama web! Aksi ini telah otomatis dicatat di User Log.</span>
        </div>
      )}

      {saveMutation.isError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          Gagal menyimpan: {saveMutation.error?.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM SETTINGS */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-white">
              Teks &amp; Tombol Aksi
            </h2>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
              Headline Utama
            </label>
            <input
              type="text"
              required
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className="w-full bg-black/50 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all placeholder:text-zinc-600"
              placeholder="Designed in Jakarta, Worn Beyond Borders."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
              Subheadline / Slogan
            </label>
            <input
              type="text"
              required
              value={form.subheadline}
              onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
              className="w-full bg-black/50 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all placeholder:text-zinc-600"
              placeholder="Modern Heritage & Fine Bespoke Batik"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
                Teks Tombol CTA
              </label>
              <input
                type="text"
                required
                value={form.cta_text}
                onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                className="w-full bg-black/50 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all placeholder:text-zinc-600"
                placeholder="EXPLORE THE COLLECTION"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
                Tautan Tombol CTA
              </label>
              <input
                type="text"
                required
                value={form.cta_link}
                onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                className="w-full bg-black/50 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all placeholder:text-zinc-600"
                placeholder="#signature-pieces atau /shop"
              />
            </div>
          </div>

          <div className="pt-3">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 mb-4">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-white">
                Background Gambar Hero
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Unggah Gambar Baru dari Komputer
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleFileUpload}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                />
                {uploading && <p className="text-[11px] text-amber-400 mt-1.5 animate-pulse">Sedang mengunggah foto ke storage...</p>}
                {uploadError && <p className="text-[11px] text-rose-400 mt-1.5">{uploadError}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Atau URL Gambar Custom (Direct Link)
                </label>
                <input
                  type="url"
                  value={form.background_image}
                  onChange={(e) => setForm({ ...form, background_image: e.target.value })}
                  className="w-full bg-black/50 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-xl placeholder:text-zinc-600 transition-all"
                  placeholder="https://.../gambar-hero.jpg (kosongkan untuk default)"
                />
              </div>

              <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold tracking-wider uppercase text-zinc-300">
                    Kegelapan Overlay Latar Belakang
                  </label>
                  <span className="text-xs font-bold text-amber-400">{form.overlay_opacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={form.overlay_opacity}
                  onChange={(e) => setForm({ ...form, overlay_opacity: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-amber-400"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Semakin tinggi, latar belakang semakin gelap sehingga teks terlihat lebih kontras dan mewah.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Bawaan
            </button>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>

        {/* LIVE REALTIME PREVIEW */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-zinc-300 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Pratinjau Tampilan Awal (Preview)
            </span>
            <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              Live Simulation
            </span>
          </div>

          <div className="relative aspect-[4/3] sm:aspect-[16/10] border border-zinc-800 rounded-2xl overflow-hidden bg-black flex items-center justify-center p-6 text-center text-white shadow-2xl">
            {/* Background preview */}
            {form.background_image ? (
              <img
                src={form.background_image}
                alt="Hero Preview"
                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.82] contrast-[1.08]"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
                <span className="text-white/20 text-xs uppercase tracking-widest">[ Foto Bawaan RAWTIX Ensemble ]</span>
              </div>
            )}

            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/85"
              style={{ opacity: form.overlay_opacity / 100 }}
            />

            {/* Content Preview */}
            <div className="relative z-10 max-w-sm space-y-3">
              <h3 className="font-serif text-lg sm:text-2xl font-normal tracking-tight leading-tight drop-shadow">
                {form.headline || "Designed in Jakarta, Worn Beyond Borders."}
              </h3>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/80 font-light">
                {form.subheadline || "Modern Heritage & Fine Bespoke Batik"}
              </p>
              <div className="pt-2">
                <span className="inline-block text-[10px] font-semibold tracking-[0.2em] uppercase text-white border-b border-white pb-0.5">
                  {form.cta_text || "EXPLORE THE COLLECTION"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-200">💡 Panduan Owner:</p>
            <p className="text-[11px] leading-relaxed">
              Perubahan teks dan background hero akan langsung tampil ke seluruh pengunjung toko online saat Anda menekan tombol <strong>Simpan Perubahan</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
