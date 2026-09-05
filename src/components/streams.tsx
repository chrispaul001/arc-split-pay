import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CurrencySelect } from "@/components/currency-select";
import { formatLocal, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";
import { Activity, Pause, Play, Radio, Square, Timer } from "lucide-react";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";


type Stream = {
  id: number;
  name: string;
  role: string;
  address: string;
  ratePerSec: number;
  streamed: number;
  running: boolean;
};

const INITIAL: Stream[] = [
  {
    id: 1,
    name: "Ada Okonkwo",
    role: "Contract designer · Lagos",
    address: "0x8fA2…4c19",
    ratePerSec: 0.0125,
    streamed: 412.86,
    running: true,
  },
  {
    id: 2,
    name: "Kwame Mensah",
    role: "Backend contractor · Accra",
    address: "0x21Bd…9e07",
    ratePerSec: 0.0208,
    streamed: 1284.4,
    running: true,
  },
  {
    id: 3,
    name: "Nairobi Cloud Ops",
    role: "Managed infra · monthly",
    address: "0xC730…11aa",
    ratePerSec: 0.0042,
    streamed: 96.12,
    running: false,
  },
];

export function Streams() {
  const connected = useWalletGate();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [streams, setStreams] = useState<Stream[]>(INITIAL);


  useEffect(() => {
    if (!connected) return;
    const t = window.setInterval(() => {
      setStreams((ss) =>
        ss.map((s) => (s.running ? { ...s, streamed: s.streamed + s.ratePerSec / 4 } : s)),
      );
    }, 250);
    return () => window.clearInterval(t);
  }, [connected]);

  const activeRate = streams.filter((s) => s.running).reduce((a, s) => a + s.ratePerSec, 0);
  const totalStreamed = streams.reduce((a, s) => a + s.streamed, 0);

  const update = (id: number, patch: Partial<Stream>) =>
    setStreams((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  if (!connected)
    return (
      <GuestEmpty description="Connect your wallet to view and manage active payment streams." />
    );

  return (

    <div className="space-y-4">
      <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">Payment streams</h3>
            <p className="text-xs break-words text-muted-foreground">
              Second-by-second USDC settlement for contractors and service providers.
            </p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Active streams", `${streams.filter((s) => s.running).length} / ${streams.length}`],
            ["Combined rate", `${activeRate.toFixed(4)} USDC/s`],
            ["Streamed to date", formatLocal(totalStreamed, currency)],
          ].map(([k, v]) => (
            <div key={k} className="w-full min-w-0 rounded-2xl bg-secondary/50 p-4">
              <p className="truncate text-[11px] tracking-wide text-muted-foreground uppercase">{k}</p>
              <p className="mt-1 truncate font-display text-xl font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {streams.map((s) => (
          <div key={s.id} className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${s.running ? "pulse-dot bg-mint" : "bg-muted-foreground"}`}
                  />
                  <span className="truncate font-semibold">{s.name}</span>
                </p>
                <p className="truncate text-xs break-words text-muted-foreground">{s.role}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] break-words text-muted-foreground">{s.address}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  s.running ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground"
                }`}
              >
                {s.running ? "Streaming" : "Paused"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <p className="text-[11px] break-words text-muted-foreground">Streamed so far</p>
                <p className="font-display text-2xl font-bold tabular-nums">{s.streamed.toFixed(4)}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  USDC · {formatLocal(s.streamed, currency)}
                </p>
              </div>
              <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] break-words text-muted-foreground">
                  <Timer className="size-3" /> Rate
                </p>
                <p className="font-display text-2xl font-bold tabular-nums">{s.ratePerSec.toFixed(4)}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  USDC/sec · {formatLocal(s.ratePerSec * 3600, currency)}/hr
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <Slider
                value={[Math.round(s.ratePerSec * 10000)]}
                min={1}
                max={500}
                step={1}
                aria-label={`Streaming rate for ${s.name}`}
                onValueChange={([v]) => update(s.id, { ratePerSec: (v ?? 1) / 10000 })}
              />
              <span className="shrink-0 rounded-full bg-background/50 px-2 py-1 font-mono text-[11px] tabular-nums">
                {(s.ratePerSec * 86400).toFixed(2)}/day
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={s.running ? "secondary" : "default"}
                onClick={() => {
                  update(s.id, { running: !s.running });
                  toast(s.running ? `Stream paused · ${s.name}` : `Stream resumed · ${s.name}`);
                }}
              >
                {s.running ? <Pause className="size-4" /> : <Play className="size-4" />}
                {s.running ? "Pause" : "Resume"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  update(s.id, { running: false });
                  toast.success("Stream closed", {
                    description: `${s.streamed.toFixed(2)} USDC settled to ${s.address}.`,
                  });
                }}
              >
                <Square className="size-4" /> Close &amp; settle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toast("Live on Arc", { description: "Finality under one second per tick." })}
              >
                <Activity className="size-4" /> Activity
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11px] break-words text-muted-foreground">
        <Radio className="size-3" /> Streams tick every 250ms against Arc Mainnet · gas paid in USDC
      </p>
    </div>
  );
}
