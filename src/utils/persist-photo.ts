import { Directory, File, Paths } from 'expo-file-system';

export async function persistPhoto(sourceUri: string, scanId: string, photoId: string): Promise<string> {
  if (!sourceUri || sourceUri.startsWith('data:') || sourceUri.startsWith('blob:')) {
    return sourceUri;
  }

  try {
    const directory = new Directory(Paths.document, 'roomscan', scanId);
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, `${photoId}.jpg`);
    await new File(sourceUri).copy(destination, { overwrite: true });
    return destination.uri;
  } catch {
    return sourceUri;
  }
}
