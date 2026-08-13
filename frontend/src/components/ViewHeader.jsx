export default function ViewHeader({ title, subtitle }) {
  return (
    <header className="view-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
