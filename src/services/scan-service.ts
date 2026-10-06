import { type LocalVideo, type Scan, type ScanPatch, type ScanPhoto } from '@/types/scan';

/** The UI talks to this contract only. ApiScanService posts it to the FastAPI reconstruction service. */
export interface ScanService {
  createScan(input: { name: string }): Promise<Scan>;
  updateScan(scanId: string, patch: ScanPatch): Promise<Scan>;
  uploadPhotos(scanId: string, photos: ScanPhoto[]): Promise<void>;
  uploadVideo(scanId: string, video: LocalVideo, name: string, onProgress: (ratio: number) => void): Promise<void>;
  processScan(scanId: string): Promise<void>;
  getScanStatus(scanId: string): Promise<Scan>;
  getScan(scanId: string): Promise<Scan>;
  getScanHistory(): Promise<Scan[]>;
}

export class ScanServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanServiceError';
  }
}
