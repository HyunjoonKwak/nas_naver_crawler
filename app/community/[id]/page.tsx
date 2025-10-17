"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError } from "@/lib/toast";

interface Post {
  id: string;
  title: string;
  content: string;
  category: "FREE" | "QNA" | "NOTICE";
  views: number;
  likesCount: number;
  isResolved: boolean;
  isPinned: boolean;
  acceptedCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  comments: Comment[];
  _count: {
    likes: number;
    comments: number;
  };
}

interface Comment {
  id: string;
  content: string;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

const CATEGORY_LABELS = {
  FREE: "자유게시판",
  QNA: "Q&A",
  NOTICE: "공지사항",
};

export default function PostDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    if (session && postId) {
      fetchPost();
      checkLikeStatus();
    }
  }, [session, postId]);

  const fetchPost = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();

      if (data.success) {
        setPost(data.post);
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

  const checkLikeStatus = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`);
      const data = await response.json();
      if (data.success) {
        setIsLiked(data.isLiked);
      }
    } catch (error) {
      console.error("Failed to check like status:", error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? "DELETE" : "POST",
      });
      const data = await response.json();

      if (data.success) {
        setIsLiked(!isLiked);
        await fetchPost(); // 좋아요 카운트 업데이트
        showSuccess(isLiked ? "좋아요를 취소했습니다" : "좋아요를 눌렀습니다");
      } else {
        showError(data.error || "좋아요 처리에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      showError("좋아요 처리에 실패했습니다");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent }),
      });
      const data = await response.json();

      if (data.success) {
        setCommentContent("");
        await fetchPost();
        showSuccess("댓글이 작성되었습니다");
      } else {
        showError(data.error || "댓글 작성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      showError("댓글 작성에 실패했습니다");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent }),
      });
      const data = await response.json();

      if (data.success) {
        setEditingCommentId(null);
        setEditingContent("");
        await fetchPost();
        showSuccess("댓글이 수정되었습니다");
      } else {
        showError(data.error || "댓글 수정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to edit comment:", error);
      showError("댓글 수정에 실패했습니다");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        await fetchPost();
        showSuccess("댓글이 삭제되었습니다");
      } else {
        showError(data.error || "댓글 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      showError("댓글 삭제에 실패했습니다");
    }
  };

  const handleAcceptComment = async (commentId: string) => {
    if (!confirm("이 답변을 채택하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/accept`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        await fetchPost();
        showSuccess("답변이 채택되었습니다");
      } else {
        showError(data.error || "답변 채택에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to accept comment:", error);
      showError("답변 채택에 실패했습니다");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        showSuccess("게시글이 삭제되었습니다");
        router.push("/community");
      } else {
        showError(data.error || "게시글 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      showError("게시글 삭제에 실패했습니다");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "NOTICE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "QNA":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "FREE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
          <div className="hidden md:block">
            <Navigation />
          </div>
          <div className="md:hidden">
            <MobileNavigation />
          </div>
          <main className="md:ml-64 p-4 md:p-8">
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (!post) {
    return null;
  }

  const isAuthor = session?.user?.id === post.author.id;
  const isAdmin = session?.user?.role === "ADMIN";
  const canEdit = isAuthor || isAdmin;
  const canAccept = post.category === "QNA" && isAuthor && !post.isResolved;

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

            {/* Post Content */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden mb-6">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  {post.isPinned && (
                    <span className="text-red-600 dark:text-red-400">📌</span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeColor(
                      post.category
                    )}`}
                  >
                    {CATEGORY_LABELS[post.category]}
                  </span>
                  {post.category === "QNA" && post.isResolved && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      ✓ 해결됨
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {post.title}
                </h1>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{post.author.name}</span>
                    <span>{formatDate(post.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {post.views}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Link
                        href={`/community/edit/${post.id}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        수정
                      </Link>
                      <button
                        onClick={handleDeletePost}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                    {post.content}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleLike}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isLiked
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  좋아요 {post.likesCount}
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  댓글 {post.comments.length}
                </h2>
              </div>

              {/* Comment Form */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSubmitComment}>
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="댓글을 입력하세요"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !commentContent.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {isSubmittingComment ? "작성 중..." : "댓글 작성"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Comment List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-6 ${
                      comment.isAccepted
                        ? "bg-green-50 dark:bg-green-900/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.author.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.isAccepted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            ✓ 채택된 답변
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canAccept && !comment.isAccepted && (
                          <button
                            onClick={() => handleAcceptComment(comment.id)}
                            className="text-sm text-green-600 dark:text-green-400 hover:underline"
                          >
                            채택
                          </button>
                        )}
                        {(session?.user?.id === comment.author.id || isAdmin) && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingContent(comment.content);
                              }}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="mt-3 flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingContent("");
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                          >
                            수정 완료
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                        {comment.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {post.comments.length === 0 && (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  첫 댓글을 작성해보세요
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
