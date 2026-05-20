// Outbound WhatsApp templates for sales-agent follow-ups. Egyptian Arabic — the
// Egyptian sales team uses these verbatim, so keep the wording short and warm.

export function followUpAfterNoAnswer(name: string): string {
  return `أهلاً ${name}، حاولت أكلمك دلوقتي من TrendyWheels بخصوص استفسارك بس مكنش فيه رد. تقدر تقولي إمتى مناسب أكلمك؟`;
}

export function followUpReminder(name: string): string {
  return `أهلاً ${name}، فكرة بسيطة بخصوص استفسارك في TrendyWheels — لسه عندك اهتمام؟ لو حابب نكمل أبعتلك التفاصيل هنا.`;
}
