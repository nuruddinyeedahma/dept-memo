export default function SuccessCheck({ label }) {
  return (
    <div className="success-check-overlay">
      <div className="success-check-circle">
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path
            d="M4 12l5 5L20 6"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="success-check-path"
          />
        </svg>
        <span className="success-burst-dot d1" />
        <span className="success-burst-dot d2" />
        <span className="success-burst-dot d3" />
        <span className="success-burst-dot d4" />
        <span className="success-burst-dot d5" />
        <span className="success-burst-dot d6" />
      </div>
      {label && <div className="success-check-label">{label}</div>}
    </div>
  );
}
