import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EvidenceItem } from "@/lib/ingestion/types";

export type SaveEvidenceResult = {
  sourcesCreated: number;
  evidenceCreated: number;
  duplicateUrlsSkipped: number;
};

type SourceRecord = {
  id: string;
  url: string | null;
};

function normalizeItem(item: EvidenceItem): EvidenceItem {
  return {
    ...item,
    title: item.title.trim(),
    content: item.content.trim(),
    url: item.url?.trim() || undefined,
    author: item.author?.trim() || undefined
  };
}

/**
 * Persists evidence items and their sources. Items with a URL already present
 * in `sources` are skipped so repeated ingestion does not duplicate evidence.
 */
export async function saveEvidence(items: EvidenceItem[]): Promise<SaveEvidenceResult> {
  const uniqueItems: EvidenceItem[] = [];
  const seenUrls = new Set<string>();
  let duplicateUrlsSkipped = 0;

  for (const rawItem of items) {
    const item = normalizeItem(rawItem);
    if (!item.title || !item.content) throw new Error("Evidence items require a title and content.");
    if (item.url && seenUrls.has(item.url)) {
      duplicateUrlsSkipped += 1;
      continue;
    }
    if (item.url) seenUrls.add(item.url);
    uniqueItems.push(item);
  }

  if (uniqueItems.length === 0) {
    return { sourcesCreated: 0, evidenceCreated: 0, duplicateUrlsSkipped };
  }

  const supabase = await createClient();
  const urls = uniqueItems.flatMap((item) => item.url ? [item.url] : []);
  const sourceIdsByUrl = new Map<string, string>();

  if (urls.length > 0) {
    const { data: existingSources, error } = await supabase
      .from("sources")
      .select("id,url")
      .in("url", urls);
    if (error) throw new Error(`Unable to check existing evidence sources: ${error.message}`);

    for (const source of (existingSources ?? []) as SourceRecord[]) {
      if (source.url) sourceIdsByUrl.set(source.url, source.id);
    }
  }

  const itemsToSave = uniqueItems.filter((item) => {
    if (!item.url || !sourceIdsByUrl.has(item.url)) return true;
    duplicateUrlsSkipped += 1;
    return false;
  });

  if (itemsToSave.length === 0) {
    return { sourcesCreated: 0, evidenceCreated: 0, duplicateUrlsSkipped };
  }

  const sourceIdsByItem = new Map<EvidenceItem, string>();
  const itemsWithUrls = itemsToSave.filter((item) => item.url);
  let sourcesCreated = 0;

  if (itemsWithUrls.length > 0) {
    const { data: createdSources, error: sourceError } = await supabase
      .from("sources")
      .insert(itemsWithUrls.map((item) => ({
        type: item.sourceType,
        platform: item.platform,
        url: item.url
      })))
      .select("id,url");
    if (sourceError) throw new Error(`Unable to save evidence sources: ${sourceError.message}`);

    const createdSourceIds = new Map<string, string>();
    for (const source of (createdSources ?? []) as SourceRecord[]) {
      if (source.url) createdSourceIds.set(source.url, source.id);
    }
    for (const item of itemsWithUrls) {
      const sourceId = createdSourceIds.get(item.url!);
      if (!sourceId) throw new Error("A saved evidence source did not return an identifier.");
      sourceIdsByItem.set(item, sourceId);
    }
    sourcesCreated += createdSources?.length ?? 0;
  }

  for (const item of itemsToSave.filter((candidate) => !candidate.url)) {
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({ type: item.sourceType, platform: item.platform, url: null })
      .select("id")
      .single();
    if (sourceError) throw new Error(`Unable to save evidence sources: ${sourceError.message}`);
    sourceIdsByItem.set(item, source.id);
    sourcesCreated += 1;
  }

  const evidenceRows = itemsToSave.map((item) => {
    const sourceId = sourceIdsByItem.get(item);
    if (!sourceId) throw new Error("A saved evidence source did not return an identifier.");

    return {
      source_id: sourceId,
      title: item.title,
      content: item.content,
      author: item.author ?? null,
      engagement_score: item.engagementScore ?? 0,
      published_at: item.publishedAt?.toISOString() ?? null
    };
  });

  const { error: evidenceError } = await supabase.from("evidence").insert(evidenceRows);
  if (evidenceError) throw new Error(`Unable to save evidence: ${evidenceError.message}`);

  return {
    sourcesCreated,
    evidenceCreated: evidenceRows.length,
    duplicateUrlsSkipped
  };
}
