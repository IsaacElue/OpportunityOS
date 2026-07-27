"use client";

import { MessageCircle, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ScoutAvatar } from "@/components/scout-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScoutConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string | null;
};

type ScoutConversationSidebarProps = {
  conversations: ScoutConversationListItem[];
  selectedConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conversation: ScoutConversationListItem) => void;
  disabled?: boolean;
};

export function ScoutConversationSidebar({
  conversations,
  selectedConversationId,
  onNewConversation,
  onSelectConversation,
  disabled = false
}: ScoutConversationSidebarProps) {
  const [search, setSearch] = useState("");
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => `${conversation.title} ${conversation.preview ?? ""}`.toLowerCase().includes(query));
  }, [conversations, search]);

  return <aside className="flex min-h-[18rem] flex-col border-b border-white/10 bg-[#0b1119]/80 p-4 lg:min-h-0 lg:border-b-0 lg:border-r">
    <div className="flex items-center gap-3 px-1">
      <ScoutAvatar size="md" />
      <div>
        <p className="text-sm font-semibold">Scout</p>
        <p className="text-xs text-brand">Your research teammate</p>
      </div>
    </div>

    <Button className="mt-6 w-full justify-start" variant="secondary" size="sm" onClick={onNewConversation} disabled={disabled}>
      <Plus className="size-4" />New conversation
    </Button>

    <div className="mt-6 min-h-0 flex-1">
      <div className="flex items-center justify-between gap-2 px-1"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Conversations</p><span className="text-xs text-muted/70">{conversations.length}</span></div>
      <label className="relative mt-3 block"><span className="sr-only">Search conversations</span><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} disabled={disabled} placeholder="Search conversations" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-ink outline-none placeholder:text-muted/70 focus:border-brand/60 focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60" /></label>
      <div className="mt-3 space-y-1 overflow-y-auto pr-1">
        {filteredConversations.length > 0 ? filteredConversations.map((conversation) => <button
          key={conversation.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelectConversation(conversation)}
          className={cn(
            "group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60",
            selectedConversationId === conversation.id
              ? "bg-brand/10 text-ink"
              : "text-muted hover:bg-white/[0.05] hover:text-ink"
          )}
        >
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand/80" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{conversation.title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{conversation.preview ?? "No messages yet"}</span>
            <span className="mt-1 block text-xs text-muted/70">{formatUpdatedAt(conversation.updatedAt)}</span>
          </span>
        </button>) : <p className="px-3 py-4 text-sm leading-6 text-muted">{search.trim() ? "No conversations match that search." : "Your conversations with Scout will appear here."}</p>}
      </div>
    </div>
  </aside>;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
