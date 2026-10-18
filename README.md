
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

Fill `.env` with the values from the shared Supabase, Midtrans, and Komerce
projects before testing authentication, admin, checkout, or payment flows.

The public Supabase URL, publishable key, and Midtrans client key are used by
the browser. `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, and
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

## Validation

```bash
npm run lint
npm run build
```
