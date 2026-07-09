import { AppConfig } from "@/config/app.config";
import { useEffect } from "react";

export type SyncJobUpdatedEvent = {
  id: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  message?: string;
};

export type SyncJobProgressEvent = {
  id: number;
  status: "RUNNING";
  offset: number;
  fetched: number;
  inserted: number;
  updated: number;
  failed: number;
  total_available: number;
};

type UseSyncJobEventsOptions = {
  onJobUpdated?: (event: SyncJobUpdatedEvent) => void;
  onJobProgress?: (event: SyncJobProgressEvent) => void;
};

export function useSyncJobEvents({
  onJobUpdated,
  onJobProgress,
}: UseSyncJobEventsOptions) {
  useEffect(() => {
    const eventSource = new EventSource(
      `${AppConfig.API_BASE_URL}/api/sync-jobs/events`
    );

    eventSource.addEventListener("connected", (event) => {
      console.log("SSE connected", (event as MessageEvent).data);
    });

    eventSource.addEventListener("sync_job_updated", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as SyncJobUpdatedEvent;
      onJobUpdated?.(data);
    });

    eventSource.addEventListener("sync_job_progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as SyncJobProgressEvent;
      onJobProgress?.(data);
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error", error);
    };

    return () => {
      eventSource.close();
    };
  }, [onJobUpdated, onJobProgress]);
}