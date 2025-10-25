"use client";

import Link from "next/link";
import { useState } from "react";
import { showSuccess, showError } from "@/lib/toast";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !name.trim()) {
      showError("이메일과 이름을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("reset");
        showSuccess("사용자 확인이 완료되었습니다. 새 비밀번호를 설정해주세요.");
      } else {
        showError(data.error || "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.");
      }
    } catch (error: any) {
      console.error("Verify user error:", error);
      showError("사용자 확인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showError("비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      showError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("비밀번호가 재설정되었습니다. 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        showError(data.error || "비밀번호 재설정에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      showError("비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-block p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              비밀번호 재설정
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {step === "request"
                ? "가입 시 등록한 이메일과 이름을 입력해주세요"
                : "새로운 비밀번호를 입력해주세요"
              }
            </p>
          </div>

          {step === "request" ? (
            /* Step 1: 사용자 확인 */
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    확인 중...
                  </>
                ) : (
                  "다음"
                )}
              </button>
            </form>
          ) : (
            /* Step 2: 새 비밀번호 설정 */
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">{email}</span> 계정의 비밀번호를 재설정합니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      재설정 중...
                    </>
                  ) : (
                    "비밀번호 재설정"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 링크 */}
          <div className="mt-6 flex justify-center gap-3 text-sm">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              로그인
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/auth/find-email"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              아이디 찾기
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
