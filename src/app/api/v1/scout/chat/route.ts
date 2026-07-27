import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/lib/errors";
import { createScoutBrainContext } from "@/lib/scout/brain";
import { handleScoutMessage } from "@/lib/scout/chat";
import {
  appendMessage,
  createConversation,
  getConversation,
  getRecentMessages,
  listConversations
} from "@/lib/scout/conversation";
import { startScoutResearch } from "@/lib/scout/research";
import { createClient } from "@/lib/supabase/server";

const scoutChatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  conversationId: z.string().uuid().optional(),
  filters: z.object({
    industry: z.string().min(2).max(80).optional(),
    buyer_type: z.string().min(2).max(80).optional(),
    geography: z.string().min(2).max(64).optional(),
    problem_hints: z.array(z.string().min(1).max(500)).max(3).optional()
  }).optional()
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Please send a valid message for Scout.");
  }

  const parsed = scoutChatSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "invalid_request", "Please provide a valid message for Scout.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return errorResponse(401, "unauthorized", "Sign in to continue.");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return errorResponse(409, "organization_missing", "Your workspace is not ready yet.", true);

  const filters = parsed.data.filters ?? {};
  let conversation;
  try {
    if (parsed.data.conversationId) {
      conversation = await getConversation({
        conversation_id: parsed.data.conversationId,
        organization_id: membership.organization_id,
        user_id: user.id
      });
      if (!conversation) return errorResponse(404, "conversation_not_found", "That Scout conversation could not be found.");
    } else {
      conversation = (await listConversations({
        organization_id: membership.organization_id,
        user_id: user.id,
        limit: 1
      }))[0] ?? await createConversation({
        organization_id: membership.organization_id,
        user_id: user.id,
        title: parsed.data.message.slice(0, 80)
      });
    }
  } catch {
    return errorResponse(500, "scout_conversation_failed", "Scout could not prepare your conversation.", true);
  }

  let recentMessages;
  try {
    recentMessages = await getRecentMessages({ conversation_id: conversation.id, limit: 15 });
  } catch {
    return errorResponse(500, "scout_history_failed", "Scout could not load your recent conversation.", true);
  }

  let context;
  try {
    context = await createScoutBrainContext({
      organization_id: membership.organization_id,
      filters
    });
  } catch {
    return errorResponse(500, "scout_context_failed", "Scout could not prepare your research context.", true);
  }

  const chat = handleScoutMessage({ context, message: parsed.data.message, recentMessages });
  let responseMessage = chat.response;
  let action: "research_started" | "conversation" = "conversation";
  let scanId: string | undefined;

  if (chat.shouldResearch) {
    try {
      const research = await startScoutResearch({
        organizationId: membership.organization_id,
        requestedBy: user.id,
        goal: parsed.data.message,
        filters
      });
      responseMessage = research.scoutMessage.content;
      action = "research_started";
      scanId = research.scanId;
    } catch {
      return errorResponse(500, "scout_research_failed", "Scout could not start that research brief.", true);
    }
  }

  try {
    await appendMessage({
      conversation_id: conversation.id,
      role: "user",
      content: parsed.data.message
    });
    await appendMessage({
      conversation_id: conversation.id,
      role: "assistant",
      content: responseMessage,
      metadata: { action, ...(scanId ? { scanId } : {}) }
    });
  } catch {
    return errorResponse(500, "scout_message_persist_failed", "Scout could not save this conversation.", true);
  }

  return NextResponse.json(
    {
      message: responseMessage,
      action,
      ...(scanId ? { scanId } : {}),
      conversationId: conversation.id
    },
    {
      status: action === "research_started" ? 202 : 200
    }
  );
}
