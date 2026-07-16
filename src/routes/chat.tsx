import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { askFoodQuestion } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

const SUGGESTIONS = [
  "What can I substitute for buttermilk?",
  "Is chicken thigh healthier than breast?",
  "How do I keep guacamole from browning?",
  "What pairs well with bunny chow?",
];

type Turn = { question: string; answer: string };

function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const { answer } = await askFoodQuestion({ data: { question: q.trim() } });
      setTurns((t) => [...t, { question: q.trim(), answer }]);
    } catch (err) {
      toast.error("Couldn't answer that", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-background">
          <MessageCircleQuestion className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl leading-tight">AI Chat</h1>
          <p className="text-sm text-muted-foreground">Ask anything about food.</p>
        </div>
      </div>

      <div className="mt-8 flex-1 space-y-6">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-card px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              {t.question}
            </p>
            <p className="mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm">
              {t.answer}
            </p>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="sticky bottom-24 mt-6 flex gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about an ingredient, recipe, or diet…"
          className="h-11 flex-1 rounded-full border-none bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" disabled={busy} className="h-11 w-11 rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" /> AI answers can be wrong — use judgment for allergies and safety.
      </p>
    </main>
  );
}
