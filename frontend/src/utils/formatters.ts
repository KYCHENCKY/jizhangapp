export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 19).replace("T", " ");
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
