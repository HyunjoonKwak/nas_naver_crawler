"use client";

import { useState, useEffect } from 'react';
import { Button, Modal, Badge } from '@/components/ui';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { Plus, Edit3, Trash2, List } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type: string;
  complexCount: number;
}

interface GroupManagementProps {
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
  onGroupsChange: () => void;
  onAddComplexClick?: () => void; // 단지 추가 버튼 클릭 핸들러
  refreshTrigger?: number; // 외부에서 강제로 새로고침을 트리거하기 위한 카운터
}

export function GroupManagement({ selectedGroupId, onGroupSelect, onGroupsChange, onAddComplexClick, refreshTrigger }: GroupManagementProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // 폼 상태
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupColor, setGroupColor] = useState('#3b82f6');

  // 미리 정의된 색상 팔레트
  const colorPalette = [
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#eab308', // Yellow
    '#84cc16', // Lime
    '#22c55e', // Green
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#0ea5e9', // Sky
  ];

  useEffect(() => {
    fetchGroups();
  }, []);

  // refreshTrigger가 변경될 때마다 그룹 목록 새로고침
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchGroups();
    }
  }, [refreshTrigger]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('그룹 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showError('그룹 이름을 입력해주세요.');
      return;
    }

    const loadingToast = showLoading('그룹 생성 중...');
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: groupColor,
        }),
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess('그룹이 생성되었습니다.');
        setShowCreateModal(false);
        resetForm();
        fetchGroups();
        onGroupsChange();
      } else {
        showError(data.error || '그룹 생성에 실패했습니다.');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('그룹 생성 오류:', error);
      showError('그룹 생성 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !groupName.trim()) {
      showError('그룹 이름을 입력해주세요.');
      return;
    }

    const loadingToast = showLoading('그룹 수정 중...');
    try {
      const response = await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: groupColor,
        }),
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess('그룹이 수정되었습니다.');
        setShowEditModal(false);
        setEditingGroup(null);
        resetForm();
        fetchGroups();
        onGroupsChange();
      } else {
        showError(data.error || '그룹 수정에 실패했습니다.');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('그룹 수정 오류:', error);
      showError('그룹 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹을 삭제하시겠습니까?\n\n그룹에 속한 단지들은 유지되며, 그룹 관계만 해제됩니다.`)) {
      return;
    }

    const loadingToast = showLoading('그룹 삭제 중...');
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess('그룹이 삭제되었습니다.');
        if (selectedGroupId === groupId) {
          onGroupSelect(null);
        }
        fetchGroups();
        onGroupsChange();
      } else {
        showError(data.error || '그룹 삭제에 실패했습니다.');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('그룹 삭제 오류:', error);
      showError('그룹 삭제 중 오류가 발생했습니다.');
    }
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupColor(group.color || '#3b82f6');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupColor('#3b82f6');
  };

  return (
    <div className="space-y-4">
      {/* 단지 추가 섹션 - 강조 */}
      {onAddComplexClick && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">
                단지 추가하기
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-300 mb-3">
                단지를 추가하고 매물을 수집하세요
              </p>
              <button
                onClick={onAddComplexClick}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm shadow-md"
              >
                <Plus className="w-4 h-4 inline-block mr-1" />
                단지 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 구분선 */}
      {onAddComplexClick && (
        <div className="border-t border-gray-200 dark:border-gray-700"></div>
      )}

      {/* 헤더 - 축소 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          그룹 관리
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          그룹
        </Button>
      </div>

      {/* 그룹 목록 - 축소 */}
      <div className="space-y-1.5">
        {/* 전체 보기 - 축소 */}
        <button
          onClick={() => onGroupSelect(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            selectedGroupId === null
              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
              : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            <List className="w-4 h-4" />
            <span>전체</span>
          </span>
          <Badge variant="secondary">
            {groups.reduce((sum, g) => sum + g.complexCount, 0)}
          </Badge>
        </button>

        {/* 그룹 목록 - 축소 */}
        {loading ? (
          <div className="text-center py-4 text-sm text-gray-500">로딩 중...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            그룹 없음
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <button
                onClick={() => onGroupSelect(group.id)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color || '#3b82f6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {group.name}
                  </div>
                </div>
                <Badge variant="secondary">{group.complexCount}</Badge>
              </button>

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                  title="수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 생성 모달 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="새 그룹 만들기"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              그룹 이름 *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: 강남구, 관심지역, 투자후보"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="그룹에 대한 간단한 설명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              색상
            </label>
            <div className="grid grid-cols-8 gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => setGroupColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    groupColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              취소
            </Button>
            <Button variant="primary" onClick={handleCreateGroup}>
              생성
            </Button>
          </div>
        </div>
      </Modal>

      {/* 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingGroup(null);
          resetForm();
        }}
        title="그룹 수정"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              그룹 이름 *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              색상
            </label>
            <div className="grid grid-cols-8 gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => setGroupColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    groupColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingGroup(null);
                resetForm();
              }}
            >
              취소
            </Button>
            <Button variant="primary" onClick={handleUpdateGroup}>
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
