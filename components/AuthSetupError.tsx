export default function AuthSetupError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Clerk → Convex auth not configured</h1>
        <p className="text-sm text-slate-600">
          You are signed in to Clerk, but Convex cannot validate your session token.
          Protected queries will fail with &ldquo;Not authenticated&rdquo; until this is fixed.
        </p>
        <ol className="text-sm text-slate-700 list-decimal list-inside space-y-2">
          <li>
            In Clerk → <strong>JWT Templates</strong>, create a template named{" "}
            <code className="bg-slate-100 px-1 rounded">convex</code> (use the Convex preset).
          </li>
          <li>
            Copy the template <strong>Issuer</strong> URL and set{" "}
            <code className="bg-slate-100 px-1 rounded">CLERK_JWT_ISSUER_DOMAIN</code> in the
            Convex Dashboard → Settings → Environment Variables.
          </li>
          <li>
            Run <code className="bg-slate-100 px-1 rounded">npx convex dev</code> to sync{" "}
            <code className="bg-slate-100 px-1 rounded">convex/auth.config.ts</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
