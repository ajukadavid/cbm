import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export const metadata = {
  title: "City Boy Movement Portal",
  description:
    "Official member portal for the City Boy Movement — tasks, announcements, and state coordination.",
};

export default async function HomePage() {
  const session = await auth();
  if (session.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-green-50/90 text-green-950">
      <header className="border-b border-green-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Image
            src="/cityboy-logo.png"
            alt="City Boy Movement"
            width={140}
            height={80}
            className="h-14 w-auto object-contain"
            priority
          />
          <Link
            href="https://www.cityboymovement.ng/index.php"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 hover:text-green-900 whitespace-nowrap"
          >
            Main website →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
          <p className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-green-800 bg-green-100 border border-green-200 rounded-full px-4 py-1.5 mb-8">
            A People-Driven Movement
          </p>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
            Building a nation that works for every citizen
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The City Boy Movement member portal — for leadership, state teams, and
            volunteers to coordinate tasks, announcements, and state submissions
            in one secure workspace.
          </p>

          <p className="mt-4 text-sm text-slate-500 max-w-xl mx-auto">
            We stand for accountable leadership, inclusive growth, and opportunities
            for all. Sign in to access your role-based dashboard.
          </p>

          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors">
                Sign in to portal
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-3 border border-red-300 text-red-800 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-colors">
                Request access
              </button>
            </SignUpButton>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            New accounts join as members until promoted by leadership.
          </p>
        </section>
      </main>
    </div>
  );
}
