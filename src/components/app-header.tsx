import { Link, useNavigate } from "@tanstack/react-router";
import logoAsset from "@/assets/mealmate-logo.png.asset.json";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Compact top bar used on every page except the home screen (which renders
 * its own greeting header). Keeps the brand mark + account menu, styled to
 * match the rounded, icon-forward look of the app shell.
 */
export function AppHeader() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="MealMate home">
          <img
            src={logoAsset.url}
            alt="MealMate logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-contain"
          />
          <span className="font-display text-2xl leading-none">MealMate</span>
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="rounded-full">
                {user.email?.split("@")[0] ?? "Account"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/planner" })}>
                Meal planner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/list" })}>
                Grocery list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" className="rounded-full" onClick={() => navigate({ to: "/auth" })}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
