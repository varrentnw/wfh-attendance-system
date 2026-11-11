import type { EmploymentStatus } from '../types/api';

type StatusBadgeProps = {
  status: EmploymentStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'ACTIVE';
  return (
    <span className={isActive ? 'badge badge-active' : 'badge badge-inactive'}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default StatusBadge;
