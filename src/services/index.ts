import { ApiScanService } from '@/services/api-scan-service';
import { type ScanService } from '@/services/scan-service';

export const scanService: ScanService = new ApiScanService();

export { ScanServiceError, type ScanService } from '@/services/scan-service';
