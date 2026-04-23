export default function ApplyLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-gradient py-16">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-3">
          <div className="h-4 w-40 bg-white/20 rounded-full animate-pulse mx-auto" />
          <div className="h-10 w-64 bg-white/20 rounded animate-pulse mx-auto" />
          <div className="h-4 w-52 bg-white/10 rounded animate-pulse mx-auto" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ))}
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse mt-2" />
        </div>
      </div>
    </div>
  );
}
