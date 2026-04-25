export const pad2 = (num) => String(num).padStart(2, "0");

export const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateVerbose = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export const formatTime24 = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const formatTime12 = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const parseDateAndTime = (dateKey, time24) => {
  if (!dateKey || !time24) {
    return null;
  }
  return new Date(`${dateKey}T${time24}:00`);
};

export const formatDurationFromMinutes = (totalMinutes) => {
  const minutes = Number.isFinite(totalMinutes) ? Math.max(totalMinutes, 0) : 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const parseDurationToMinutes = (duration) => {
  if (!duration) {
    return 0;
  }
  const parts = String(duration).match(/(\d+)h\s+(\d+)m/);
  if (!parts) {
    return 0;
  }
  return Number(parts[1]) * 60 + Number(parts[2]);
};
