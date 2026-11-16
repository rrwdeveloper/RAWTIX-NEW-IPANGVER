import { createFileRoute } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getUserLogs } from "@/utils/admin.functions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ClipboardList,
  Crown,
  ShieldCheck,
  Filter,
  Search,
  Clock,
  ArrowUpDown,
  X,
  ExternalLink,
  Info,
  Calendar,
  User,
  CheckCircle2,
  FileText,
  Sliders,
  Package,
  CreditCard,
  Truck,
  Trash2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogsPage,
});

interface UserLogItem {
  id: string;
  user_id: string | null;
  user_email: string;
  role: "owner" | "admin";
  action: string;
  entity: string;
  description: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

function AdminLogsPage() {
  const { token, role, isOwner } = useAdminAuth();
  const [filterRole, setFilterRole] = useState<"all" | "owner" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<UserLogItem | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-user-logs", isOwner],
    queryFn: () => getUserLogs({ data: { token: token!, limit: 100 } }),
    enabled: !!token,
  });

  const logs: UserLogItem[] = (data?.logs as UserLogItem[]) || [];

  // Filter logs based on search & role filter (for Owner who has multi-filter options)
  const filteredLogs = logs.filter((log) => {
    if (isOwner && filterRole !== "all" && log.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchEmail = log.user_email?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchEntity = log.entity?.toLowerCase().includes(q);
      const matchDesc = log.description?.toLowerCase().includes(q);
      return matchEmail || matchAction || matchEntity || matchDesc;
    }
    return true;
  });

  // Human-readable narrative helper
  const getHumanDescription = (log: UserLogItem): string => {
    if (log.description && log.description.trim().length > 0) {
      return log.description;
    }
    const d = log.details || {};
    switch (log.action) {
      case "UPDATE_HOMEPAGE_LAYOUT":
      case "UPDATE_HOMEPAGE_HERO":
        return `Memperbarui konfigurasi tampilan Hero: Judul diatur ke "${d.headline || "Judul Standar"}", overlay ${d.overlay_opacity ?? 60}%, ${d.has_custom_bg ? "menggunakan foto latar kustom" : "menggunakan latar standar"}.`;
      case "UPDATE_ORDER_STATUS":
        return `Mengubah status pesanan dari "${d.previous_label || d.previous || "-"}" menjadi "${d.new_label || d.new || "-"}".`;
      case "VERIFY_PAYMENT":
        return `Memverifikasi bukti transfer pembayaran pesanan${d.amount ? ` sebesar Rp ${Number(d.amount).toLocaleString("id-ID")}` : ""} dan mengubah status menjadi "Lunas (paid)".`;
      case "LOGIN":
        return `Berhasil login ke ${log.entity || "Portal Sistem"} via ${d.device || "Browser"} (IP: ${d.ip || "127.0.0.1"}).`;
      case "ASSIGN_ROLE":
        return `Menetapkan hak akses (role) sebagai ${String(d.assigned_role || "").toUpperCase()} kepada pengguna oleh ${d.granted_by || "Owner"}.`;
      case "REMOVE_ROLE":
        return `Mencabut hak akses tim pada sistem.`;
      case "CREATE_PRODUCT":
        return `Menambahkan produk baru ke katalog aktif.`;
      case "UPDATE_PRODUCT":
        return `Memperbarui informasi & spesifikasi produk.`;
      case "DELETE_PRODUCT":
        return `Menonaktifkan produk dari etalase aktif toko (status diubah ke draft).`;
      case "CREATE_CATEGORY":
      case "UPDATE_CATEGORY":
      case "DELETE_CATEGORY":
        return `Melakukan penyesuaian pada kategori katalog produk.`;
      case "CREATE_SHIPPING_RATE":
      case "UPDATE_SHIPPING_RATE":
      case "DELETE_SHIPPING_RATE":
        return `Melakukan penyesuaian pada opsi dan tarif pengiriman kurir.`;
      case "INITIALIZE_SYSTEM":
        return `Inisialisasi sistem baru dan migrasi basis data.`;
      default:
        return `${log.entity}: ${log.action.replace(/_/g, " ").toLowerCase()}`;
    }
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case "UPDATE_HOMEPAGE_LAYOUT":
      case "UPDATE_HOMEPAGE_HERO":
        return {
          label: "Kustomisasi Hero",
          icon: Sliders,
          badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
        };
      case "UPDATE_ORDER_STATUS":
        return {
          label: "Status Pesanan",
          icon: Package,
          badgeClass: "bg-sky-400/15 text-sky-300 border-sky-400/30",
        };
      case "VERIFY_PAYMENT":
        return {
          label: "Verifikasi Bayar",
          icon: CreditCard,
          badgeClass: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
        };
      case "DELETE_PRODUCT":
      case "DELETE_CATEGORY":
      case "DELETE_SHIPPING_RATE":
      case "DELETE_PRODUCT_IMAGE":
        return {
          label: "Hapus Data",
          icon: Trash2,
          badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        };
      case "ASSIGN_ROLE":
      case "REMOVE_ROLE":
        return {
          label: "Otoritas Tim",
          icon: Lock,
          badgeClass: "bg-purple-400/15 text-purple-300 border-purple-400/30",
        };
      case "LOGIN":
        return {
          label: "Sesi Masuk",
          icon: User,
          badgeClass: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30",
        };
      default:
        return {
          label: action.replace(/_/g, " "),
          icon: FileText,
          badgeClass: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
        };
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " WIB";
    } catch {
      return dateStr;
    }
  };

  // Helper to translate detail keys into clean Indonesian labels
  const getDetailLabel = (key: string): string => {
    const labels: Record<string, string> = {
      headline: "Judul Hero",
      subheadline: "Subjudul Hero",
      cta_text: "Teks Tombol CTA",
      cta_link: "Tautan Tombol CTA",
      has_custom_bg: "Latar Belakang Kustom",
      overlay_opacity: "Tingkat Kegelapan Overlay",
      previous: "Status Sebelumnya",
      new: "Status Baru",
      previous_label: "Label Status Sebelumnya",
      new_label: "Label Status Baru",
      amount: "Nominal Transaksi",
      proof: "Status Verifikasi Bukti",
      status: "Status",
      name: "Nama Item",
      price: "Harga / Tarif",
      slug: "URL Slug",
      device: "Perangkat / Browser",
      ip: "Alamat IP",
      assigned_role: "Peran Diberikan",
      granted_by: "Ditetapkan Oleh",
      target_user_id: "ID Pengguna Target",
      role_id: "ID Peran",
      note: "Catatan Sistem",
      id: "ID Objek",
      imageId: "ID Gambar",
      productId: "ID Produk",
    };
    return labels[key] || key.replace(/_/g, " ");
  };

  const formatDetailValue = (key: string, val: any): string => {
    if (typeof val === "boolean") return val ? "Ya / Aktif" : "Tidak / Nonaktif";
    if (key === "amount" || key === "price") {
      return `Rp ${Number(val).toLocaleString("id-ID")}`;
    }
    if (key === "overlay_opacity") return `${val}%`;
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Sleek Luxury Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-black p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full">
                <ClipboardList className="w-3 h-3 text-amber-400" />
                Audit Trail Aktivitas
              </span>
              <span className="text-[11px] text-zinc-400">
                {isOwner ? "Transparansi Penuh Staf & Owner" : "Log Aktivitas Operasional Admin"}
              </span>
            </div>

            <h1 className="font-heading text-2xl font-bold tracking-wider uppercase text-white">
              User Log Sistem
            </h1>

            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              {isOwner
                ? "Sebagai Owner, Anda dapat memantau seluruh riwayat aktivitas staf Admin dan Owner. Setiap baris dapat diklik untuk membuka penjelasan detail dalam bahasa manusia."
                : "Sebagai Admin, Anda dapat memantau riwayat aktivitas sesama staf operasional. Klik pada baris untuk melihat keterangan lengkap."}
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 self-start md:self-auto"
          >
            <ArrowUpDown className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-amber-400" : ""}`} />
            {isFetching ? "Menyinkronkan..." : "Segarkan"}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl backdrop-blur">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-amber-400/80" />
            <span className="font-medium">Filter:</span>
          </div>

          {isOwner ? (
            <div className="inline-flex rounded-lg border border-zinc-800 p-0.5 bg-black/60 shadow-inner">
              <button
                onClick={() => setFilterRole("all")}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  filterRole === "all"
                    ? "bg-zinc-200 text-black shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Semua ({logs.length})
              </button>
              <button
                onClick={() => setFilterRole("admin")}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  filterRole === "admin"
                    ? "bg-sky-500 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Admin Saja
              </button>
              <button
                onClick={() => setFilterRole("owner")}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  filterRole === "owner"
                    ? "bg-amber-400 text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                👑 Owner Saja
              </button>
            </div>
          ) : (
            <div className="px-3 py-1 text-[11px] font-medium text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded-lg">
              🛡️ Aktivitas Tim Admin ({logs.length} catatan)
            </div>
          )}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari email, aksi, kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 rounded-lg transition-all"
          />
        </div>
      </div>

      {/* Interactive Logs List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-xs tracking-widest uppercase text-zinc-400 animate-pulse space-y-2">
            <ClipboardList className="w-6 h-6 mx-auto text-amber-400/60 animate-bounce" />
            <p>Memuat riwayat aktivitas sistem...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
            <Info className="w-6 h-6 mx-auto text-zinc-500" />
            <p>Tidak ada catatan log aktivitas yang cocok dengan filter pencarian.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {filteredLogs.map((log) => {
              const config = getActionConfig(log.action);
              const ActionIcon = config.icon;
              const narrative = getHumanDescription(log);

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="group p-4 hover:bg-zinc-800/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-start justify-between gap-4"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedLog(log)}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon container */}
                    <div className="w-9 h-9 rounded-xl bg-black/60 border border-zinc-800 group-hover:border-amber-400/40 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                      <ActionIcon className="w-4 h-4 text-zinc-300 group-hover:text-amber-400 transition-colors" />
                    </div>

                    <div className="space-y-1.5">
                      {/* Badge & Entity header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-md ${config.badgeClass}`}>
                          {config.label}
                        </span>
                        <span className="text-xs font-semibold text-white tracking-wide">
                          {log.entity}
                        </span>
                      </div>

                      {/* Prominent Human-Readable Narrative Explanation */}
                      <p className="text-xs text-zinc-200 leading-relaxed font-normal">
                        {narrative}
                      </p>

                      {/* Metadata bar */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                          {log.role === "owner" ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <Crown className="w-3 h-3" />
                              {log.user_email}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              {log.user_email}
                            </span>
                          )}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formatLogDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side CTA hint */}
                  <div className="flex items-center gap-2 shrink-0 md:self-center pl-12 md:pl-0">
                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-amber-400 transition-colors hidden sm:inline">
                      Lihat Detail
                    </span>
                    <span className="text-xs text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                      ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-zinc-200 text-xs">Akuntabilitas &amp; Keamanan Terjamin</p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Catatan log ini tersimpan aman di basis data Supabase dengan proteksi Row Level Security (RLS). Seluruh aksi staf tercatat secara otomatis demi keteraturan dan transparansi operasional toko RAWTIX.
          </p>
        </div>
      </div>

      {/* POP-UP / MODAL DETAIL AKTIVITAS */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  {selectedLog.role === "owner" ? (
                    <Crown className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-white">
                    Detail Log Aktivitas
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ID: {selectedLog.id}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Highlight Action & Narrative Card */}
              <div className="p-4 rounded-xl bg-black/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-md ${getActionConfig(selectedLog.action).badgeClass}`}>
                    {getActionConfig(selectedLog.action).label}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {formatFullDate(selectedLog.created_at)}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white pt-1">
                  {selectedLog.entity}
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-amber-400/90 mb-1">
                    Keterangan Lengkap (Human Narrative):
                  </span>
                  {getHumanDescription(selectedLog)}
                </div>
              </div>

              {/* Pelaku / Actor Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                    Pelaku Aksi
                  </span>
                  <div className="text-xs font-semibold text-white truncate">
                    {selectedLog.user_email}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                    Tingkat Hak Akses
                  </span>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {selectedLog.role === "owner" ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" />
                        👑 Owner
                      </span>
                    ) : (
                      <span className="text-sky-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        🛡️ Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Parameter / Rincian Perubahan (Human-friendly Table) */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Parameter Rincian Perubahan:
                  </span>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/80 bg-black/40">
                    {Object.entries(selectedLog.details).map(([key, val]) => (
                      <div key={key} className="px-3.5 py-2.5 flex items-center justify-between text-xs gap-4">
                        <span className="text-zinc-400 font-medium">
                          {getDetailLabel(key)}:
                        </span>
                        <span className="font-semibold text-zinc-200 text-right break-all">
                          {formatDetailValue(key, val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-black/40 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
