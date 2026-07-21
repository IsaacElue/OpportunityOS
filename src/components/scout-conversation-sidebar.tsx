"use client";

import { MessageCircle, Plus } from "lucide-react";

import { ScoutAvatar } from "@/components/scout-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScoutConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

type ScoutConversationSidebarProps = {
  conversations: ScoutConversationListItem[];
  selectedConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conversation: ScoutConversationListItem) => void;
};

export function ScoutConversationSidebar({
  conversations,
  selectedConversationId,
  onNewConversation,
  onSelectConversation
}: ScoutConversationSidebarProps) {
  return <aside className="flex min-h-[18rem] flex-col border-b border-white/10 bg-[#0b1119]/80 p-4 lg:min-h-0 lg:border-b-0 lg:border-r">
    <div className="flex items-center gap-3 px-1">
      <ScoutAvatar size="md" />
      <div>
        <p className="text-sm font-semibold">Scout</p>
        <p className="text-xs text-brand">Your research teammate</p>
      </div>
    </div>

    <Button className="mt-6 w-full justify-start" variant="secondary" size="sm" onClick={onNewConversation}>
      <Plus className="size-4" />New conversation
    </Button>

    <div className="mt-6 min-h-0 flex-1">
      <p className="px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">Conversations</p>
      <div className="mt-3 space-y-1 overflow-y-auto pr-1">
        {conversations.length > 0 ? conversations.map((conversation) => <button
          key={conversation.id}
          type="button"
          onClick={() => onSelectConversation(conversation)}
          className={cn(
            "group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
            selectedConversationId === conversation.id
              ? "bg-brand/10 text-ink"
              : "text-muted hover:bg-white/[0.05] hover:text-ink"
          )}
        >
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand/80" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{conversation.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{formatUpdatedAt(conversation.updatedAt)}</span>
          </span>
        </button>) : <p className="px-3 py-4 text-sm leading-6 text-muted">Your conversations with Scout will appear here.</p>}
      </div>
    </div>
  </aside>;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
