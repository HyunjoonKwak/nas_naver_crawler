"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useApiCall } from "@/hooks/useApiCall";

export const UsefulLinksSection = () => {
  const { handleApiCall } = useApiCall();

  // Useful links states
  const [links, setLinks] = useState<any[]>([]);
  const [groupedLinks, setGroupedLinks] = useState<Record<string, any[]>>({});
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    description: '',
    category: 'reference',
    icon: '🔗',
    order: 0,
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await fetch('/api/useful-links');
      const data = await response.json();
      if (data.success) {
        setLinks(data.links);
        setGroupedLinks(data.groupedLinks);
      }
    } catch (error: any) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleAddLink = () => {
    setEditingLink(null);
    setLinkForm({
      title: '',
      url: '',
      description: '',
      category: 'reference',
      icon: '🔗',
      order: 0,
    });
    setShowLinkModal(true);
  };

  const handleEditLink = (link: any) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      category: link.category,
      icon: link.icon || '🔗',
      order: link.order || 0,
    });
    setShowLinkModal(true);
  };

  const handleSaveLink = async () => {
    const method = editingLink ? 'PUT' : 'POST';
    const body = editingLink
      ? { id: editingLink.id, ...linkForm }
      : linkForm;

    const result = await handleApiCall({
      method,
      url: '/api/useful-links',
      body,
      loadingMessage: editingLink ? '링크 수정 중...' : '링크 추가 중...',
      successMessage: editingLink ? '링크가 수정되었습니다.' : '링크가 추가되었습니다.',
      errorPrefix: '저장 실패',
      onSuccess: async () => {
        setShowLinkModal(false);
        await fetchLinks();
      }
    });
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return;

    await handleApiCall({
      method: 'DELETE',
      url: `/api/useful-links?id=${id}`,
      loadingMessage: '링크 삭제 중...',
      successMessage: '링크가 삭제되었습니다.',
      errorPrefix: '삭제 실패',
      onSuccess: fetchLinks
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
              유용한 정보
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              부동산 크롤링 및 분석에 도움이 되는 사이트 모음
            </p>
          </div>
          <button
            onClick={handleAddLink}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
          >
            ➕ 링크 추가
          </button>
        </div>

        {linksLoading ? (
          <LoadingSpinner color="emerald-600" />
        ) : Object.keys(groupedLinks).length === 0 ? (
          <EmptyState
            icon="📌"
            title="등록된 링크가 없습니다"
            description="유용한 사이트를 추가해보세요"
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLinks).map(([category, categoryLinks]) => {
              const categoryInfo: Record<string, { title: string; icon: string; color: string }> = {
                geocoding: { title: '지오코딩', icon: '🗺️', color: 'blue' },
                transaction: { title: '실거래가', icon: '💰', color: 'green' },
                reference: { title: '참고자료', icon: '📚', color: 'purple' },
                api: { title: 'API', icon: '🔌', color: 'orange' },
                tool: { title: '도구', icon: '🛠️', color: 'cyan' },
              };

              const info = categoryInfo[category] || { title: category, icon: '🔗', color: 'gray' };

              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className={`bg-gradient-to-r from-${info.color}-600 to-${info.color}-700 px-4 py-3`}>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.title}</span>
                      <span className="text-sm font-normal opacity-80">({categoryLinks.length})</span>
                    </h3>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryLinks.map((link: any) => (
                      <div
                        key={link.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{link.icon || '🔗'}</span>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {link.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditLink(link)}
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              title="수정"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              title="삭제"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {link.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {link.description}
                          </p>
                        )}

                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all flex items-center gap-1"
                        >
                          <span>🔗</span>
                          <span className="truncate">{link.url}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {editingLink ? '✏️ 링크 수정' : '➕ 링크 추가'}
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  유용한 사이트 정보를 입력하세요
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder="예: 카카오 지도 API"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  placeholder="간단한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리 *
                  </label>
                  <select
                    value={linkForm.category}
                    onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="geocoding">지오코딩</option>
                    <option value="transaction">실거래가</option>
                    <option value="reference">참고자료</option>
                    <option value="api">API</option>
                    <option value="tool">도구</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    아이콘 선택
                  </label>
                  <div className="grid grid-cols-8 gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 max-h-32 overflow-y-auto">
                    {[
                      '🗺️', '📍', '🌏', '🧭', // 지오코딩/지도
                      '💰', '💵', '💴', '📈', '📊', // 실거래가/금융
                      '📚', '📖', '📝', '📄', '📋', // 참고자료/문서
                      '🔌', '⚡', '🔗', '🌐', // API/네트워크
                      '🛠️', '⚙️', '🔧', '🔨', // 도구
                      '🏢', '🏠', '🏘️', '🏗️', // 부동산
                      '📱', '💻', '🖥️', '⌨️', // 디지털/기술
                      '🔍', '🔎', '📡', '🎯', // 검색/분석
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLinkForm({ ...linkForm, icon: emoji })}
                        className={`text-lg p-2 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors ${
                          linkForm.icon === emoji ? 'bg-emerald-200 dark:bg-emerald-900/50 ring-2 ring-emerald-500' : ''
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={linkForm.icon}
                      onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                      placeholder="또는 직접 입력"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <span className="text-xl">{linkForm.icon}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveLink}
                  disabled={!linkForm.title || !linkForm.url || !linkForm.category}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {editingLink ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
