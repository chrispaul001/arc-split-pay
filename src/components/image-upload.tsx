import { useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { ACCEPTED_IMAGE_TYPES, readImageFile } from "@/lib/brand";

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
        className={`mt-2 grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-dashed p-3 transition-colors ${
          over ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
        }`}
      >
        <div
          className={`grid size-14 shrink-0 place-items-center overflow-hidden bg-background/60 ${
            round ? "rounded-full" : "rounded-2xl"
          }`}
        >
          {value ? (
            <img src={value} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              <UploadCloud className="size-3.5" /> {value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Remove
              </button>
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
