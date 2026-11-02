export function toShamsiDateString(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function toShamsiShort(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getUpcomingDays(count = 7) {
  const days = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);

    const isoDate = d.toISOString().split("T")[0];
    const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(d);
    const dayMonth = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(d);

    days.push({
      isoDate,
      weekday,
      dayMonth,
      label: `${weekday} ${dayMonth}`,
    });
  }

  return days;
}
