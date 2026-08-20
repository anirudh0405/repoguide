"use client";

import * as React from "react";
import { Bot, BrainCircuit, Loader2, MessageSquare, Plus, RefreshCw, Send, Sparkles, User } from "lucide-react";

import { ChatMarkdown } from "@/components/project/chat-markdown";
import { FileViewerDialog } from "@/components/project/file-viewer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type IndexStatus = "INDEXING" | "COMPLETED" | "FAILED" | "EMPTY";

interface IndexInfo {
  status: IndexStatus;
  step: string | null;
  error: string | null;
  chunkCount: number;
  model: string | null;
  commitSha: string | null;
  updatedAt: string;
}

interface SessionSummary {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[] | null;
}

interface InitialData {
  project: { id: string; name: string };
  analysis: { id: string; status: string; commitSha: string | null } | null;
  index: IndexInfo | null;
  configured: boolean;
  sessions: SessionSummary[];
}

const SUGGESTED_QUESTIONS = [
  "Where does authentication happen?",
  "What is the main entry point?",
  "How does the database work?",
  "Explain the payment flow.",
  "Which files should I read first?",
];

const INDEX_STEPS: Record<string, string> = {
  download: "Downloading the analyzed commit",
  chunk: "Splitting code into meaningful chunks",
  embed: "Generating embeddings",
  store: "Storing chunks in the index",
};

function isIndexing(index: IndexInfo | null): boolean {
  return index?.status === "INDEXING";
}

export function ChatView({ projectId, initial }: { projectId: string; initial: InitialData }) {
  const [sessions, setSessions] = React.useState<SessionSummary[]>(initial.sessions);
  const [index, setIndex] = React.useState<IndexInfo | null>(initial.index);
  const [configured, setConfigured] = React.useState(initial.configured);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [loadingSession, setLoadingSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [startingIndex, setStartingIndex] = React.useState(false);

  const refreshMeta = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as InitialData;
      setIndex(body.index);
      setConfigured(body.configured);
      setSessions(body.sessions);
    } catch {
      // Transient failure — keep current state.
    }
  }, [projectId]);

  // Poll while indexing so the UI flips to chat on its own.
  React.useEffect(() => {
    if (!isIndexing(index)) return;
    const timer = window.setInterval(() => void refreshMeta(), 3000);
    return () => window.clearInterval(timer);
  }, [index, refreshMeta]);

  const loadSession = React.useCallback(
    async (sessionId: string) => {
      setLoadingSession(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/chat/${sessionId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setError("Could not load this conversation.");
          return;
        }
        const body = (await response.json()) as { messages: Message[] };
        setMessages(body.messages);
        setActiveSessionId(sessionId);
      } catch {
        setError("Could not load this conversation.");
      } finally {
        setLoadingSession(false);
      }
    },
    [projectId]
  );

  const startNew = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  };

  const handleIndex = async () => {
    if (startingIndex) return;
    setStartingIndex(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/index`, { method: "POST" });
      const body = (await response.json()) as InitialData & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not start indexing.");
        return;
      }
      await refreshMeta();
    } catch {
      setError("Could not start indexing.");
    } finally {
      setStartingIndex(false);
    }
  };

  const send = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question || streaming) return;

    setInput("");
    setError(null);
    const userMessage: Message = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: question,
      sources: null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);

    const streamingMessage: Message = {
      id: `local-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      sources: null,
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId ?? undefined, question }),
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not start the answer.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resolvedSessionId = activeSessionId;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const event = parseEvent(raw);
          if (!event) continue;
          if (event.event === "token") {
            const delta = (event.data as { delta?: string }).delta ?? "";
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + delta };
              }
              return next;
            });
          } else if (event.event === "done") {
            const data = event.data as {
              sessionId: string;
              sources: string[];
            };
            resolvedSessionId = data.sessionId;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, sources: data.sources };
              }
              return next;
            });
            setActiveSessionId(data.sessionId);
            void refreshMeta();
          } else if (event.event === "error") {
            throw new Error((event.data as { error?: string }).error ?? "The AI could not answer.");
          }
        }
      }

      if (!resolvedSessionId) {
        throw new Error("The answer ended unexpectedly.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not answer that question.");
      setMessages((prev) => prev.slice(0, -1));
      setMessages((prev) => [...prev, userMessage]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Sessions */}
      <aside className="order-2 lg:order-1">
        <Card className="lg:sticky lg:top-6">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conversations
              </p>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={startNew}>
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
            {sessions.length === 0 && (
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                No conversations yet. Ask your first question.
              </p>
            )}
            <div className="flex flex-col gap-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => void loadSession(session.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    activeSessionId === session.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{session.title ?? "New conversation"}</span>
                    <span className="block text-xs text-muted-foreground/70">
                      {session.messageCount} messages
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Chat area */}
      <div className="order-1 lg:order-2">
        {!configured ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
                AI chat is not configured
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Add NVIDIA_API_KEY to the server environment to enable codebase Q&amp;A.
              </p>
            </CardContent>
          </Card>
        ) : !index ? (
          <IndexPromptCard onIndex={handleIndex} busy={startingIndex} error={error} />
        ) : index.status === "INDEXING" ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                  Indexing this repository
                </h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {INDEX_STEPS[index.step ?? "download"] ?? "Preparing the index"} — questions will be
                answered from real code.
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                This usually takes under a minute and runs in the background. This page updates
                automatically.
              </p>
            </CardContent>
          </Card>
        ) : index.status === "FAILED" ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
                Indexing failed
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {index.error ?? "Something went wrong while indexing this repository."}
              </p>
              <Button className="mt-6 gap-2" onClick={handleIndex} disabled={startingIndex}>
                {startingIndex ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : index.status === "EMPTY" ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
                Nothing to index
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                No source files could be embedded for this repository.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ChatCard
            projectId={projectId}
            messages={messages}
            streaming={streaming}
            loadingSession={loadingSession}
            error={error}
            input={input}
            setInput={setInput}
            onSend={() => void send()}
            onSuggested={(question) => void send(question)}
            model={index.model}
            chunkCount={index.chunkCount}
          />
        )}
      </div>
    </div>
  );
}

