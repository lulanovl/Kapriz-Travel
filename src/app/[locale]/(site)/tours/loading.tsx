export default function ToursLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="h-4 w-32 bg-white/20 rounded-full animate-pulse" />
          <div className="h-10 w-56 bg-white/20 rounded animate-pulse" />
          <div className="h-4 w-44 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="h-52 bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                <div className="h-7 bg-gray-200 rounded animate-pulse w-1/3 mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
