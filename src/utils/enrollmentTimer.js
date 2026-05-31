export function computeLiveTimeMs({ timeSpentMs = 0, timerStartedAt, status }) {
  let total = Number(timeSpentMs) || 0;
  if (status === 'in_progress' && timerStartedAt) {
    total += Date.now() - new Date(timerStartedAt).getTime();
  }
  return Math.max(0, total);
}

export function isTimerRunning({ status, timerStartedAt }) {
  return status === 'in_progress' && Boolean(timerStartedAt);
}
