import { Lock } from "lucide-react";
import { Button } from "./ui/button";

export function LinkInactive() {
  return (
    <div className="glass animate-rise rounded-3xl px-6 py-10 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-xl font-bold text-foreground">Link Inactive</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        This payment link has been paused or disabled by the merchant. Please contact the store owner or check back later.
      </p>
      <Button asChild variant="ghost" size="sm" className="mt-6">
        <a href="/">Return to Home</a>
      </Button>
    </div>
  );
}
