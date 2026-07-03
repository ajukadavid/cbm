"use client";

import { useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Toaster } from "sonner";
import "./globals.css";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function UserSync({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    store().catch(console.error);
  }, [isLoading, isAuthenticated, store]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <UserSync>{children}</UserSync>
            <Toaster position="top-center" richColors />
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </body>
    </html>
  );
}
