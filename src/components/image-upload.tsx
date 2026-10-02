import { useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { ACCEPTED_IMAGE_TYPES, readImageFile } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export function ImageUpload({
  label,
  hint = "PNG, JPG or SVG · max 2MB",
  value,
  onChange,
  round = false,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  round?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = async (file?: File | null) => {
    if (!file) return;
    try {
      onChange(await readImageFile(file));
      toast.success(`${label} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="w-full min-w-0">
      <p className="text-xs font-medium break-words">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files?.[0]);
        }}
        className={`mt-2 grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border border-dashed p-3 transition-colors duration-200 ${
          over ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
        }`}
      >
        <div
          className={`relative isolate size-14 shrink-0 overflow-hidden bg-background/60 ${
            round ? "rounded-full" : "rounded-2xl"
          }`}
        >
          {value ? (
            <img key={value} src={value} alt={`${label} preview`} className="absolute inset-0 block size-full object-cover animate-in fade-in duration-200 motion-reduce:animate-none" />
          ) : (
            <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
              <ImagePlus
                width={20}
                height={20}
                strokeWidth={1.75}
                vectorEffect="non-scaling-stroke"
                className="block size-5 shrink-0 text-muted-foreground"
              />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => input.current?.click()}
              className="h-8 rounded-full px-3 text-[11px] after:hidden! hover:[&_svg]:scale-100! active:[&_svg]:scale-100!"
            >
              <UploadCloud className="size-3.5" /> {value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onChange(null)}
                className="h-8 rounded-full px-3 text-[11px] text-muted-foreground hover:text-destructive after:hidden! hover:[&_svg]:scale-100! active:[&_svg]:scale-100!"
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] break-words text-muted-foreground">{hint}</p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
