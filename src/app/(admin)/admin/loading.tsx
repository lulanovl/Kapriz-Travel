export default function AdminLoading() {
  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Page title */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main content block */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse shrink-0" />
            <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" style={{ maxWidth: `${55 + (i % 3) * 15}%` }} />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse shrink-0" />
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
