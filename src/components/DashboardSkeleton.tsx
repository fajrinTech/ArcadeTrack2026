// Skeleton yang meniru layout dashboard asli saat data loading.
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header profil */}
      <div className="neobrutal-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-surface-alt rounded" />
            <div className="h-7 w-56 bg-surface-alt rounded" />
            <div className="h-3 w-40 bg-surface-alt rounded" />
          </div>
          <div className="h-9 w-28 bg-surface-alt border-[2px] border-black rounded-lg" />
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="h-12 bg-surface-alt border-[3px] border-black rounded-lg shadow-[4px_4px_0_#000]" />

      {/* Kartu poin + tier + chart */}
      <div className="neobrutal-card">
        <div className="flex flex-col lg:flex-row lg:divide-x-[2px] lg:divide-black gap-5 lg:gap-0">
          <div className="lg:pr-6 flex flex-col items-center gap-3 lg:min-w-[210px]">
            <div className="w-24 h-24 bg-surface-alt border-[3px] border-black rounded-xl" />
            <div className="h-4 w-28 bg-surface-alt rounded" />
            <div className="h-2.5 w-full bg-surface-alt rounded" />
          </div>
          <div className="lg:px-6 flex-1 space-y-3">
            <div className="h-3 w-24 bg-surface-alt rounded" />
            <div className="h-12 w-32 bg-surface-alt rounded" />
            <div className="flex gap-2">
              <div className="h-7 w-24 bg-surface-alt rounded" />
              <div className="h-7 w-24 bg-surface-alt rounded" />
            </div>
          </div>
          <div className="lg:pl-6 flex-1 flex items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-surface-alt border-[3px] border-black" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 bg-surface-alt rounded" />
              <div className="h-2.5 w-full bg-surface-alt rounded" />
              <div className="h-2.5 w-full bg-surface-alt rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Kartu roadmap + heatmap */}
      <div className="neobrutal-card">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x-[2px] lg:divide-black gap-6 lg:gap-0">
          <div className="lg:pr-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface-alt border-[3px] border-black rounded-lg" />
            ))}
          </div>
          <div className="lg:pl-6 space-y-2">
            <div className="h-3 w-32 bg-surface-alt rounded" />
            <div className="h-28 bg-surface-alt rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
