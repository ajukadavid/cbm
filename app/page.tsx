import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default async function HomePage() {
  const session = await auth();
  if (session.userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Ops Workspace</h1>
        <p className="text-slate-600 text-lg">
          Tasks, file assignment, personal calendars, and team announcements —
          standalone workspace powered by Convex & Clerk.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <SignInButton mode="modal">
            <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-5 py-2.5 border border-slate-300 rounded-lg font-medium hover:bg-white">
              Create account
            </button>
          </SignUpButton>
        </div>
        <p className="text-sm text-slate-500">
          First user to sign up becomes admin automatically.
        </p>
      </div>
    </main>
  );
}
