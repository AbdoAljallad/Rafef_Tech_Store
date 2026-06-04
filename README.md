# Rafef Tech Frontend

Russian-first frontend for the Rafef Tech local shop management system.

## Run Locally

```bash
npm install
npm run dev
```

## Development Mock Auth

Until the backend/database auth module exists, local frontend review can use mock auth.

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_AUTH=true
```

Mock login:

```text
username: admin
password: admin123
```

The mock user is local development only:

- display name: `Администратор`
- role: `owner/admin`
- max discount: `100`
- permissions: all Phase 1 permissions

When mock auth is enabled, the UI shows a `MOCK AUTH` badge. Production behavior remains the real backend API path.

For normal backend mode:

```env
VITE_USE_MOCK_AUTH=false
```

With the local backend running on port 3000, use:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_AUTH=false
```

Restart the Vite dev server after changing `.env.local`.
