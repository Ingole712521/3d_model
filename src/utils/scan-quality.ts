import { MIN_PHOTOS } from '@/constants/scan';

export type ScanQuality = {
  label: string;
  message: string;
  ratio: number;
  ready: boolean;
};

export function scanQuality(count: number): ScanQuality {
  const ratio = Math.max(0, Math.min(1, count / 16));

  if (count < MIN_PHOTOS) {
    return {
      label: 'More photos required',
      message: 'Capture at least 6 overlapping photos before creating a model.',
      ratio,
      ready: false,
    };
  }

  if (count <= 9) {
    return {
      label: 'Basic coverage',
      message: 'Add a few more photos for better reconstruction.',
      ratio,
      ready: true,
    };
  }

  if (count <= 15) {
    return {
      label: 'Good coverage',
      message: 'Add a few more photos for better reconstruction.',
      ratio,
      ready: true,
    };
  }

  return {
    label: 'Excellent coverage',
    message: 'This set has strong overlap for reconstruction.',
    ratio: 1,
    ready: true,
  };
}
