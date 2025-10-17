"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchedulerRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 시스템 페이지의 스케줄러 탭으로 리다이렉트
    router.replace("/system");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">시스템 페이지로 이동 중...</p>
      </div>
    </div>
  );
}
