import { type Scan, type ScanStatus } from '@/types/scan';

export function displayPhotoCount(scan: Scan): number {
  if (scan.photos.length > 0) return scan.photos.length;
  return scan.photoCount;
}

export function photoCountLabel(scan: Scan): string {
  if (scan.source === 'video') {
    const count = scan.usableFrameCount || scan.frameCount || 0;
    if (count <= 0) return scan.durationSeconds ? `${Math.round(scan.durationSeconds)}s video` : 'Video';
    return `${count} ${count === 1 ? 'frame' : 'frames'}`;
  }
  const count = displayPhotoCount(scan);
  return `${count} ${count === 1 ? 'photo' : 'photos'}`;
}

export function statusLabel(status: ScanStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    case 'reviewing':
      return 'Ready to process';
    case 'capturing':
      return 'In progress';
    default:
      return 'Draft';
  }
}

export function formatScanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRemaining(seconds: number | undefined): string {
  if (seconds === undefined) return 'Estimating time';
  if (seconds <= 5) return 'A few seconds';
  if (seconds < 60) return `About ${seconds} seconds`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes === 1 ? 'About 1 minute' : `About ${minutes} minutes`;
}

export function routeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
