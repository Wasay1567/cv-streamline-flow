import { Badge } from '@/components/ui/badge';
import type { CVStatus } from '@/types/cv';

const statusConfig: Record<CVStatus, { label: string; className: string }> = {
  not_submitted: { label: 'Not Submitted', className: 'bg-muted text-muted-foreground' },
  pending_advisor: { label: 'Pending Advisor', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_dil: { label: 'Pending DIL', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
};

const StatusBadge = ({ status }: { status?: CVStatus | string }) => {
  // 1. Safely try to get the config for the provided status
  const config = status ? statusConfig[status as CVStatus] : null;

  // 2. The Safety Net: If the status is undefined or doesn't exist in our dictionary
  if (!config) {
    return (
      <Badge className="bg-gray-200 text-gray-700 border-gray-300">
        Unknown Status
      </Badge>
    );
  }

  // 3. Normal rendering if the status is valid
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default StatusBadge;