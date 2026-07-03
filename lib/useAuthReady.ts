"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Wait until Convex has validated the Clerk JWT and the user row exists. */
export function useAuthReady() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.current,
    !isLoading && isAuthenticated ? {} : "skip"
  );

  const hasUser = isAuthenticated && user != null;
  const isBootstrapping =
    isLoading || (isAuthenticated && user === undefined);

  const isPending = hasUser && user.status === "pending";
  // Account is usable once it exists and is not pending verification.
  const isReady = hasUser && !isPending;

  return {
    isLoading,
    isAuthenticated,
    isBootstrapping,
    isReady,
    isPending,
    user,
  };
}