function IndexPromptCard({
  onIndex,
  busy,
  error,
}: {
  onIndex: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-muted text-brand">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
          Index this repository to enable Q&amp;A
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          RepoGuide reads the analyzed code, splits it into meaningful chunks, and embeds them so
          answers come from actual files — never guesses.
        </p>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <Button className="mt-6 gap-2" onClick={onIndex} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Index this repository
        </Button>
      </CardContent>
    </Card>
  );
}

function ChatCard({
  projectId,
  messages,
  streaming,
  loadingSession,
  error,
  input,
  setInput,
  onSend,
  onSuggested,
  model,
  chunkCount,
}: {
  projectId: string;
  messages: Message[];
  streaming: boolean;
  loadingSession: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onSuggested: (question: string) => void;
  model: string | null;
  chunkCount: number;
}) {
  const empty = messages.length === 0;
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="flex min-h-[70vh] flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-0">
        <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          {loadingSession ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading conversation…
            </div>
          ) : empty ? (
            <WelcomePane onSuggested={onSuggested} model={model} chunkCount={chunkCount} />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex items-start justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-sm text-brand-foreground">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {message.content ? (
                        <div className="rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
                          <ChatMarkdown text={message.content} />
                          {streaming && message.content.length === 0 && (
                            <span className="inline-block h-4 w-2 animate-pulse bg-brand" />
                          )}
                        </div>
                      ) : streaming ? (
                        <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Thinking…
                        </div>
                      ) : null}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 px-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Sources
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {message.sources.map((path) => (
                              <FileViewerDialog key={path} projectId={projectId} path={path}>
                                <span className="font-mono text-xs underline decoration-brand/40 underline-offset-2">
                                  {path}
                                </span>
                              </FileViewerDialog>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="border-t p-3 sm:p-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSend();
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about this codebase…"
              className="min-h-10 max-h-40 flex-1 resize-none"
              rows={1}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              disabled={streaming}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={streaming || input.trim().length === 0}
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Answers are grounded in this repository&apos;s code. Click any source to open the file.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function WelcomePane({
  onSuggested,
  model,
  chunkCount,
}: {
  onSuggested: (question: string) => void;
  model: string | null;
  chunkCount: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
        <Sparkles className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Ask about this codebase
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {chunkCount > 0
            ? `The index contains ${chunkCount.toLocaleString()} code chunks, so answers come straight from the source.`
            : "Ask a question and get an answer backed by the actual source code."}
          {model ? ` · ${model}` : ""}
        </p>
      </div>
      <div className="flex max-w-lg flex-wrap items-center justify-center gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            onClick={() => onSuggested(question)}
            className="rounded-full border bg-muted/30 px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-brand/40 hover:text-brand"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

function parseEvent(raw: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}