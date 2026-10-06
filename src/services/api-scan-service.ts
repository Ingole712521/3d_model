import { File, UploadType } from 'expo-file-system';

import { apiBaseUrl } from '@/services/api-config';
import { ScanServiceError, type ScanService } from '@/services/scan-service';
import { type LocalVideo, type Scan, type ScanPatch, type ScanPhoto } from '@/types/scan';

type CreateResponse = {
  scanId: string;
  status: string;
};

export class ApiScanService implements ScanService {
  async createScan(input: { name: string }): Promise<Scan> {
    const created = await request<CreateResponse>('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name }),
    });
    return {
      id: created.scanId,
      name: input.name.trim() || 'New room',
      photos: [],
      photoCount: 0,
      status: 'capturing',
      createdAt: new Date().toISOString(),
    };
  }

  async updateScan(scanId: string, patch: ScanPatch): Promise<Scan> {
    return request<Scan>(`/api/scans/${scanId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: patch.name ?? '' }),
    });
  }

  async uploadPhotos(scanId: string, photos: ScanPhoto[]): Promise<void> {
    if (photos.length === 0) {
      throw new ScanServiceError('Add at least one photo before continuing.');
    }

    const base = apiBaseUrl();
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const name = photo.filename || `${photo.id}.jpg`;
      const file = new File(photo.uri);
      let result;
      try {
        result = await file.upload(`${base}/api/scans/${scanId}/photos?replace=${index === 0 ? 'true' : 'false'}`, {
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          fieldName: 'files',
          mimeType: name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : '';
        throw new ScanServiceError(detail || 'A photo could not be uploaded. Keep the phone and computer on the same Wi-Fi.');
      }
      if (result.status < 200 || result.status >= 300) {
        throw new ScanServiceError(detailMessage(parseBody(result.body)) ?? `Photo upload failed (${result.status}).`);
      }
    }
  }

  async uploadVideo(scanId: string, video: LocalVideo, name: string, onProgress: (ratio: number) => void): Promise<void> {
    const base = apiBaseUrl();
    const file = new File(video.uri);
    const task = file.createUploadTask(`${base}/scan/video`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: videoMime(video.filename),
      parameters: { scanId, name },
      onProgress: ({ bytesSent, totalBytes }) => {
        if (totalBytes > 0) onProgress(bytesSent / totalBytes);
      },
    });
    let result;
    try {
      result = await task.uploadAsync();
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      throw new ScanServiceError(detail || 'The video could not be uploaded. Keep the phone and computer on the same Wi-Fi.');
    }
    if (result.status < 200 || result.status >= 300) {
      throw new ScanServiceError(detailMessage(parseBody(result.body)) ?? `Video upload failed (${result.status}).`);
    }
  }

  async processScan(scanId: string): Promise<void> {
    await request(`/api/scans/${scanId}/process`, { method: 'POST' });
  }

  async getScanStatus(scanId: string): Promise<Scan> {
    return request<Scan>(`/api/scans/${scanId}`);
  }

  async getScan(scanId: string): Promise<Scan> {
    return request<Scan>(`/api/scans/${scanId}`);
  }

  async getScanHistory(): Promise<Scan[]> {
    return request<Scan[]>('/api/scans');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, init);
  } catch {
    throw new ScanServiceError('Cannot reach the reconstruction server. Start the backend on this Wi-Fi, then try again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ScanServiceError(detailMessage(payload) ?? 'The reconstruction server rejected this request.');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function videoMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function detailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) return null;
  const detail = payload.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
      .filter(Boolean)
      .join(' ');
    return text || null;
  }
  return null;
}
