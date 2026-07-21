"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, Loader2, Send, Sparkles } from "lucide-react";

import { ScoutAvatar } from "@/components/scout-avatar";
import { ScoutConversationSidebar, type ScoutConversationListItem } from "@/components/scout-conversation-sidebar";
import { ScoutWorkspaceStatus, type ScoutWorkspaceStatusData } from "@/components/scout-workspace-status";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type WorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ScoutWorkspaceProps = {
  conversations: ScoutConversationListItem[];
  initialConversationId: string | null;
  initialConversationTitle: string;
  initialMessages: WorkspaceMessage[];
  conversationMessages: Record<string, WorkspaceMessage[]>;
  defaults: { industry: string; buyerType: string; geography: string };
  status: ScoutWorkspaceStatusData;
};

type ScoutChatResponse = {
  message?: string;
  action?: "research_started" | "conversation";
  scanId?: string;
  conversationId?: string;
  error?: { message?: string };
};

type ResearchStarted = { scanId: string };

const suggestions = [
  "Find overlooked problems in this market.",
  "What founder pain is repeating right now?",
  "Compare the strongest opportunities Scout has found."
];

export function ScoutWorkspace({
  conversations,
  initialConversationId,
  initialConversationTitle,
  initialMessages,
  conversationMessages,
  defaults,
  status
}: ScoutWorkspaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [conversationTitle, setConversationTitle] = useState(initialConversationTitle);
  const [messages, setMessages] = useState<WorkspaceMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [researchStarted, setResearchStarted] = useState<ResearchStarted | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, submitting, researchStarted]);

  function startNewConversation() {
    setConversationId(null);
    setConversationTitle("New conversation");
    setMessages([]);
    setPrompt("");
    setError(null);
    setResearchStarted(null);
  }

  function selectConversation(conversation: ScoutConversationListItem) {
    setConversationId(conversation.id);
    setConversationTitle(conversation.title);
    setMessages(conversationMessages[conversation.id] ?? []);
    setError(null);
    setResearchStarted(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(prompt);
  }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || submitting) return;

    const optimisticMessage: WorkspaceMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString()
    };
    setMessages((current) => [...current, optimisticMessage]);
    setPrompt("");
    setSubmitting(true);
    setError(null);
    setResearchStarted(null);
    setLastMessage(message);

    try {
      const response = await fetch("/api/v1/scout/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(conversationId ? { conversationId } : {}),
          filters: {
            industry: defaults.industry,
            buyer_type: defaults.buyerType,
            geography: defaults.geography,
            problem_hints: []
          }
        })
      });
      const data = await response.json().catch(() => null) as ScoutChatResponse | null;
      if (!response.ok) {
        setError(data?.error?.message ?? "Scout could not respond right now.");
        return;
      }

      const assistantMessage: WorkspaceMessage = {
        id: `scout-${Date.now()}`,
        role: "assistant",
        content: data?.message ?? "I am ready to help with your research.",
        createdAt: new Date().toISOString()
      };
      setMessages((current) => [...current, assistantMessage]);
      if (data?.conversationId) setConversationId(data.conversationId);
      if (data?.action === "research_started" && data.scanId) setResearchStarted({ scanId: data.scanId });
      if (conversationTitle === "New conversation") setConversationTitle(message.slice(0, 80));
    } catch {
      setError("Scout could not respond right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface/80 shadow-glow">
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[13.5rem_minmax(0,1fr)_17rem] xl:grid-cols-[14.5rem_minmax(0,1fr)_18rem]">
      <ScoutConversationSidebar
        conversations={conversations}
        selectedConversationId={conversationId}
        onNewConversation={startNewConversation}
        onSelectConversation={selectConversation}
      />

      <main className="flex min-h-[38rem] min-w-0 flex-col bg-gradient-to-b from-[#101923] to-surface">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.16em] text-brand">Scout conversation</p><h1 className="mt-1 truncate text-lg font-semibold">{conversationTitle}</h1></div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"><span className="size-1.5 rounded-full bg-brand" />Online</span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {messages.length === 0 ? <Welcome onSuggestion={setPrompt} /> : <div className="space-y-5">{messages.map((message) => <MessageBubble key={message.id} message={message} />)}</div>}

          {submitting ? <div className="mt-5 flex items-start gap-3"><ScoutAvatar size="sm" /><div className="rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 px-4 py-3 text-sm text-muted"><p>Scout is thinking through the next best move.</p><div className="mt-2"><TypingIndicator /></div></div></div> : null}

          {researchStarted ? <Card className="mt-5 max-w-xl border-brand/20 bg-brand/[0.06] p-4 transition-colors"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Sparkles className="size-4" /></span><div className="min-w-0"><p className="font-medium">Scout has started investigating.</p><p className="mt-1 text-sm text-muted">Research ID: {researchStarted.scanId}</p><p className="mt-1 text-xs text-muted">Status: queued · Evidence collection will begin shortly.</p><Link href={`/app/scans/${researchStarted.scanId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda]">Open Investigation <ArrowUpRight className="size-4" /></Link></div></div></Card> : null}

          {error ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><CircleAlert className="size-4 shrink-0" /><span className="flex-1">{error}</span>{lastMessage ? <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={() => void sendMessage(lastMessage)}>Retry</Button> : null}</div> : null}
          <div ref={messageEndRef} />
        </div>

        <form onSubmit={submit} className="border-t border-white/10 bg-[#0b1119]/70 p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-3">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand/40 hover:text-ink">{suggestion}</button>)}</div>
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/10">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} placeholder="Message Scout about a market, problem, or opportunity..." className="min-h-12 max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-muted/70" />
            <Button type="submit" size="sm" disabled={submitting || !prompt.trim()} aria-label="Send message to Scout">{submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
          </div>
        </form>
      </main>

      <ScoutWorkspaceStatus data={status} />
    </div>
  </div>;
}

function Welcome({ onSuggestion }: { onSuggestion: (value: string) => void }) {
  return <div className="mx-auto flex max-w-xl flex-col items-start pt-6 sm:pt-12"><ScoutAvatar size="lg" /><div className="mt-5 rounded-3xl rounded-tl-sm border border-white/10 bg-black/15 p-5 text-sm leading-7 text-muted"><p className="font-medium text-ink">I&apos;m here.</p><p className="mt-2">Tell me what you&apos;re curious about and I&apos;ll help you investigate founder conversations, market signals, and opportunity patterns.</p></div><div className="mt-6 grid w-full gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)} className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm text-muted transition-colors hover:border-brand/30 hover:bg-brand/[0.05] hover:text-ink">{suggestion}</button>)}</div></div>;
}

function MessageBubble({ message }: { message: WorkspaceMessage }) {
  if (message.role === "user") {
    return <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-brand/20 bg-brand/10 px-4 py-3 text-sm leading-6 text-ink transition-colors">{message.content}</div>;
  }

  return <div className="flex max-w-[90%] items-start gap-3"><ScoutAvatar size="sm" /><div className="rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-muted transition-colors">{message.content}</div></div>;
}
