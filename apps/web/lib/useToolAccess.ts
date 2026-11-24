"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchToolsStatus,
  consumeToolUse,
  executeToolCalculation,
  type ToolsStatusResponse,
} from "./api";

export function useToolAccess(toolKey: string) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ToolsStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchToolsStatus();
      setStatus(data);
    } catch (err) {
      console.error("[useToolAccess] Failed to load tools status", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadStatus();
    }
  }, [authLoading, user, loadStatus]);

  const verifyAndConsume = useCallback(async (): Promise<boolean> => {
    setAccessError(null);
    setLoginRequired(false);
    setQuotaExceeded(false);

    if (!user) {
      setLoginRequired(true);
      return false;
    }

    setCalculating(true);
    try {
      const res = await consumeToolUse(toolKey);
      if (res.allowed) {
        if (!res.isSubscriber && res.remaining !== undefined && res.remaining !== null) {
          setStatus((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              remainingToday: res.remaining ?? 0,
              usedToday: res.used ?? prev.usedToday + 1,
            };
          });
        }
        return true;
      } else {
        setQuotaExceeded(true);
        setAccessError(res.message || "You've reached your daily calculation limit.");
        return false;
      }
    } catch (error: any) {
      const status = error?.status;
      const message = error?.message || "";
      if (status === 401 || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("login")) {
        setLoginRequired(true);
      } else if (status === 429 || message.toLowerCase().includes("limit") || message.toLowerCase().includes("quota")) {
        setQuotaExceeded(true);
        setAccessError("You've reached your daily calculation limit.");
      } else {
        setAccessError(message || "An unexpected error occurred during calculation authorization.");
      }
      return false;
    } finally {
      setCalculating(false);
    }
  }, [user, toolKey]);

  const calculateAndConsume = useCallback(
    async <T = any>(payload: any): Promise<{ success: boolean; result?: T } | null> => {
      setAccessError(null);
      setLoginRequired(false);
      setQuotaExceeded(false);

      if (!user) {
        setLoginRequired(true);
        return null;
      }

      setCalculating(true);
      try {
        const res = await executeToolCalculation<T>(toolKey, payload);
        if (res.success) {
          if (!res.access.isSubscriber && res.access.remaining !== undefined && res.access.remaining !== null) {
            setStatus((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                remainingToday: res.access.remaining ?? 0,
                usedToday: res.access.used ?? prev.usedToday + 1,
              };
            });
          }
          return { success: true, result: res.result };
        }
        return null;
      } catch (error: any) {
        const status = error?.status;
        const message = error?.message || "";
        if (status === 401 || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("login")) {
          setLoginRequired(true);
        } else if (status === 429 || message.toLowerCase().includes("limit") || message.toLowerCase().includes("quota")) {
          setQuotaExceeded(true);
          setAccessError("You've reached your daily calculation limit.");
        } else {
          setAccessError(message || "An unexpected error occurred during calculation authorization.");
        }
        return null;
      } finally {
        setCalculating(false);
      }
    },
    [user, toolKey]
  );

  const clearAccessErrors = useCallback(() => {
    setAccessError(null);
    setLoginRequired(false);
    setQuotaExceeded(false);
  }, []);

  return {
    user,
    authLoading,
    status,
    statusLoading,
    calculating,
    loginRequired,
    quotaExceeded,
    accessError,
    verifyAndConsume,
    calculateAndConsume,
    clearAccessErrors,
    refreshStatus: loadStatus,
  };
}
