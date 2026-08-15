import clsx from 'clsx';
import { PiCheckCircleBold as CheckCircle2 } from 'react-icons/pi';

export default function StatusBadge({ active }) {
  return (
    <span className={clsx('status-badge', active ? 'good' : 'muted')}>
      {active ? <CheckCircle2 size={14} /> : null}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
