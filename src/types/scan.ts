export type ScanStatus =
  | 'idle'
  | 'capturing'
  | 'reviewing'
  | 'processing'
  | 'completed'
  | 'failed';

export type ProcessingStage =
  | 'uploading'
  | 'analyzing'
  | 'cameras'
  | 'point-cloud'
  | 'mesh'
  | 'textures'
  | 'done';

export type ScanPhoto = {
  id: string;
  uri: string;
  width: number;
  height: number;
  filename: string;
  createdAt: string;
};

export type Scan = {
  id: string;
  name: string;
  photos: ScanPhoto[];
  photoCount: number;
  status: ScanStatus;
  progress?: number;
  processingStage?: ProcessingStage;
  estimatedSecondsRemaining?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
};

export type ScanPatch = {
  name?: string;
};
