import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Client-facing XP surface. All handlers delegate to the engine in
 * xp.server.ts using the service-role client (xp_events is write-locked
 * for end users by RLS, so XP writes must go through the server).
 */
export const getGamification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGamificationState } = await import("@/lib/xp.server");
    return getGamificationState(supabaseAdmin, context.userId);
  });

/**
 * Actions a client is allowed to self-report. Premium purchases are only
 * awarded by the billing webhook, never from the browser.
 */
const CLIENT_ACTIONS = ["recipe_cooked", "meal_planned", "grocery_completed"] as const;

export const awardXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        action: z.enum(CLIENT_ACTIONS),
        entityId: z.string().max(120).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { awardXpFor } = await import("@/lib/xp.server");
    return awardXpFor(supabaseAdmin, context.userId, data.action, {
      entityId: data.entityId,
    });
  });

export const claimElite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { claimEliteReward } = await import("@/lib/xp.server");
    return claimEliteReward(supabaseAdmin, context.userId);
  });
