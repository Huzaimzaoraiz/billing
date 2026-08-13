export default function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric-card">
      {Icon && <div className="metric-icon"><Icon size={20} /></div>}
      <div className="metric-content">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value}</span>
      </div>
    </div>
  );
}
