export default function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="panel-title">
      <Icon size={18} />
      <h3>{title}</h3>
    </div>
  );
}
