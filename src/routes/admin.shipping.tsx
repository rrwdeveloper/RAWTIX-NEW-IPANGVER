import { createFileRoute } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  getAdminShippingConfig,
  getAdminShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
} from "@/utils/admin.functions";
import { searchDestination, getShippingRates } from "@/utils/orders.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  ShieldAlert,
  MapPin,
  Key,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/admin/shipping")({
  component: AdminShippingPage,
});

interface DestinationItem {
  id: number;
  label: string;
  subdistrict_name?: string;
  city_name?: string;
  province_name?: string;
  zip_code?: string;
}

interface TestedRateItem {
  service: string;
  description: string;
  cost: number;
  etd: string;
}

function AdminShippingPage() {
  const { token, isOwner } = useAdminAuth();
  const queryClient = useQueryClient();

  // Server functions
  const searchDestFn = useServerFn(searchDestination);
  const getRatesFn = useServerFn(getShippingRates);

  // Status API RajaOngkir / Komerce
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["admin-shipping-config"],
    queryFn: () => getAdminShippingConfig({ data: { token: token! } }),
    enabled: !!token,
  });

  // Simulator State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [destOptions, setDestOptions] = useState<DestinationItem[]>([]);
  const [selectedDest, setSelectedDest] = useState<DestinationItem | null>(null);
  const [weight, setWeight] = useState(1000);
  const [simulatedRates, setSimulatedRates] = useState<TestedRateItem[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [simError, setSimError] = useState("");

  // Emergency Fallback Rates
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: 0, isDefault: false, active: true, sortOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);

  const { data: fallbackData } = useQuery({
    queryKey: ["admin-shipping-fallback-rates"],
    queryFn: () => getAdminShippingRates({ data: { token: token! } }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => createShippingRate({ data: { token: token!, ...form } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping-fallback-rates"] });
      setForm({ name: "", price: 0, isDefault: false, active: true, sortOrder: 0 });
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => updateShippingRate({ data: { token: token!, id, ...form } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping-fallback-rates"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShippingRate({ data: { token: token!, id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-shipping-fallback-rates"] }),
  });

  const handleSearchDest = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 3) {
      setDestOptions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchDestFn({ data: { query: q.trim() } });
      setDestOptions(Array.isArray(res) ? res : []);
    } catch {
      setDestOptions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCalculateTest = async () => {
    if (!selectedDest) return;
    setCalculating(true);
    setSimError("");
    setSimulatedRates([]);

    try {
      const rates = await getRatesFn({
        data: { destinationId: selectedDest.id, weight },
      });
      setSimulatedRates(rates as TestedRateItem[]);
      if (!rates || rates.length === 0) {
        setSimError("Tidak ada layanan kurir yang tersedia untuk rute ini.");
      }
    } catch (e: unknown) {
      setSimError(e instanceof Error ? e.message : "Gagal menghitung tarif");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading text-xl font-bold tracking-wider uppercase text-foreground">
          Pengiriman Otomatis (RajaOngkir)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Tarif ongkir pembeli dihitung secara otomatis dan real-time dari API RajaOngkir (Komerce) berdasarkan kecamatan tujuan dan berat barang.
        </p>
      </div>

      {/* 1. Status Provider RajaOngkir */}
      <div className="border border-border bg-card p-5 space-y-4 rounded-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-foreground">
              Status Integrasi API RajaOngkir
            </h2>
          </div>
          {loadingConfig ? (
            <span className="text-xs text-muted-foreground">Memeriksa...</span>
          ) : config?.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
              <CheckCircle2 className="w-3 h-3" /> Aktif & Terhubung
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded">
              <AlertTriangle className="w-3 h-3" /> API Key Belum Diset
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-background/50 border border-border/50 rounded">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Titik Asal Gudang RAWTIX
            </span>
            <span className="font-medium text-foreground mt-1 block">
              {config?.originDistrict || "Pejaten Barat, Jakarta Selatan"}
            </span>
            <span className="text-[10px] text-muted-foreground">ID Komerce: 17567</span>
          </div>

          <div className="p-3 bg-background/50 border border-border/50 rounded">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
              <Truck className="w-3 h-3" /> Ekspedisi Aktif
            </span>
            <span className="font-medium text-foreground mt-1 block">
              JNE (REG, YES, Super Speed)
            </span>
            <span className="text-[10px] text-muted-foreground">Otomatis dihitung per gram</span>
          </div>

          <div className="p-3 bg-background/50 border border-border/50 rounded">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
              <Key className="w-3 h-3" /> Kunci API Komerce
            </span>
            <span className="font-mono text-[11px] text-foreground mt-1 block">
              {config?.maskedKey || "zZB8••••••••YqGR"}
            </span>
            <span className="text-[10px] text-emerald-400/80">Tersimpan di .env server</span>
          </div>
        </div>
      </div>

      {/* 2. Live Ongkir Simulator (Untuk Admin & Owner Cek Tarif) */}
      <div className="border border-border bg-card p-5 space-y-4 rounded-sm">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-xs font-bold tracking-wider uppercase text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            Simulator Cek Ongkir Live
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Admin/Owner dapat menguji perhitungan ongkos kirim ke seluruh kecamatan se-Indonesia tanpa perlu checkout manual.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 items-end">
          <div className="space-y-1.5 relative">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Kecamatan / Kota Tujuan
            </label>
            <input
              type="text"
              placeholder="Ketik minimal 3 huruf (misal: bandung, tebet, surabaya)..."
              value={searchQuery}
              onChange={(e) => handleSearchDest(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground outline-none focus:border-foreground"
            />
            {isSearching && (
              <span className="absolute right-3 top-7 text-[10px] text-muted-foreground">Mencari...</span>
            )}
            {destOptions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-card border border-border max-h-56 overflow-y-auto shadow-2xl rounded">
                {destOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedDest(opt);
                      setSearchQuery(opt.label);
                      setDestOptions([]);
                    }}
                    className="p-2.5 text-xs hover:bg-foreground/10 cursor-pointer border-b border-border/40 last:border-0"
                  >
                    <p className="font-semibold text-foreground">
                      {opt.district_name || opt.subdistrict_name}, {opt.city_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {opt.province_name} {opt.zip_code ? `· Kodepos ${opt.zip_code}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Berat Paket (Gram)
            </label>
            <input
              type="number"
              min={250}
              step={250}
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 1000)}
              className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground outline-none focus:border-foreground"
            />
          </div>

          <button
            onClick={handleCalculateTest}
            disabled={!selectedDest || calculating}
            className="px-4 py-2 bg-foreground text-background text-xs tracking-wider uppercase font-semibold hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 h-[34px]"
          >
            {calculating ? "Menghitung..." : <>Hitung <ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>

        {simError && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded">
            {simError}
          </div>
        )}

        {simulatedRates.length > 0 && (
          <div className="border border-border/70 rounded divide-y divide-border/60 bg-background/40">
            {simulatedRates.map((rate, i) => (
              <div key={i} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-foreground tracking-wide">
                    JNE {rate.service}
                  </span>
                  <span className="text-muted-foreground text-[11px] ml-2">({rate.description})</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Estimasi tiba: {rate.etd || "-"}</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  Rp {rate.cost.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Cadangan Darurat (Fallback Rates) — Bersifat Opsional Jika API RajaOngkir Gangguan */}
      <div className="border border-border/60 bg-card/40 p-4 rounded-sm space-y-3">
        <div
          onClick={() => setShowFallbacks(!showFallbacks)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase text-foreground">
                Tarif Cadangan Darurat (Emergency Fallback)
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Hanya dipakai jika server RajaOngkir sedang *down* / gangguan, agar pembeli tetap bisa checkout.
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showFallbacks ? "rotate-180" : ""}`} />
        </div>

        {showFallbacks && (
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Daftar tarif flat darurat:</span>
              <button
                onClick={() => { setShowAdd(true); setForm({ name: "", price: 0, isDefault: false, active: true, sortOrder: 0 }); }}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider uppercase border border-border hover:bg-foreground/10 text-foreground"
              >
                <Plus className="w-3 h-3" /> Tambah Cadangan
              </button>
            </div>

            {showAdd && (
              <div className="border border-border p-3 space-y-2 bg-background">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    placeholder="Nama (misal: JNE Reguler Darurat)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-card border border-border px-2 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="number"
                    placeholder="Harga (Rp)"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                    className="bg-card border border-border px-2 py-1.5 text-xs text-foreground"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !form.name}
                    className="px-3 py-1 bg-foreground text-background text-[10px] uppercase font-bold"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="px-3 py-1 border border-border text-[10px] uppercase text-muted-foreground"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {fallbackData && fallbackData.rates.length > 0 ? (
              <div className="border border-border divide-y divide-border rounded bg-background">
                {fallbackData.rates.map((rate) => (
                  <div key={rate.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-foreground">{rate.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">Rp {rate.price.toLocaleString("id-ID")}</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => deleteMutation.mutate(rate.id)}
                        className="p-1 text-muted-foreground hover:text-rose-400"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Belum ada tarif cadangan (secara default sistem memakai safety rate Rp 25.000 jika API gagal).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
