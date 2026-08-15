export default function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        {Icon && <div className="metric-icon"><Icon size={20} /></div>}
        <span className="metric-label">{label}:</span>
      </div>
      <span className="metric-value">{value}</span>
    </div>
  );
}
