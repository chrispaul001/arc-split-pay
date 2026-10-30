import logoTile from "@/assets/coindecc-tile.png.asset.json";

/**
 * The one CoindeccPay mark. Every instance (header, loading screen, receipts)
 * is masked with the shared squircle geometry in `styles.css`, so the shape is
 * identical at every size: a soft capsule with a hairline ring and depth.
 */
export function BrandTile({
  className = "size-10",
  decorative = false,
  sheen = false,
}: {
  className?: string;
  decorative?: boolean;
  /** Slide a soft light across the tile; used by the loading screen. */
  sheen?: boolean;
}) {
  return (
    <span className={`block shrink-0 self-center drop-shadow-sm ${className}`}>
      <span className="brand-squircle relative block h-full w-full bg-border/80 p-px">
        <img
          src={logoTile.url}
          alt={decorative ? "" : "CoindeccPay logo"}
          width={128}
          height={128}
          className="brand-squircle size-full object-cover"
        />
        {sheen && <span aria-hidden className="brand-sheen absolute inset-0" />}
      </span>
    </span>
  );
}
