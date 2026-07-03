"use client";

import { useEffect, useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Toaster } from "sonner";
import "./globals.css";

function UserSync({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    store().catch(console.error);
  }, [isLoading, isAuthenticated, store]);

  return <>{children}</>;
}

function MissingConvexConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Convex not configured</h1>
        <p className="text-sm text-slate-600">
          Set <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> in
          your environment (Vercel → Project → Settings → Environment Variables).
        </p>
        <p className="text-sm text-slate-600">
          Run <code className="bg-slate-100 px-1 rounded">npx convex dev</code> locally to
          populate <code className="bg-slate-100 px-1 rounded">.env.local</code>.
        </p>
      </div>
    </div>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl]
  );

  if (!convex) {
    return <MissingConvexConfig />;
  }

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync>{children}</UserSync>
        <Toaster position="top-center" richColors />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
