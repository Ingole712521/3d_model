import { type ProcessingStage } from '@/types/scan';

export const PROCESSING_STAGES: { id: Exclude<ProcessingStage, 'done'>; label: string }[] = [
  { id: 'uploading', label: 'Uploading images' },
  { id: 'analyzing', label: 'Analyzing images' },
  { id: 'cameras', label: 'Finding camera positions' },
  { id: 'point-cloud', label: 'Building point cloud' },
  { id: 'mesh', label: 'Generating mesh' },
  { id: 'textures', label: 'Applying textures' },
];

export function stageLabel(stage: ProcessingStage | undefined): string {
  if (!stage) return 'Uploading images';
  if (stage === 'done') return 'Finishing';
  return PROCESSING_STAGES.find((item) => item.id === stage)?.label ?? 'Processing';
}

export type StageVisual = 'complete' | 'active' | 'pending';

export function stageVisual(current: ProcessingStage | undefined, id: ProcessingStage): StageVisual {
  const order = PROCESSING_STAGES.map((item) => item.id);
  const currentIndex = current === 'done' || current === undefined ? (current === 'done' ? order.length : 0) : order.indexOf(current as (typeof order)[number]);
  const index = order.indexOf(id as (typeof order)[number]);
  if (index < 0) return 'pending';
  if (currentIndex > index) return 'complete';
  if (currentIndex === index) return 'active';
  return 'pending';
}
