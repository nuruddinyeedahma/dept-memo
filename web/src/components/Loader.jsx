export default function Loader({ padded = true }) {
  return (
    <div className="loader-dots" style={padded ? { padding: '40px 20px' } : undefined}>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}
