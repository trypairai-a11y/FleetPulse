"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-6">
      <div className="text-center max-w-md">
        <div className="text-[72px] font-bold text-[#E6E9EE] leading-none mb-4">
          404
        </div>
        <h1 className="text-[20px] font-bold text-[#0C1825] mb-2">
          Page Not Found
        </h1>
        <p className="text-[14px] text-[#6B7A8D] mb-1">
          الصفحة المطلوبة غير موجودة
        </p>
        <p className="text-[13px] text-[#9CA3AF] mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E6E9EE] text-[#6B7A8D] text-[13px] font-medium hover:bg-[#F7F8FA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
