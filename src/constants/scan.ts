export const MIN_PHOTOS = 6;
export const RECOMMENDED_PHOTOS = 12;
export const MAX_PHOTOS = 30;

export function captureTarget(count: number): number {
  if (count < RECOMMENDED_PHOTOS) return RECOMMENDED_PHOTOS;
  if (count < 20) return 20;
  return MAX_PHOTOS;
}

export function captureGuidance(count: number): string {
  if (count <= 0) return 'Start with a wide view of the room';
  if (count <= 3) return 'Move slowly to the next area';
  if (count <= 8) return 'Keep capturing overlapping views';
  return 'Room coverage looks good';
}
