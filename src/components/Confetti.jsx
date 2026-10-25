const COLORS = ["#8B1A2E", "#C9952A", "#e0b45a", "#a82340", "#ffb3c1", "#4caf7d"];

// Pure-CSS confetti burst. Pieces use a seeded hash instead of Math.random so renders stay pure.
const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
export default function Confetti({ count = 60 }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand(i, 1) * 100,
    delay: rand(i, 2) * 0.8,
    duration: 2.2 + rand(i, 3) * 2,
    size: 6 + rand(i, 4) * 8,
    color: COLORS[i % COLORS.length],
    rotate: rand(i, 5) * 360,
    round: i % 3 === 0,
  }));

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
