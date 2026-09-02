/** Fixed display names for specific card last-4 / full numbers. */
export const CARD_ALIASES: Record<string, string> = {
  "6243": "Joni",
  "8414": "Admin Jenny",
};

export function cardLast4(card: string): string {
  const id = String(card || "");
  return id.length >= 4 ? id.slice(-4) : id;
}

/** Override holder when this card is in the alias map. */
export function cardHolder(card: string, fallback?: string | null): string {
  const last4 = cardLast4(card);
  return CARD_ALIASES[last4] || CARD_ALIASES[String(card || "")] || fallback || "";
}

export function formatCard(card: string, fallbackHolder?: string | null): string {
  const last4 = cardLast4(card);
  const name = cardHolder(card, fallbackHolder);
  return name ? `${card} · ${name}` : String(card);
}
