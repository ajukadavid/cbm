import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export const metadata = {
  title: "City Boy Movement Portal",
  description:
    "Official member portal for the City Boy Movement — carrying forward President Tinubu's legacy of service, reform, and national renewal.",
};

export default async function HomePage() {
  const session = await auth();
  if (session.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-white">
      <Image
        src="/landing-bg.png"
        alt=""
        fill
        priority
        className="object-cover scale-105 blur-md"
        aria-hidden
      />
      <div className="absolute inset-0 bg-green-950/70" aria-hidden />

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xs">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Image
            src="/cityboy-logo.png"
            alt="City Boy Movement"
            width={140}
            height={80}
            className="h-14 w-auto object-contain drop-shadow-md"
            priority
          />
          <Link
            href="https://cbmnigeria.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-100 hover:text-white whitespace-nowrap transition-colors"
          >
            Main website →
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center">
        <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
          <p className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-green-100 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
            Continuing a Lasting Legacy
          </p>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto drop-shadow-sm">
            Carrying forward President Tinubu&apos;s vision for a renewed Nigeria
          </h1>

       

          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors shadow-lg">
                Sign in to portal
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-3 border border-red-300/80 text-white bg-red-600/80 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-lg backdrop-blur-sm">
                Request access
              </button>
            </SignUpButton>
          </div>

      
        </section>
      </main>
    </div>
  );
}
