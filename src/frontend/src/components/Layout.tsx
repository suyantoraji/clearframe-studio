import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Clapperboard,
  History,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Projects", icon: LayoutGrid },
  { to: "/renders", label: "Render history", icon: History },
] as const;

interface LayoutProps {
  children: ReactNode;
}

/**
 * Application shell: a full-bleed signal-console header with the product name,
 * primary navigation, and the sign-in / sign-out control. The header sits on
 * `bg-card` with a hairline bottom border so it reads as a distinct zone from
 * the `bg-background` content area.
 */
export function Layout({ children }: LayoutProps) {
  const {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    principal,
    signIn,
    signOut,
  } = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card shadow-subtle">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 rounded-md outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="nav.brand_link"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Clapperboard className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate font-display text-sm font-semibold tracking-tight">
              video cleanup studio
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="ml-2 hidden items-center gap-1 sm:flex"
            data-ocid="nav.primary"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-ocid={`nav.${item.to === "/" ? "projects" : "renders"}_link`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {isAuthenticated && principal ? (
              <span
                className="hidden max-w-[12rem] truncate font-mono text-xs text-muted-foreground md:inline"
                title={principal}
                data-ocid="nav.principal"
              >
                {principal.slice(0, 5)}…{principal.slice(-3)}
              </span>
            ) : null}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={signOut}
                data-ocid="nav.sign_out_button"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={signIn}
                disabled={isInitializing || isLoggingIn}
                data-ocid="nav.sign_in_button"
              >
                {isInitializing || isLoggingIn ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="size-4" aria-hidden="true" />
                )}
                {isLoggingIn ? "Signing in…" : "Sign in"}
              </Button>
            )}
          </div>
        </div>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1 border-t border-border px-4 py-1.5 sm:hidden"
          data-ocid="nav.primary_mobile"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-ocid={`nav.mobile_${item.to === "/" ? "projects" : "renders"}_link`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 bg-background">{children}</main>

      <footer className="border-t border-border bg-card px-4 py-4 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window === "undefined" ? "" : window.location.hostname,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm underline-offset-4 transition-smooth hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            © {new Date().getFullYear()}. Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
