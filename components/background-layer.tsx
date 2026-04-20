export function BackgroundLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg-base)]"
    >
      <div className="absolute -top-40 -left-40 h-[55vw] w-[55vw] rounded-full bg-[var(--bg-orb-1)] opacity-70 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[50vw] w-[50vw] rounded-full bg-[var(--bg-orb-2)] opacity-60 blur-[140px]" />
      <div className="absolute -bottom-40 left-1/4 h-[50vw] w-[50vw] rounded-full bg-[var(--bg-orb-3)] opacity-50 blur-[160px]" />
    </div>
  );
}
