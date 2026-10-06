import { type ProcessingStage } from '@/types/scan';

export const PROCESSING_STAGES: { id: Exclude<ProcessingStage, 'done' | 'extracting' | 'reconstructing' | 'exporting'>; label: string }[] = [
  { id: 'uploading', label: 'Uploading images' },
  { id: 'analyzing', label: 'Analyzing images' },
  { id: 'cameras', label: 'Finding camera positions' },
  { id: 'point-cloud', label: 'Building point cloud' },
  { id: 'mesh', label: 'Generating mesh' },
  { id: 'textures', label: 'Applying textures' },
];

export const VIDEO_PROCESSING_STAGES: { id: Exclude<ProcessingStage, 'done' | 'analyzing' | 'cameras' | 'point-cloud' | 'textures'>; label: string }[] = [
  { id: 'uploading', label: 'Uploading video' },
  { id: 'extracting', label: 'Extracting frames' },
  { id: 'reconstructing', label: 'Selecting keyframes' },
  { id: 'mesh', label: 'Generating nodes' },
  { id: 'exporting', label: 'Building the tour' },
];

type StageItem = { id: ProcessingStage; label: string };

export function stagesFor(source: string | undefined): StageItem[] {
  return source === 'video' ? VIDEO_PROCESSING_STAGES : PROCESSING_STAGES;
}

export function stageLabel(stage: ProcessingStage | undefined, source?: string): string {
  if (!stage || stage === 'done') return stage === 'done' ? 'Finishing' : stagesFor(source)[0]?.label ?? 'Processing';
  const match = [...VIDEO_PROCESSING_STAGES, ...PROCESSING_STAGES].find((item) => item.id === stage);
  return match?.label ?? 'Processing';
}

export type StageVisual = 'complete' | 'active' | 'pending';

export function stageVisual(current: ProcessingStage | undefined, id: ProcessingStage, stages: StageItem[]): StageVisual {
  const order = stages.map((item) => item.id);
  const currentIndex =
    current === 'done' ? order.length : current === undefined ? 0 : order.indexOf(current as (typeof order)[number]);
  const index = order.indexOf(id);
  if (index < 0 || currentIndex < 0) return 'pending';
  if (currentIndex > index) return 'complete';
  if (currentIndex === index) return 'active';
  return 'pending';
}
