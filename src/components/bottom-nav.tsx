import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, CalendarDays, User } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { cn } from "@/lib/utils";

/**
 * MealMate 2.0 shell: 4 primary tabs with a raised mascot FAB in the
 * centre that opens the AI companion from anywhere in the app.
 */
const LEFT_TABS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/restaurants", icon: UtensilsCrossed, label: "Dining" },
] as const;

const RIGHT_TABS = [
  { to: "/planner", icon: CalendarDays, label: "Planner" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

function Tab({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-2">
        {LEFT_TABS.map((t) => (
          <Tab key={t.to} {...t} active={isActive(t.to)} />
        ))}
        <Link
          to="/chat"
          aria-label="Ask the AI chef"
          className="mx-auto -mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-lg ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
        >
          <Mascot size={36} />
        </Link>
        {RIGHT_TABS.map((t) => (
          <Tab key={t.to} {...t} active={isActive(t.to)} />
        ))}
      </div>
    </nav>
  );
}
