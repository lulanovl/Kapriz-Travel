export default function TourDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-[55vh] sm:h-[65vh] bg-gray-200 animate-pulse relative">
        <div className="absolute bottom-10 left-6 sm:left-10 space-y-3">
          <div className="h-6 w-28 bg-gray-300/70 rounded-full animate-pulse" />
          <div className="h-9 w-72 bg-gray-300/70 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
          {[90, 80, 95, 70].map((w, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mt-6" />
          {[85, 75, 60].map((w, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
      </div>
    </div>
  );
}
