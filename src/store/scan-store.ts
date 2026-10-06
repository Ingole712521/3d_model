import { create } from 'zustand';

import { MAX_PHOTOS } from '@/constants/scan';
import { scanService } from '@/services';
import { ScanServiceError } from '@/services/scan-service';
import { type Scan, type ScanPhoto } from '@/types/scan';

type HistoryStatus = 'loading' | 'ready' | 'error';

type ScanState = {
  history: Scan[];
  historyStatus: HistoryStatus;
  historyError: string | null;
  currentScanId: string | null;
  focusScan: (scanId: string) => void;
  loadHistory: () => Promise<void>;
  startScan: () => Promise<Scan>;
  addPhoto: (photo: ScanPhoto) => boolean;
  removePhoto: (photoId: string) => void;
  renameCurrent: (name: string) => void;
  markReviewing: () => void;
  submitCurrent: () => Promise<Scan>;
  ensureProcessing: (scanId: string) => Promise<Scan>;
  refreshScan: (scanId: string) => Promise<Scan>;
};

function sortNewest(scans: Scan[]): Scan[] {
  return [...scans].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function replaceScan(history: Scan[], scan: Scan): Scan[] {
  const exists = history.some((item) => item.id === scan.id);
  const next = exists ? history.map((item) => (item.id === scan.id ? scan : item)) : [scan, ...history];
  return sortNewest(next);
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ScanServiceError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const useScanStore = create<ScanState>((set, get) => ({
  history: [],
  historyStatus: 'loading',
  historyError: null,
  currentScanId: null,

  focusScan: (scanId) => set({ currentScanId: scanId }),

  loadHistory: async () => {
    const initial = get().history.length === 0 && get().historyStatus !== 'ready';
    if (initial) set({ historyStatus: 'loading', historyError: null });

    try {
      const remote = await scanService.getScanHistory();
      const currentId = get().currentScanId;
      const current = get().history.find((scan) => scan.id === currentId);
      const keepLocal =
        current && (current.status === 'capturing' || current.status === 'reviewing');

      let history = remote;
      if (keepLocal && current) {
        history = replaceScan(remote, current);
      }

      set({ history, historyStatus: 'ready', historyError: null });
    } catch (error) {
      set({
        historyStatus: get().history.length > 0 ? 'ready' : 'error',
        historyError: messageFrom(error, "We couldn't load your spaces."),
      });
    }
  },

  startScan: async () => {
    const scan = await scanService.createScan({ name: 'New room' });
    set((state) => ({
      currentScanId: scan.id,
      history: replaceScan(state.history, scan),
      historyStatus: 'ready',
    }));
    return scan;
  },

  addPhoto: (photo) => {
    const { currentScanId, history } = get();
    if (!currentScanId) return false;
    const scan = history.find((item) => item.id === currentScanId);
    if (!scan || scan.photos.length >= MAX_PHOTOS) return false;

    const next: Scan = {
      ...scan,
      photos: [...scan.photos, photo],
      photoCount: scan.photos.length + 1,
      thumbnailUrl: scan.thumbnailUrl ?? photo.uri,
      status: scan.status === 'completed' ? 'reviewing' : scan.status,
      modelUrl: scan.status === 'completed' ? undefined : scan.modelUrl,
    };
    set({ history: replaceScan(history, next) });
    return true;
  },

  removePhoto: (photoId) => {
    const { currentScanId, history } = get();
    if (!currentScanId) return;
    const scan = history.find((item) => item.id === currentScanId);
    if (!scan) return;

    const photos = scan.photos.filter((photo) => photo.id !== photoId);
    const next: Scan = {
      ...scan,
      photos,
      photoCount: photos.length,
      thumbnailUrl: photos[0]?.uri,
      status: 'reviewing',
      modelUrl: undefined,
      completedAt: undefined,
      progress: undefined,
      processingStage: undefined,
    };
    set({ history: replaceScan(history, next) });
  },

  renameCurrent: (name) => {
    const { currentScanId, history } = get();
    if (!currentScanId) return;
    const scan = history.find((item) => item.id === currentScanId);
    if (!scan) return;
    set({ history: replaceScan(history, { ...scan, name }) });
  },

  markReviewing: () => {
    const { currentScanId, history } = get();
    if (!currentScanId) return;
    const scan = history.find((item) => item.id === currentScanId);
    if (!scan || scan.status === 'completed' || scan.status === 'processing') return;
    set({ history: replaceScan(history, { ...scan, status: 'reviewing' }) });
  },

  submitCurrent: async () => {
    const scan = currentFrom(get());
    if (!scan) throw new ScanServiceError('This scan could not be found.');

    const saved = await scanService.updateScan(scan.id, { name: scan.name });
    await scanService.uploadPhotos(scan.id, scan.photos);
    await scanService.processScan(scan.id);
    const status = await scanService.getScanStatus(scan.id);
    const next = withLocalPhotos(scan, { ...status, name: saved.name || status.name });
    set((state) => ({ history: replaceScan(state.history, next) }));
    return next;
  },

  ensureProcessing: async (scanId) => {
    await scanService.processScan(scanId);
    const status = await scanService.getScanStatus(scanId);
    const next = withLocalPhotos(get().history.find((item) => item.id === scanId), status);
    set((state) => ({ history: replaceScan(state.history, next) }));
    return next;
  },

  refreshScan: async (scanId) => {
    const status = await scanService.getScanStatus(scanId);
    const next = withLocalPhotos(get().history.find((item) => item.id === scanId), status);
    set((state) => ({ history: replaceScan(state.history, next) }));
    return next;
  },
}));

function withLocalPhotos(local: Scan | undefined, remote: Scan): Scan {
  if (!local) return remote;
  return {
    ...remote,
    photos: local.photos.length > 0 ? local.photos : remote.photos,
    thumbnailUrl: remote.thumbnailUrl ?? local.thumbnailUrl,
    photoCount: remote.photoCount > 0 ? remote.photoCount : local.photoCount,
  };
}

function currentFrom(state: Pick<ScanState, 'currentScanId' | 'history'>): Scan | undefined {
  return state.history.find((scan) => scan.id === state.currentScanId);
}

export function useCurrentScan(): Scan | undefined {
  const currentScanId = useScanStore((state) => state.currentScanId);
  const history = useScanStore((state) => state.history);
  return history.find((scan) => scan.id === currentScanId);
}

export function useScan(scanId: string | undefined): Scan | undefined {
  const history = useScanStore((state) => state.history);
  return history.find((scan) => scan.id === scanId);
}
