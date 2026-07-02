# Ops Workspace

Standalone **Convex + Clerk + Next.js** app extracted from PEBEC’s internal ops features:

| Feature | Description |
|---------|-------------|
| **Tasks** | Create, assign to multiple people, track status (`assigned` → `to_do` → `in_progress` → `done`) |
| **File inbox** | Upload files, then assign them when creating a task |
| **Calendar** | Personal calendar — your events + events you’re invited to |
| **Announcements** | Broadcast posts visible to all signed-in users |

## Differences from main PEBEC app

- **Any signed-in user can assign tasks** (not admin-only)
- **Personal calendar** instead of one shared team calendar
- Minimal UI — no MDA/SABER/reporting modules
- Separate Convex deployment and Clerk application

## Setup

### 1. Install dependencies

```bash
cd ops-workspace
npm install
```

### 2. Create a new Clerk application

1. Go to [clerk.com](https://clerk.com) → create a new application
2. Enable Email sign-in (or your preferred methods)
3. Copy **Publishable key** and **Secret key**

### 3. Create a new Convex project

```bash
npx convex dev
```

This will prompt you to log in and create a **new** Convex project (do not reuse the main PEBEC deployment).

### 4. Environment variables

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Convex (filled automatically by `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment
```

### 5. Run

Terminal 1 — Convex:

```bash
npx convex dev
```

Terminal 2 — Next.js (port 3001 to avoid clashing with main app):

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

**First user to sign up becomes `admin`.** Everyone else is `member`. Both roles can create tasks and announcements.

## Deploy to production

```bash
npx convex deploy
```

Set the same env vars in Vercel (or your host) for **Production**, then deploy the Next.js app.

## Folder structure

```
ops-workspace/
├── app/                 # Next.js pages
├── components/          # App shell
├── convex/              # Backend (schema, tasks, calendar, announcements, files)
├── lib/
└── README.md
```

## Clerk JWT for Convex (if auth fails)

In Clerk Dashboard → **JWT Templates** → create a **Convex** template (Convex docs walk through this). Link the template in the Convex dashboard under **Settings → Authentication → Clerk**.
