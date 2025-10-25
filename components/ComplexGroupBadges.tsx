"use client";

import { useState, useEffect } from 'react';
import { Badge, Modal, Button } from '@/components/ui';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

interface Group {
  id: string;
  name: string;
  color?: string;
}

interface ComplexGroup {
  id: string;
  name: string;
  color?: string;
}

interface ComplexGroupBadgesProps {
  complexId: string;
  complexName: string;
  groups: ComplexGroup[];
  onGroupsChange: () => void;
}

export function ComplexGroupBadges({ complexId, complexName, groups, onGroupsChange }: ComplexGroupBadgesProps) {
  const [showModal, setShowModal] = useState(false);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetchAllGroups();
    }
  }, [showModal]);

  useEffect(() => {
    setSelectedGroups(new Set(groups.map(g => g.id)));
  }, [groups]);

  const fetchAllGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      if (data.success) {
        setAllGroups(data.groups || []);
      }
    } catch (error: any) {
      console.error('그룹 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSave = async () => {
    const currentGroupIds = new Set(groups.map(g => g.id));
    const toAdd = Array.from(selectedGroups).filter(id => !currentGroupIds.has(id));
    const toRemove = groups.filter(g => !selectedGroups.has(g.id)).map(g => g.id);

    const loadingToast = showLoading('그룹 변경 중...');
    try {
      // 추가할 그룹이 있으면
      for (const groupId of toAdd) {
        await fetch(`/api/groups/${groupId}/complexes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complexIds: [complexId] }),
        });
      }

      // 제거할 그룹이 있으면
      for (const groupId of toRemove) {
        await fetch(`/api/groups/${groupId}/complexes?complexIds=${complexId}`, {
          method: 'DELETE',
        });
      }

      dismissToast(loadingToast);
      showSuccess('그룹이 변경되었습니다.');
      setShowModal(false);
      onGroupsChange();
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('그룹 변경 오류:', error);
      showError('그룹 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {groups.map((group) => (
          <Badge
            key={group.id}
            style={{
              backgroundColor: group.color || '#3b82f6',
              color: '#ffffff'
            }}
          >
            {group.name}
          </Badge>
        ))}
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-500 dark:hover:border-blue-400 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          title="그룹 관리"
        >
          + 그룹
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${complexName} - 그룹 관리`}
      >
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : allGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              생성된 그룹이 없습니다.
              <br />
              <span className="text-sm">먼저 그룹을 생성해주세요.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {group.name}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
