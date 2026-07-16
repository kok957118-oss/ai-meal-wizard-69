import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  Ticket,
  Users,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import {
  adminDeletePromo,
  adminGrantPremium,
  adminIsAdmin,
  adminListPromos,
  adminListSubscribers,
  adminRevokePremium,
  adminSavePromo,
  adminStats,
} from "@/lib/premium.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MealMate" },
      { name: "description", content: "Manage MealMate Premium subscribers, promo codes, and revenue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: sessLoading } = useSession();
  const navigate = useNavigate();
  const { data: gate, isLoading: gateLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => adminIsAdmin(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!sessLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessLoading, user, navigate]);

  if (sessLoading || gateLoading) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!gate?.isAdmin) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <Crown className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have access to this dashboard.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl leading-tight">Premium Admin</h1>
          <p className="text-sm text-muted-foreground">Subscribers, revenue, promo codes.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subs">Subscribers</TabsTrigger>
          <TabsTrigger value="promos">Promos</TabsTrigger>
          <TabsTrigger value="grant">Grant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="subs" className="mt-4">
          <SubscribersTab />
        </TabsContent>
        <TabsContent value="promos" className="mt-4">
          <PromosTab />
        </TabsContent>
        <TabsContent value="grant" className="mt-4">
          <GrantTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats() });
  if (isLoading || !data) return <Loader2 className="h-5 w-5 animate-spin" />;
  const cards = [
    { label: "Active subscribers", value: data.active, icon: Sparkles },
    { label: "In trial", value: data.trialing, icon: Users },
    { label: "Lifetime members", value: data.lifetime, icon: Crown },
    { label: "Revenue (30d)", value: `$${data.revenue30.toFixed(2)}`, icon: DollarSign },
    { label: "Total referrals", value: data.referralsTotal, icon: Users },
    { label: "Referrals rewarded", value: data.referralsRewarded, icon: Ticket },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <c.icon className="h-4 w-4" />
          </span>
          <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
          <p className="font-display text-2xl leading-tight">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function SubscribersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: () => adminListSubscribers(),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const rows = data ?? [];

  function exportCsv() {
    const header = ["user_id", "display_name", "tier", "status", "store", "period_end", "trial_end", "is_manual"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.user_id,
          JSON.stringify(r.display_name ?? ""),
          r.tier,
          r.status,
          r.store ?? "",
          r.period_end ?? "",
          r.trial_end ?? "",
          r.is_manual,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mealmate-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} subscribers</p>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Tier</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Store</th>
              <th className="px-3 py-2 text-left">Ends</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/70">
                <td className="px-3 py-2">{r.display_name}</td>
                <td className="px-3 py-2 capitalize">{r.tier}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">{r.store ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.period_end ? new Date(r.period_end).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromosTab() {
  const qc = useQueryClient();
  const { data: promos, isLoading } = useQuery({
    queryKey: ["admin-promos"],
    queryFn: () => adminListPromos(),
  });
  const [editing, setEditing] = useState<null | {
    id?: string;
    code: string;
    reward_kind: "percent_discount" | "free_days" | "free_month" | "free_year" | "lifetime";
    reward_value: number;
    max_redemptions: number | null;
    expires_at: string | null;
    enabled: boolean;
    notes: string | null;
  }>(null);

  async function save() {
    if (!editing) return;
    try {
      await adminSavePromo({ data: editing });
      toast.success("Promo saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-promos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this promo code?")) return;
    await adminDeletePromo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-promos"] });
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              code: "",
              reward_kind: "free_days",
              reward_value: 7,
              max_redemptions: null,
              expires_at: null,
              enabled: true,
              notes: null,
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> New promo
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <ul className="space-y-2">
          {(promos ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-semibold">{p.code}</code>
                  {!p.enabled && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.reward_kind} · value {p.reward_value} · redeemed {p.redemption_count}
                  {p.max_redemptions ? `/${p.max_redemptions}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      code: p.code,
                      reward_kind: p.reward_kind,
                      reward_value: p.reward_value,
                      max_redemptions: p.max_redemptions,
                      expires_at: p.expires_at,
                      enabled: p.enabled,
                      notes: p.notes,
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
          {promos && promos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">No promo codes yet.</p>
          )}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h3 className="font-display text-xl">{editing.id ? "Edit promo" : "New promo"}</h3>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Code (e.g. WELCOME)"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                className="uppercase"
              />
              <Select
                value={editing.reward_kind}
                onValueChange={(v) => setEditing({ ...editing, reward_kind: v as typeof editing.reward_kind })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_days">Free days</SelectItem>
                  <SelectItem value="free_month">Free month</SelectItem>
                  <SelectItem value="free_year">Free year</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="percent_discount">Percent discount</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value (days or %)"
                value={editing.reward_value}
                onChange={(e) => setEditing({ ...editing, reward_value: Number(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Max redemptions (blank = unlimited)"
                value={editing.max_redemptions ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    max_redemptions: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm">Enabled</span>
                <Switch
                  checked={editing.enabled}
                  onCheckedChange={(v) => setEditing({ ...editing, enabled: v })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GrantTab() {
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState(30);
  const qc = useQueryClient();

  async function grant() {
    try {
      await adminGrantPremium({ data: { userId, days } });
      toast.success(`Granted ${days} days to user`);
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grant failed");
    }
  }
  async function revoke() {
    try {
      await adminRevokePremium({ data: { userId } });
      toast.success("Revoked Premium");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-display text-lg">Manual grant / revoke</h3>
      <Input
        placeholder="User ID (uuid)"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <Input
        type="number"
        placeholder="Days"
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      />
      <div className="flex gap-2">
        <Button onClick={grant} disabled={!userId}>Grant Premium</Button>
        <Button variant="secondary" onClick={revoke} disabled={!userId}>Revoke</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Find user IDs in the Subscribers tab.
      </p>

    </div>
  );
}
