type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand" aria-label="NFL Chain">
      <svg
        className="brand__mark"
        viewBox="0 0 48 56"
        aria-hidden="true"
      >
        <path
          d="M24 2 43 9v17c0 12.9-7.8 22.7-19 28C12.8 48.7 5 38.9 5 26V9l19-7Z"
          fill="currentColor"
          opacity=".16"
        />
        <path
          d="M24 3.8 41.5 10v16c0 11.7-6.8 20.7-17.5 26.1C13.3 46.7 6.5 37.7 6.5 26V10L24 3.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16.2 33.3a6.1 6.1 0 0 1 0-8.6l3.2-3.2a6.1 6.1 0 0 1 8.6 0M31.8 22.7a6.1 6.1 0 0 1 0 8.6l-3.2 3.2a6.1 6.1 0 0 1-8.6 0M19.8 30.2l8.4-8.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      {!compact && <span className="brand__wordmark">NFL CHAIN</span>}
    </div>
  );
}
