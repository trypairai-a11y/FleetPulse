export default function InsightsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-32" />
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-36" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-32" />
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-44" />
    </div>
  );
}
