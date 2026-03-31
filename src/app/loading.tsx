export default function Loading() {
  return (
    <div className="min-h-screen max-w-2xl mx-auto relative z-10">
      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-slate-700/50 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-slate-700/50 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Map skeleton */}
        <div className="w-full h-[50vh] rounded-xl bg-slate-800/60 animate-pulse flex items-center justify-center">
          <span className="opacity-30 text-sm">Loading map...</span>
        </div>

        {/* Tab skeleton */}
        <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />

        {/* Content skeleton */}
        <div className="bg-slate-800/30 rounded-xl p-5 space-y-3 animate-pulse">
          <div className="h-5 w-1/3 bg-slate-700/50 rounded" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-slate-700/40 rounded-lg" />
            <div className="h-16 bg-slate-700/40 rounded-lg" />
            <div className="h-16 bg-slate-700/40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
