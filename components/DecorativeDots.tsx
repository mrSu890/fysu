// Petits points décoratifs, fixes à l'écran sur toutes les pages
const LEFT_TOPS = ["12%", "49%", "86%"];
const RIGHT_TOPS = ["13%", "50%", "87%"];

export default function DecorativeDots() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      {LEFT_TOPS.map((top) => (
        <span
          key={`left-${top}`}
          className="deco-dot absolute left-6"
          style={{ top }}
        />
      ))}

      {RIGHT_TOPS.map((top) => (
        <span
          key={`right-${top}`}
          className="deco-dot absolute right-6"
          style={{ top }}
        />
      ))}
    </div>
  );
}
