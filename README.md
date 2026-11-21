
# RAWTIX

## Local development

Requirements:

- Node.js 20 or newer
- npm

Setup:

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with the values from the shared Supabase, DOKU, and Komerce
projects before testing authentication, admin, checkout, or payment flows.

The public Supabase URL and publishable key are used by
the browser. `SUPABASE_SERVICE_ROLE_KEY`, `DOKU_SECRET_KEY`, and
`KOMERCE_API_KEY` are server-only secrets and must never use a `VITE_` prefix,
be committed, or be shared in chat.

## Supabase

The database migrations are in `supabase/migrations`. To work against the
shared project, install the Supabase CLI, authenticate, link the project, and
apply migrations:

```bash
npx --yes supabase login
npx --yes supabase link --project-ref your-project-ref
npx --yes supabase db push
```

Do not run `supabase db reset` against production. The application also
expects the `product-images` public Storage bucket and the seeded catalogue
data to exist.

## Troubleshooting pembayaran internasional DOKU

Jika pembeli dari luar negeri membuka website tetapi transaksi Visa/Mastercard ditolak:

1. Masalah tersebut biasanya terjadi pada konfigurasi merchant/acquirer DOKU, bukan karena website memblokir negara pengguna.
2. Hubungi DOKU Support melalui kanal resmi dan minta pemeriksaan **international card / cross-border Mastercard dan Visa**, 3DS, serta BIN/country yang belum diizinkan untuk Merchant ID yang digunakan.
3. Sediakan informasi transaksi: Merchant ID/Client ID, invoice number, waktu transaksi, merek kartu, dan pesan penolakan. Jangan kirim nomor kartu penuh, CVV, atau secret key.
4. Pastikan variabel produksi berikut benar: `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_IS_PRODUCTION=true`, dan `APP_URL`.
5. Setelah DOKU mengaktifkan akses, lakukan transaksi uji berbiaya rendah dan verifikasi webhook pembayaran serta status pesanan. Redeploy jika ada perubahan environment pada Cloudflare.

Jika DOKU gagal membuat payment URL, aplikasi kini menahan pembuatan pesanan dan pengurangan stok, lalu menampilkan pesan agar pelanggan mencoba lagi atau menghubungi RAWTIX. Pantau error `[DOKU]` pada log server untuk mengetahui kegagalan konfigurasi atau koneksi API.

## Validation

```bash
npm run lint
npm run build
```
