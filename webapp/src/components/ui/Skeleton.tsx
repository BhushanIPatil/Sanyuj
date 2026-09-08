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

/** Provider / business list row placeholder. */
export function SkeletonProviderRow() {
  return (
    <SkeletonCard className="flex items-center gap-3">
      <SkeletonAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine width="55%" className="h-3.5" />
        <SkeletonLine width="40%" className="h-2.5" />
      </div>
      <Skeleton className="h-8 w-12 rounded-full" />
    </SkeletonCard>
  );
}

/** Job list card placeholder. */
export function SkeletonJobCard() {
  return (
    <SkeletonCard>
      <div className="flex items-start justify-between gap-2">
        <SkeletonLine width="65%" className="h-3.5" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <SkeletonLine width="45%" className="mt-3 h-2.5" />
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3">
        <SkeletonLine width="28%" className="h-3.5" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </SkeletonCard>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading home">
      <Skeleton className="h-[220px] w-full rounded-[12px]" />

      <div className="mt-8 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine width="12rem" className="h-4" />
          <SkeletonLine width="16rem" className="h-2.5" />
        </div>
        <Skeleton className="h-9 w-9 rounded-[12px]" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="flex flex-col items-center p-4 text-center">
            <SkeletonAvatar size="lg" className="mx-auto" />
            <SkeletonLine width="60%" className="mx-auto mt-3 h-3" />
            <SkeletonLine width="40%" className="mx-auto mt-2 h-2.5" />
            <Skeleton className="mx-auto mt-3 h-9 w-24 rounded-full" />
          </SkeletonCard>
        ))}
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <SkeletonLine width="6rem" className="h-4" />
        <SkeletonLine width="3.5rem" className="h-3" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="flex flex-col items-center gap-2 px-3 py-4">
            <Skeleton className="h-10 w-10 rounded-[12px]" />
            <SkeletonLine width="70%" className="h-2.5" />
          </SkeletonCard>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SkeletonLine width="9rem" className="h-4" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonProviderRow key={i} />
            ))}
          </div>
        </section>
        <section>
          <SkeletonLine width="8rem" className="h-4" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonProviderRow key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ExplorePageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading explore">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine width="11rem" className="h-5" />
          <SkeletonLine width="16rem" className="h-3" />
        </div>
        <div className="space-y-2 sm:text-right">
          <SkeletonLine width="10rem" className="h-3.5 sm:ml-auto" />
          <Skeleton className="h-9 w-28 rounded-full sm:ml-auto" />
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-12 flex-1 rounded-[16px]" />
        <div className="flex gap-2">
          <Skeleton className="h-12 w-24 rounded-[14px]" />
          <Skeleton className="h-12 w-20 rounded-[14px]" />
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonProviderRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function JobsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading jobs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonJobCard key={i} />
      ))}
    </div>
  );
}

export function MyJobsPageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading my jobs">
      <header className="space-y-2">
        <SkeletonLine width="8rem" className="h-2.5" />
        <SkeletonLine width="6rem" className="h-5" />
      </header>
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
      <JobsListSkeleton />
    </div>
  );
}

export function JobsFeedPageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading job feed">
      <header className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[13px]" />
        <div className="space-y-2">
          <SkeletonLine width="7rem" className="h-2.5" />
          <SkeletonLine width="5rem" className="h-4" />
        </div>
      </header>
      <Skeleton className="h-28 w-full rounded-[26px]" />
      <Skeleton className="mt-3.5 h-[72px] w-full rounded-[26px]" />
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
      <JobsListSkeleton count={3} />
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading profile">
      <header className="space-y-2">
        <SkeletonLine width="4rem" className="h-2.5" />
        <SkeletonLine width="5rem" className="h-5" />
      </header>

      <div className="flex flex-col items-center pt-2">
        <SkeletonAvatar size="xl" />
        <SkeletonLine width="8rem" className="mt-3 h-4" />
        <SkeletonLine width="6rem" className="mt-2 h-2.5" />
        <Skeleton className="mt-3 h-8 w-28 rounded-full" />
      </div>

      <SkeletonCard className="mt-4">
        <SkeletonLine width="4rem" className="h-2.5" />
        <SkeletonLine width="80%" className="mt-2 h-3.5" />
        <SkeletonLine width="30%" className="mt-2 h-2.5" />
      </SkeletonCard>

      <Skeleton className="mt-4 h-40 w-full rounded-[26px]" />

      <SkeletonCard className="mt-4 space-y-0 overflow-hidden p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-line px-4 py-4 last:border-0">
            <SkeletonLine width={`${50 + (i % 3) * 10}%`} className="h-3.5" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}

export function MyInterestsPageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading interests">
      <header className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[13px]" />
        <div className="space-y-2">
          <SkeletonLine width="9rem" className="h-2.5" />
          <SkeletonLine width="7rem" className="h-4" />
        </div>
      </header>
      <Skeleton className="h-11 w-full rounded-full" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonProviderRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="page-pad" aria-busy="true" aria-label="Loading job">
      <header className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[13px]" />
        <div className="space-y-2">
          <SkeletonLine width="5rem" className="h-2.5" />
          <SkeletonLine width="10rem" className="h-4" />
        </div>
      </header>
      <SkeletonCard>
        <Skeleton className="h-5 w-20 rounded-full" />
        <SkeletonLine width="85%" className="mt-3 h-5" />
        <SkeletonLine width="100%" className="mt-3 h-2.5" />
        <SkeletonLine width="90%" className="mt-2 h-2.5" />
        <SkeletonLine width="70%" className="mt-2 h-2.5" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-[14px]" />
          <Skeleton className="h-10 w-24 rounded-[14px]" />
        </div>
      </SkeletonCard>
      <SkeletonLine width="8rem" className="mt-6 h-4" />
      <div className="mt-3 space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonProviderRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function EditProfileSkeleton() {
  return (
    <div className="page-pad max-w-2xl" aria-busy="true" aria-label="Loading profile editor">
      <header className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[13px]" />
        <div className="space-y-2">
          <SkeletonLine width="4rem" className="h-2.5" />
          <SkeletonLine width="7rem" className="h-4" />
        </div>
      </header>
      <SkeletonLine width="5rem" className="mb-2 h-3" />
      <Skeleton className="h-12 w-full rounded-[16px]" />
      <SkeletonLine width="6rem" className="mb-2 mt-5 h-3" />
      <Skeleton className="h-12 w-full rounded-[16px]" />
      <div className="mt-6 border-t border-line pt-5">
        <SkeletonLine width="5rem" className="h-3" />
        <Skeleton className="mt-4 h-12 w-full rounded-[16px]" />
        <SkeletonLine width="4rem" className="mb-2 mt-5 h-3" />
        <Skeleton className="h-[110px] w-full rounded-[16px]" />
        <SkeletonLine width="4rem" className="mb-2 mt-4 h-3" />
        <Skeleton className="h-12 w-full rounded-[16px]" />
      </div>
      <Skeleton className="mt-6 h-12 w-full rounded-full" />
    </div>
  );
}

export function CategoryPickerSkeleton({ flat = false }: { flat?: boolean }) {
  if (flat) {
    return (
      <div className="flex flex-wrap gap-2" aria-busy="true" aria-label="Loading categories">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g}>
          <SkeletonLine width="5rem" className="mb-2 h-2.5" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdBannerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading ads">
      <Skeleton className="h-[220px] w-full rounded-[12px]" />
    </div>
  );
}
