import { toDateKey } from "./date";

export const buildCurrentWeek = (logs = [], anchorDate = new Date()) => {
  const today = anchorDate instanceof Date ? anchorDate : new Date(anchorDate);
  const weekday = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (weekday === 0 ? 6 : weekday - 1));

  const presentDateSet = new Set(logs.map((log) => log.date));
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayKey = toDateKey(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateStr = toDateKey(date);

    return {
      label: labels[index],
      date: date.getDate(),
      dateStr,
      present: presentDateSet.has(dateStr),
      isFuture: date > today,
      isToday: dateStr === todayKey,
    };
  });
};

export const calculateTodayEntries = (logs = [], dateKey = toDateKey(new Date())) =>
  logs.filter((log) => log.date === dateKey).length;
