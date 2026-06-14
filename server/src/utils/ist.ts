const IST_TZ = "Asia/Kolkata";
export function formatDateTimeIst(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    dateStyle: "medium",
    timeStyle: "long",
  }).format(date);
}
export function istTimeZoneLabel(): string {
  return "Asia/Kolkata (IST)";
}
