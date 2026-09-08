import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-surface ${className}`}
      style={style}
    />
  );
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

export function TablePageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-pad" aria-busy="true">
      <SkeletonLine width="8rem" className="h-6" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="mt-6 h-11 w-full max-w-md rounded-[16px]" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-pad" aria-busy="true">
      <SkeletonLine width="8rem" className="h-6" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-busy="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <SkeletonLine width="5rem" className="mb-2 h-2.5" />
          <Skeleton className="h-12 w-full rounded-[16px]" />
        </div>
      ))}
    </div>
  );
}

export function CategoriesPageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true">
      <SkeletonLine width="8rem" className="h-6" />
      <div className="mt-8 space-y-3">
        <SkeletonLine width="8rem" className="h-5" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
      <div className="mt-10 space-y-3">
        <SkeletonLine width="7rem" className="h-5" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdsPageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <SkeletonLine width="5rem" className="h-6" />
        <Skeleton className="h-11 w-28 rounded-[18px]" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

export function LivePageSkeleton() {
  return <TablePageSkeleton rows={5} />;
}

export function SkeletonCard({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-[18px] border border-line bg-white p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}
