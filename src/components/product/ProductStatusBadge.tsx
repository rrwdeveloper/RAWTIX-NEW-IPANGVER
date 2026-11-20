interface ProductStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function ProductStatusBadge({ status, className = "" }: ProductStatusBadgeProps) {
  if (status === "sold_out") {
    return (
      <div
        className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-destructive/90 text-destructive-foreground px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-heading tracking-[0.16em] uppercase shadow-sm ${className}`}
      >
        Sold Out
      </div>
    );
  }

  if (status === "coming_soon") {
    return (
      <div
        className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/85 backdrop-blur-xs text-sky-300 border border-sky-400/30 px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-heading tracking-[0.16em] uppercase shadow-sm ${className}`}
      >
        Coming Soon
      </div>
    );
  }

  if (status === "preorder") {
    return (
      <div
        className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/85 backdrop-blur-xs text-amber-300 border border-amber-400/30 px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-heading tracking-[0.16em] uppercase shadow-sm ${className}`}
      >
        Pre-Order
      </div>
    );
  }

  // Default: active -> Ready Stock
  return (
    <div
      className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/80 backdrop-blur-xs text-white/95 border border-white/20 px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-heading tracking-[0.16em] uppercase shadow-sm ${className}`}
    >
      Ready Stock
    </div>
  );
}
