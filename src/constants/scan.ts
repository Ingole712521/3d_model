export const MIN_PHOTOS = 6;
export const RECOMMENDED_PHOTOS = 12;
export const MAX_PHOTOS = 30;

export function captureTarget(count: number): number {
  if (count < RECOMMENDED_PHOTOS) return RECOMMENDED_PHOTOS;
  if (count < 20) return 20;
  return MAX_PHOTOS;
}

export type CaptureInstruction = {
  title: string;
  body: string;
};

export function captureInstruction(count: number): CaptureInstruction {
  if (count <= 0) {
    return {
      title: 'Start at a corner',
      body: 'Include the floor, a wall, and a clear edge such as a window, door, or chair.',
    };
  }
  if (count < 6) {
    return {
      title: 'Step sideways',
      body: 'Move your feet to a new spot and keep part of the last photo in frame. Turning in place cannot build a 3D room.',
    };
  }
  if (count < 12) {
    return {
      title: 'Walk the room',
      body: 'Point slightly down so the floor stays visible, and photograph the next wall from a new position.',
    };
  }
  return {
    title: 'Fill the gaps',
    body: 'Stand in front of any wall you have not photographed yet. Take each shot from a new spot.',
  };
}
