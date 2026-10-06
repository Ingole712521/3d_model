export type ScanStatus =
  | 'idle'
  | 'capturing'
  | 'reviewing'
  | 'processing'
  | 'completed'
  | 'failed';

export type JobStatus =
  | 'UPLOADING'
  | 'EXTRACTING_FRAMES'
  | 'RECONSTRUCTING'
  | 'GENERATING_MESH'
  | 'EXPORTING_GLB'
  | 'COMPLETED'
  | 'FAILED';

export type ProcessingStage =
  | 'uploading'
  | 'extracting'
  | 'reconstructing'
  | 'analyzing'
  | 'cameras'
  | 'point-cloud'
  | 'mesh'
  | 'textures'
  | 'exporting'
  | 'done';

export type ScanPhoto = {
  id: string;
  uri: string;
  width: number;
  height: number;
  filename: string;
  createdAt: string;
};

export type LocalVideo = {
  uri: string;
  filename: string;
  durationSeconds: number;
  bytes?: number;
};

export type Scan = {
  id: string;
  name: string;
  photos: ScanPhoto[];
  photoCount: number;
  source?: 'photos' | 'video';
  status: ScanStatus;
  jobStatus?: JobStatus;
  frameCount?: number;
  usableFrameCount?: number;
  durationSeconds?: number;
  warning?: string;
  localVideo?: LocalVideo;
  uploadProgress?: number;
  progress?: number;
  processingStage?: ProcessingStage;
  estimatedSecondsRemaining?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
};

export type ScanPatch = {
  name?: string;
};
