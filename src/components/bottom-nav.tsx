import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Home, BookOpen, Calendar, ShoppingCart, BookMarked, Settings } from "lucide-react";

const TABS = [
  { to: "/", key: "home", icon: Home, exact: true },
  { to: "/recipes", key: "recipes", icon: BookOpen, exact: false },
  { to: "/planner", key: "planner", icon: Calendar, exact: false },
  { to: "/list", key: "grocery", icon: ShoppingCart, exact: false },
  { to: "/cookbook", key: "cookbook", icon: BookMarked, exact: false },
  { to: "/profile", key: "settings", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ to, key, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="md3-surface flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-muted-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span
                  className={`text-[10px] leading-none ${
                    isActive ? "font-semibold text-foreground" : "font-medium"
                  }`}
                >
                  {t(`nav.${key}`)}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
