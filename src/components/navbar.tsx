'use client';

import { authClient } from "@/lib/auth-client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Home, LayoutDashboard, Users, Building2 } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Population', href: '/population', icon: Users },
  { name: 'Hospital', href: '/hospital', icon: Building2 },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const nextPath = pathname || "/";
  const signInHref = `/sign-in?next=${encodeURIComponent(nextPath)}`;

  const startSignIn = async () => {
    const errorUrl = new URL("/sign-in", window.location.origin);
    errorUrl.searchParams.set("error", "oauth");
    errorUrl.searchParams.set("next", nextPath);

    const res = await authClient.signIn.oauth2({
      providerId: "health-id",
      callbackURL: nextPath,
      errorCallbackURL: `${errorUrl.pathname}${errorUrl.search}`,
      newUserCallbackURL: nextPath,
    });

    const url = (res as any)?.data?.url;
    if (typeof url === "string" && url.length > 0) {
      window.location.href = url;
      return;
    }

    router.push(signInHref);
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/20">
                <span className="text-lg font-bold">N</span>
              </div>
              <span className="hidden text-xl font-bold tracking-tight text-foreground sm:block">
                NextApp
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted hover:bg-surface-highlight hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                    {item.name}
                  </Link>
                );
              })}
              <div className="ml-4 flex items-center gap-2">
                {!session ? (
                  <button
                    type="button"
                    onClick={startSignIn}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await authClient.signOut();
                      router.push(signInHref);
                      router.refresh();
                    }}
                    className="rounded-md bg-surface-highlight px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-highlight/80"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-surface-highlight hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3 bg-surface border-b border-border shadow-lg">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-surface-highlight hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted'}`} />
                {item.name}
              </Link>
            );
          })}
          {!session ? (
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await startSignIn();
              }}
              className="block rounded-md px-3 py-2 text-base font-medium bg-primary text-primary-foreground"
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await authClient.signOut();
                router.push(signInHref);
                router.refresh();
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-base font-medium bg-surface-highlight text-foreground"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
