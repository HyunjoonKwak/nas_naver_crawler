"use client";

import { useState, useEffect } from 'react';
import { Button, Modal, Badge } from '@/components/ui';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

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
}

export function GroupManagement({ selectedGroupId, onGroupSelect, onGroupsChange }: GroupManagementProps) {
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
          + 새 그룹
        </Button>
      </div>

      {/* 그룹 목록 */}
      <div className="space-y-2">
        {/* 전체 보기 */}
        <button
          onClick={() => onGroupSelect(null)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
            selectedGroupId === null
              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
              : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="font-medium text-gray-900 dark:text-gray-100">
            📋 전체 단지
          </span>
          <Badge variant="secondary">
            {groups.reduce((sum, g) => sum + g.complexCount, 0)}
          </Badge>
        </button>

        {/* 그룹 목록 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            생성된 그룹이 없습니다.
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <button
                onClick={() => onGroupSelect(group.id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color || '#3b82f6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {group.name}
                  </div>
                  {group.description && (
                    <div className="text-sm text-gray-500 truncate">
                      {group.description}
                    </div>
                  )}
                </div>
                <Badge variant="secondary">{group.complexCount}</Badge>
              </button>

              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                  title="수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  title="삭제"
                >
                  🗑️
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
