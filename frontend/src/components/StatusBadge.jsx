import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

export default function StatusBadge({ active }) {
  return (
    <span className={clsx('status-badge', active ? 'good' : 'muted')}>
      {active ? <CheckCircle2 size={14} /> : null}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
