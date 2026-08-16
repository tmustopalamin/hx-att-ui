"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_PROBE_LOCK_NAME = "attendance-hx:guest-session-probe";
const SESSION_PROBE_STORAGE_KEY = `${SESSION_PROBE_LOCK_NAME}:fallback`;
const SESSION_PROBE_LOCK_TTL_MS = 30_000;
const SESSION_PROBE_RETRY_MS = 50;

type FallbackLock = {
  owner: string;
  expiresAt: number;
};

const waitForRetry = (signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, SESSION_PROBE_RETRY_MS);
    signal.addEventListener("abort", finish, { once: true });
  });

const readFallbackLock = (storage: Storage): FallbackLock | null => {
  const value = storage.getItem(SESSION_PROBE_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    const lock = JSON.parse(value) as Partial<FallbackLock>;
    if (typeof lock.owner === "string" && typeof lock.expiresAt === "number") {
      return lock as FallbackLock;
    }
  } catch {
    // Replace malformed lock data below.
  }

  return null;
};

async function withFallbackLock<T>(
  signal: AbortSignal,
  callback: () => Promise<T>,
): Promise<T> {
  let storage: Storage;

  try {
    storage = window.localStorage;
    storage.getItem(SESSION_PROBE_STORAGE_KEY);
  } catch {
    return callback();
  }

  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const lockValue = JSON.stringify({
    owner,
    expiresAt: Date.now() + SESSION_PROBE_LOCK_TTL_MS,
  });

  while (!signal.aborted) {
    const currentLock = readFallbackLock(storage);
    if (!currentLock || currentLock.expiresAt <= Date.now()) {
      try {
        storage.setItem(SESSION_PROBE_STORAGE_KEY, lockValue);
        if (storage.getItem(SESSION_PROBE_STORAGE_KEY) === lockValue) {
          break;
        }
      } catch {
        return callback();
      }
    }

    await waitForRetry(signal);
  }

  if (signal.aborted) {
    return callback();
  }

  try {
    return await callback();
  } finally {
    try {
      if (storage.getItem(SESSION_PROBE_STORAGE_KEY) === lockValue) {
        storage.removeItem(SESSION_PROBE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage cleanup failures; the lease will expire.
    }
  }
}

const fetchSession = (signal: AbortSignal) =>
  fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
    signal,
  });

const fetchSessionWithLock = (signal: AbortSignal) => {
  const lockManager =
    typeof navigator !== "undefined" ? navigator.locks : undefined;

  if (lockManager) {
    return lockManager.request(
      SESSION_PROBE_LOCK_NAME,
      { mode: "exclusive", signal },
      () => fetchSession(signal),
    );
  }

  return withFallbackLock(signal, () => fetchSession(signal));
};

const GuestRouteGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const checkSession = async () => {
      try {
        const response = await fetchSessionWithLock(controller.signal);

        if (response.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }

      if (!controller.signal.aborted) {
        setCheckingSession(false);
      }
    };

    void checkSession();

    return () => controller.abort();
  }, [router]);

  if (checkingSession) {
    return null;
  }

  return <>{children}</>;
};

export default GuestRouteGuard;
