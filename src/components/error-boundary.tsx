import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = { children: ReactNode; resetKey?: unknown };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    try {
      reportLovableError(error, { boundary: "dashboard_view" });
    } catch {
      /* ignore */
    }
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="glass grid place-items-center gap-3 rounded-3xl px-4 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-destructive/12 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <p className="font-semibold">This section hit a problem</p>
        <p className="max-w-sm text-xs break-words text-muted-foreground">
          The rest of the dashboard still works. Try reloading this section.
        </p>
        <Button size="sm" onClick={() => this.setState({ error: null })}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    );
  }
}
