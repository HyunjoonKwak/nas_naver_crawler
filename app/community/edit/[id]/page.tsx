"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError } from "@/lib/toast";

export default function EditPostPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"FREE" | "QNA" | "NOTICE">("FREE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session && postId) {
      fetchPost();
    }
  }, [session, postId]);

  const fetchPost = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();

      if (data.success) {
        const post = data.post;

        // 권한 확인
        if (
          post.author.id !== session?.user?.id &&
          session?.user?.role !== "ADMIN"
        ) {
          showError("게시글을 수정할 권한이 없습니다");
          router.push(`/community/${postId}`);
          return;
        }

        setTitle(post.title);
        setContent(post.content);
        setCategory(post.category);
      } else {
        showError(data.error || "게시글을 불러오는데 실패했습니다");
        router.push("/community");
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
      showError("게시글을 불러오는데 실패했습니다");
      router.push("/community");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showError("제목과 내용을 입력해주세요");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });
      const data = await response.json();

      if (data.success) {
        showSuccess("게시글이 수정되었습니다");
        router.push(`/community/${postId}`);
      } else {
        showError(data.error || "게시글 수정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update post:", error);
      showError("게시글 수정에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
          <Navigation />
          <div className="md:hidden">
            <MobileNavigation />
          </div>
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
        {/* Navigation */}
        <Navigation />

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <MobileNavigation />
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back Button */}
            <Link
              href={`/community/${postId}`}
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
              돌아가기
            </Link>

            {/* Form */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  게시글 수정
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Category (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    게시판
                  </label>
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white">
                    {category === "FREE"
                      ? "자유게시판"
                      : category === "QNA"
                      ? "Q&A"
                      : "공지사항"}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    게시판 카테고리는 수정할 수 없습니다
                  </p>
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
                    href={`/community/${postId}`}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    취소
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isSubmitting ? "수정 중..." : "수정 완료"}
                  </button>
                </div>
              </form>
            </div>
        </main>
      </div>
    </AuthGuard>
  );
}
