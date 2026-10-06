import { Directory, File, Paths } from 'expo-file-system';

export async function persistVideo(sourceUri: string, scanId: string, filename: string): Promise<{ uri: string; bytes?: number }> {
  const extension = videoExtension(filename);
  try {
    const directory = new Directory(Paths.document, 'roomscan', scanId);
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, `video.${extension}`);
    await new File(sourceUri).copy(destination, { overwrite: true });
    const bytes = destination.size ?? undefined;
    return { uri: destination.uri, bytes: typeof bytes === 'number' ? bytes : undefined };
  } catch {
    return { uri: sourceUri };
  }
}

export function videoExtension(filename: string): 'mp4' | 'mov' | 'm4v' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mov')) return 'mov';
  if (lower.endsWith('.m4v')) return 'm4v';
  return 'mp4';
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}:${remain.toString().padStart(2, '0')}`;
}
