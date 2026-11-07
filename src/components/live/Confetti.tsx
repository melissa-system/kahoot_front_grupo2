const COLORS = ['#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#fb7185', '#a78bfa', '#f8fafc', '#38bdf8'];

function piece(i: number) {
  return {
    left: `${(i * 17 + 9) % 100}%`,
    delay: `${(i % 14) * 45}ms`,
    duration: `${1500 + (i % 9) * 140}ms`,
    color: COLORS[i % COLORS.length],
    dx: `${((i * 23) % 220) - 110}px`,
    rot: `${120 + ((i * 53) % 640)}deg`,
    width: 8 + (i % 10),
    height: i % 3 === 0 ? 16 : 8,
  };
}

export function Confetti({ count = 90 }: { count?: number }) {
  const bits = Array.from({ length: count }, (_, i) => piece(i));
  return (
    <div className="pl-confetti" data-testid="podium-confetti" aria-hidden>
      {bits.map((bit, i) => (
        <span
          key={i}
          className="pl-confetti-piece"
          style={{
            left: bit.left,
            width: bit.width,
            height: bit.height,
            background: bit.color,
            animationDelay: bit.delay,
            animationDuration: bit.duration,
            ['--pl-dx' as string]: bit.dx,
            ['--pl-rot' as string]: bit.rot,
          }}
        />
      ))}
    </div>
  );
}
