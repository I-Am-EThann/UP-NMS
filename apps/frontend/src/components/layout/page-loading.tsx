import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-ink-400">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}
