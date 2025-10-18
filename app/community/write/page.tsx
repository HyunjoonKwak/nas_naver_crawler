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
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"FREE" | "QNA" | "NOTICE">("FREE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        return await response.json();
      });

      const results = await Promise.all(uploadPromises);
      const successResults = results.filter((r) => r.success);

      setUploadedImages([...uploadedImages, ...successResults]);
      showSuccess(`${successResults.length}개의 이미지가 업로드되었습니다`);
    } catch (error) {
      console.error("Failed to upload images:", error);
      showError("이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

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
          images: uploadedImages,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Navigation */}
        <div className="md:hidden">
          <MobileNavigation />
        </div>

        {/* Main Content - Full Width for Focus */}
        <main className="min-h-screen p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/community"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                목록으로
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                게시글 작성
              </h1>
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Category */}
                <div className="flex gap-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="FREE"
                      checked={category === "FREE"}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-white font-medium">
                      자유게시판
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="QNA"
                      checked={category === "QNA"}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-white font-medium">
                      Q&A
                    </span>
                  </label>
                  {isAdmin && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="NOTICE"
                        checked={category === "NOTICE"}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-red-600 dark:text-red-400 font-medium">
                        📌 공지사항
                      </span>
                    </label>
                  )}
                </div>

                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">
                    {title.length}/200
                  </p>
                </div>

                {/* Content */}
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={18}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">
                    {content.length}자
                  </p>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이미지 첨부 (최대 5MB, 여러 장 가능)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
                  />
                  {isUploading && (
                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      이미지 업로드 중...
                    </p>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img.url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/community"
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    취소
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
