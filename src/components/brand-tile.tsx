import logoTile from "@/assets/coindecc-tile.png.asset.json";

/** Shared, unclipped brand artwork; keep the tile shape consistent at every size. */
export function BrandTile({ className = "size-10", decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src={logoTile.url}
      alt={decorative ? "" : "CoindeccPay logo"}
      width={128}
      height={128}
      className={`aspect-square shrink-0 self-center rounded-[22%] object-contain shadow-sm ring-1 ring-border/80 ${className}`}
    />
  );
}