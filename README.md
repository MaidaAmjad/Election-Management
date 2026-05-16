# Election Management

Secure Online Election Management System — React frontend with Vite, Tailwind CSS, and Supabase authentication.

## Tech stack

- **React 19** with functional components and hooks
- **Vite** for development and builds
- **React Router DOM** for routing
- **Context API** for authentication state
- **Tailwind CSS v4** for styling
- **Supabase** for authentication
- **react-hot-toast** for notifications
- **react-icons** for icons

## Project structure

```
src/
├── components/     # Reusable UI and routing components
├── pages/          # Route page components
├── routes/         # Application routing
├── context/        # Auth context provider
├── services/       # Supabase auth service layer
├── hooks/          # Custom React hooks
├── utils/          # Constants, validators, helpers
├── layouts/        # Page layouts
└── supabase/       # Supabase client configuration
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the example environment file and add your Supabase project credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

In the [Supabase Dashboard](https://supabase.com/dashboard):

1. Enable **Email** auth provider.
2. Configure **Site URL** and **Redirect URLs** (include `http://localhost:5173` for local dev).
3. Customize email templates for confirmation and password reset.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Available routes

| Route | Description |
|-------|-------------|
| `/` | Home landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Request password reset |
| `/dashboard` | Protected dashboard (authenticated users) |
| `/unauthorized` | Access denied page |

## User roles

Roles are stored in Supabase `user_metadata.role`:

- `admin` — full system access
- `election_officer` — manage elections
- `voter` — participate in elections

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Build for production

```bash
npm run build
```

Output is written to the `dist/` directory.
