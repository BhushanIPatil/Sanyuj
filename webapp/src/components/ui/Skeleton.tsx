import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** Pulsing block used to build page skeletons. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-surface ${className}`}
      style={style}
    />
  );
}

export function SkeletonAvatar({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-10 w-10 rounded-[13px]",
    md: "h-12 w-12 rounded-[15px]",
    lg: "h-14 w-14 rounded-[17px]",
    xl: "h-20 w-20 rounded-[26px]",
  };
  return <Skeleton className={`${sizes[size]} ${className}`} />;
}

export function SkeletonLine({
  className = "",
  width = "100%",
}: {
  className?: string;
  width?: string | number;
}) {
  return <Skeleton className={`h-3 ${className}`} style={{ width }} />;
}

export function SkeletonCard({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-[18px] border border-line bg-white p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function OfferlyPageSkeleton({ label = "Loading Offerly" }: { label?: string } = {}) {
  return (
    <div className="page-pad" aria-busy="true" aria-label={label}>
      <header className="mb-6 space-y-2">
        <SkeletonLine width="8rem" className="h-5" />
        <SkeletonLine width="18rem" className="h-3" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="overflow-hidden p-0">
            <Skeleton className="h-[160px] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <SkeletonLine width="5rem" className="h-3" />
              <SkeletonLine width="80%" className="h-4" />
              <SkeletonLine width="60%" className="h-2.5" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
