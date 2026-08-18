"use client";

import * as React from "react";
import { Bot, CornerDownLeft, Loader2, Send, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Where does the checkout flow start?",
  "How is authentication wired up?",
  "Which files are most important?",
];

function cannedReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("checkout") || q.includes("payment") || q.includes("order")) {
    return "Checkout begins in app/(shop)/checkout/page.tsx. It submits to POST /api/checkout, which validates inventory, creates a Stripe payment intent via lib/stripe.ts, and records a PENDING order. The webhook at app/api/webhooks/stripe/route.ts confirms payment and moves the order to PAID.";
  }
  if (q.includes("auth") || q.includes("login") || q.includes("session") || q.includes("token")) {
    return "Authentication uses NextAuth v5 with JWT sessions. The session is available in server components through lib/auth.ts. The route handlers live under app/api/auth and the checkout flow calls requireUser() to protect pages.";
  }
  if (q.includes("file") || q.includes("important") || q.includes("where") || q.includes("start")) {
    return "Start with these 3 files:\n\n1. prisma/schema.prisma — the data model (users, products, orders, inventory)\n2. lib/stripe.ts — the payment client and helpers\n3. app/api/webhooks/stripe/route.ts — how payment events update order state";
  }
  return `Good question. Based on the mapped structure, ${question} touches the API layer and the service modules that own that responsibility. I can point you to the exact files — which module do you want to dig into?`;
}

export function ChatInterface({
  projectName,
  initialMessages,
}: {
  projectName: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput("");
    setPending(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: cannedReply(trimmed),
          timestamp: new Date().toISOString(),
        },
      ]);
      setPending(false);
    }, 1100);
  };

  return (
    <div className="flex h-[560px] flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Codebase Q&amp;A</p>
          <p className="truncate text-xs text-muted-foreground">{projectName}</p>
        </div>
        <span className="ml-auto rounded bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand">
          Preview
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
          >
            {message.role === "assistant" ? (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-brand text-brand-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-secondary">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn("max-w-[80%]", message.role === "user" && "text-right")}>
              <div
                className={cn(
                  "inline-block rounded-lg border px-3.5 py-2.5 text-left text-sm whitespace-pre-wrap",
                  message.role === "assistant"
                    ? "bg-background"
                    : "bg-brand text-brand-foreground"
                )}
              >
                {message.content}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatRelativeTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-brand text-brand-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
              Searching the codebase…
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => send(suggestion)}
              className="rounded border bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask anything about ${projectName}…`}
            className="flex-1"
          />
          <Button type="submit" variant="brand" className="gap-1.5" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </form>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <CornerDownLeft className="h-3 w-3" />
          Grounded-answer AI chat arrives in the next phase. This is a simulated preview.
        </p>
      </div>
    </div>
  );
}