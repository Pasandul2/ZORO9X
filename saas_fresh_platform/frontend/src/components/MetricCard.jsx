function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <h3>{value}</h3>
    </div>
  );
}

export default MetricCard;
