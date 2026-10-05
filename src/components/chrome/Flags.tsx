// Circular 30×30 flags for the six capability centres (vector, no raster assets).
export function Flag({ code }: { code: string }) {
  switch (code) {
    case "UK":
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="30" fill="#012169" />
          <path d="M0 0 30 30M30 0 0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0 30 30M30 0 0 30" stroke="#C8102E" strokeWidth="2" />
          <path d="M15 0v30M0 15h30" stroke="#fff" strokeWidth="9" />
          <path d="M15 0v30M0 15h30" stroke="#C8102E" strokeWidth="5" />
        </svg>
      );
    case "UAE":
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="10" fill="#00732F" />
          <rect y="10" width="30" height="10" fill="#fff" />
          <rect y="20" width="30" height="10" fill="#000" />
          <rect width="9" height="30" fill="#FF0000" />
        </svg>
      );
    case "SG":
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="15" fill="#EF3340" />
          <rect y="15" width="30" height="15" fill="#fff" />
          <circle cx="9" cy="8" r="4.6" fill="#fff" />
          <circle cx="10.8" cy="8" r="4.2" fill="#EF3340" />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            return <circle key={i} cx={14.5 + 2.6 * Math.cos(a)} cy={8 + 2.6 * Math.sin(a)} r=".75" fill="#fff" />;
          })}
        </svg>
      );
    case "CAN":
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="30" fill="#fff" />
          <rect width="8" height="30" fill="#D80621" />
          <rect x="22" width="8" height="30" fill="#D80621" />
          <path d="M15 7l1.6 3.2 2.2-1-.8 4.6 2.6-2.2.6 1.6 2.4-.4-1 3 1 .8-4.8 3.6.4 1.6-3.6-.6V23h-1.2v-1.8l-3.6.6.4-1.6L6.4 16.6l1-.8-1-3 2.4.4.6-1.6 2.6 2.2-.8-4.6 2.2 1z" fill="#D80621" />
        </svg>
      );
    case "USA":
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="30" fill="#fff" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} y={(i * 2 * 30) / 13} width="30" height={30 / 13} fill="#B22234" />
          ))}
          <rect width="14" height={(7 * 30) / 13} fill="#3C3B6E" />
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={2.8 + c * 4.2} cy={2.6 + r * 4.2} r=".9" fill="#fff" />))}
        </svg>
      );
    case "IND":
    default:
      return (
        <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden>
          <rect width="30" height="10" fill="#FF9933" />
          <rect y="10" width="30" height="10" fill="#fff" />
          <rect y="20" width="30" height="10" fill="#138808" />
          <circle cx="15" cy="15" r="3.6" fill="none" stroke="#000080" strokeWidth=".8" />
          <circle cx="15" cy="15" r=".8" fill="#000080" />
        </svg>
      );
  }
}
