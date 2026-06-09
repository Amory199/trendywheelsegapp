// Outbound WhatsApp templates for sales-agent follow-ups. Egyptian Arabic — the
// Egyptian sales team uses these verbatim, so keep the wording short and warm.

export const WA_GREETING_VERSION = "v1";

export function initialGreeting(name: string | null | undefined): string {
  const safeName = (name ?? "").trim() || "there";
  return [
    `أهلاً ${safeName}،`,
    "أنا من TrendyWheels. شكراً على تواصلك معنا — ممكن أعرف أكتر عن طلبك؟",
    "",
    `Hi ${safeName},`,
    "This is TrendyWheels. Thanks for reaching out — could you share a bit more about what you're looking for?",
  ].join("\n");
}

export function followUpAfterNoAnswer(name: string): string {
  return `أهلاً ${name}، حاولت أكلمك دلوقتي من TrendyWheels بخصوص استفسارك بس مكنش فيه رد. تقدر تقولي إمتى مناسب أكلمك؟`;
}

export function followUpReminder(name: string): string {
  return `أهلاً ${name}، فكرة بسيطة بخصوص استفسارك في TrendyWheels — لسه عندك اهتمام؟ لو حابب نكمل أبعتلك التفاصيل هنا.`;
}
