import { useEffect, useState } from 'react';
import { backend } from '@/integrations/api/backend';

export const useDeadline = () => {
  const [deadline, setDeadline] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    backend.getDeadline()
      .then((response) => {
        if (active) setDeadline(response.configured ? response.deadline : null);
      })
      .catch(() => {
        if (active) setDeadline(null);
      });

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const deadlineTime = deadline ? new Date(deadline).getTime() : null;
  const remainingMs = deadlineTime === null || Number.isNaN(deadlineTime)
    ? null
    : Math.max(0, deadlineTime - now);

  return {
    deadline,
    remainingMs,
    expired: remainingMs !== null && remainingMs <= 0,
  };
};

export const formatRemainingTime = (remainingMs: number | null) => {
  if (remainingMs === null) return 'No deadline set';
  if (remainingMs <= 0) return 'Deadline passed';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};