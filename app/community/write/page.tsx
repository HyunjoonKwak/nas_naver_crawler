"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError } from "@/lib/toast";

export default function WritePostPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"FREE" | "QNA">("FREE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showError("제목과 내용을 입력해주세요");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
        }),
      });
      const data = await response.json();

      if (data.success) {
        showSuccess("게시글이 작성되었습니다");
        router.push(`/community/${data.post.id}`);
      } else {
        showError(data.error || "게시글 작성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      showError("게시글 작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <Navigation />
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <MobileNavigation />
        </div>

        {/* Main Content */}
        <main className="md:ml-64 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              목록으로
            </Link>

            {/* Form */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  게시글 작성
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    게시판 선택
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="FREE"
                        checked={category === "FREE"}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-gray-900 dark:text-white">
                        자유게시판
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="QNA"
                        checked={category === "QNA"}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-gray-900 dark:text-white">
                        Q&A
                      </span>
                    </label>
                  </div>
                  {category === "QNA" && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Q&A 게시판에서는 질문에 대한 답변을 채택할 수 있습니다
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {title.length}/200
                  </p>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    내용
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {content.length}자
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                  <Link
                    href="/community"
                    className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    취소
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isSubmitting ? "작성 중..." : "작성 완료"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
