/* Apify output mappers — Sprint η
 * Converte items de dataset Apify para shape de system.inbox_items
 *
 * Cada mapper devolve um array de inbox_item drafts:
 *   { title, body, kind, vertical, source_url, source_name, payload }
 *
 * vertical é injectada externamente pelo caller a partir da source.
 */

export interface InboxDraft {
  title: string
  body: string | null
  kind: string
  source: string
  source_url: string | null
  source_name: string | null
  payload: Record<string, unknown>
  actions: string[]
  expandable: boolean
  status: string
}

function safeTrim(s: unknown, max = 200): string {
  if (typeof s !== "string") return ""
  return s.trim().slice(0, max)
}

// ─── instagram_post (apify/instagram-scraper) ─────────────────
export function mapInstagramPost(item: Record<string, unknown>): InboxDraft | null {
  const url = item.url as string | undefined
  if (!url) return null
  const username = (item.ownerUsername as string) || (item.username as string) || "unknown"
  const caption = (item.caption as string) || (item.text as string) || ""
  const imageUrl = (item.displayUrl as string) || (item.thumbnailUrl as string) || (item.images as string[] | undefined)?.[0]
  const likes = item.likesCount as number | undefined
  const replies = item.commentsCount as number | undefined
  const timestamp = (item.timestamp as string) || (item.takenAtTimestamp as string)

  return {
    title: `@${username} — ${safeTrim(caption.split("\n")[0], 80) || "post"}`,
    body: safeTrim(caption, 240),
    kind: "instagram",
    source: "watcher",
    source_url: url,
    source_name: `@${username}`,
    payload: {
      caption,
      author: `@${username}`,
      platform: "instagram",
      image_url: imageUrl,
      published_at: timestamp,
      engagement: { likes, replies },
    },
    actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
    expandable: true,
    status: "active",
  }
}

// ─── twitter_post (apidojo/twitter-scraper) ───────────────────
export function mapTwitterPost(item: Record<string, unknown>): InboxDraft | null {
  const url = (item.url as string) || (item.twitterUrl as string)
  if (!url) return null
  const author = (item.author as Record<string, unknown> | undefined)?.userName
              || (item.user as Record<string, unknown> | undefined)?.screen_name
              || (item.username as string)
              || "unknown"
  const text = (item.text as string) || (item.full_text as string) || ""
  const imageUrl = (item.media as Array<Record<string, unknown>> | undefined)?.[0]?.media_url_https as string
                || (item.images as string[] | undefined)?.[0]
  const likes = item.likeCount as number | undefined
  const replies = item.replyCount as number | undefined
  const retweets = item.retweetCount as number | undefined
  const timestamp = (item.createdAt as string) || (item.created_at as string)

  return {
    title: `@${author} — ${safeTrim(text.split("\n")[0], 80) || "tweet"}`,
    body: safeTrim(text, 240),
    kind: "instagram",  // mesmo visual; payload.platform='x' distingue
    source: "watcher",
    source_url: url,
    source_name: `@${author}`,
    payload: {
      caption: text,
      author: `@${author}`,
      platform: "x",
      image_url: imageUrl,
      published_at: timestamp,
      engagement: { likes, replies, retweets },
    },
    actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
    expandable: true,
    status: "active",
  }
}

// ─── linkedin_post (apify/linkedin-profile-scraper) ───────────
export function mapLinkedInPost(item: Record<string, unknown>): InboxDraft | null {
  const url = (item.url as string) || (item.shareUrl as string) || (item.postUrl as string)
  if (!url) return null
  const author = (item.actor as Record<string, unknown> | undefined)?.name
              || (item.authorName as string)
              || (item.fullName as string)
              || "LinkedIn"
  const text = (item.text as string) || (item.content as string) || (item.commentary as string) || ""
  const imageUrl = (item.image as string) || (item.images as string[] | undefined)?.[0]
  const likes = item.numLikes as number | undefined
  const comments = item.numComments as number | undefined
  const timestamp = (item.postedAt as string) || (item.createdAt as string)

  return {
    title: `${author} — ${safeTrim(text.split("\n")[0], 80) || "post"}`,
    body: safeTrim(text, 240),
    kind: "instagram",  // visual uniforme; payload.platform='linkedin' distingue
    source: "watcher",
    source_url: url,
    source_name: author as string,
    payload: {
      caption: text,
      author: author as string,
      platform: "linkedin",
      image_url: imageUrl,
      published_at: timestamp,
      engagement: { likes, replies: comments },
    },
    actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
    expandable: true,
    status: "active",
  }
}

// ─── page_content (apify/web-scraper / mtrunkat/page-content-scraper) ───
export function mapPageContent(item: Record<string, unknown>): InboxDraft | null {
  const url = (item.url as string) || (item.loadedUrl as string)
  if (!url) return null
  const title = safeTrim(item.title, 200) || safeTrim(item.pageTitle, 200) || "Página"
  const description = safeTrim(item.description, 400) || safeTrim(item.metaDescription, 400)
  const h1 = safeTrim(item.h1, 200)
  const text = safeTrim(item.text, 800) || safeTrim(item.content, 800) || safeTrim(item.bodyText, 800)
  const imageUrl = (item.image as string) || (item.ogImage as string)

  return {
    title: safeTrim(title, 200),
    body: safeTrim(description || h1 || text, 240),
    kind: "competitor",
    source: "watcher",
    source_url: url,
    source_name: new URL(url).hostname,
    payload: {
      title,
      h1,
      description,
      body_excerpt: text,
      image_url: imageUrl,
      summary_md: description || text,
    },
    actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
    expandable: true,
    status: "active",
  }
}

// ─── Dispatcher ───────────────────────────────────────────────
export function mapApifyItem(item: Record<string, unknown>, mapperKey: string): InboxDraft | null {
  switch (mapperKey) {
    case "instagram_post":  return mapInstagramPost(item)
    case "twitter_post":    return mapTwitterPost(item)
    case "linkedin_post":   return mapLinkedInPost(item)
    case "page_content":    return mapPageContent(item)
    default:
      console.warn(`[apify-mappers] unknown mapperKey: ${mapperKey}`)
      return null
  }
}

// Lista de actors pre-conhecidos (UI usa para autocomplete)
export const APIFY_ACTOR_PRESETS = [
  {
    actor_id: "apify/instagram-scraper",
    label: "Instagram — posts por handle",
    platform: "instagram",
    output_mapper: "instagram_post",
    input_template: { username: ["handle1", "handle2"], resultsLimit: 5 },
    cost_estimate_usd: 0.02,
  },
  {
    actor_id: "apidojo/twitter-scraper",
    label: "X / Twitter — tweets por handle",
    platform: "x",
    output_mapper: "twitter_post",
    input_template: { handle: "elonmusk", tweetsDesired: 10 },
    cost_estimate_usd: 0.02,
  },
  {
    actor_id: "apify/linkedin-profile-scraper",
    label: "LinkedIn — posts de perfil",
    platform: "linkedin",
    output_mapper: "linkedin_post",
    input_template: { profileUrls: ["https://linkedin.com/in/example"] },
    cost_estimate_usd: 0.10,
  },
  {
    actor_id: "apify/web-scraper",
    label: "Web — site concorrente genérico",
    platform: "web",
    output_mapper: "page_content",
    input_template: { startUrls: [{ url: "https://example.com" }] },
    cost_estimate_usd: 0.01,
  },
]
