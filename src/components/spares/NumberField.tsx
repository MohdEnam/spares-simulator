import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  suffix?: string;
  step?: number;
  source?: string;
  sourceTone?: "muted" | "warning";
  readOnly?: boolean;
  error?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  source,
  sourceTone = "muted",
  readOnly,
  error,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="flex items-baseline justify-between text-xs font-medium text-foreground">
        <span>{label}</span>
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value === "" ? NaN : Number(e.target.value))}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-card px-3 font-mono text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
          readOnly && "bg-muted text-muted-foreground",
          error && "border-destructive focus:border-destructive focus:ring-destructive",
        )}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {source && (
        <p
          className={cn(
            "text-[11px] leading-tight",
            sourceTone === "warning" ? "text-warning-foreground" : "text-muted-foreground",
          )}
        >
          {source}
        </p>
      )}
    </div>
  );
}
