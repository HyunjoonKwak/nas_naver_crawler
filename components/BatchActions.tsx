"use client";

import { useState } from 'react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

interface BatchAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  confirmMessage?: string;
  action: (selectedIds: string[]) => Promise<void>;
}

interface BatchActionsProps {
  selectedIds: string[];
  totalCount: number;
  actions: BatchAction[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
}

export function BatchActions({
  selectedIds,
  totalCount,
  actions,
  onClearSelection,
  onSelectAll,
}: BatchActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const handleAction = async (action: BatchAction) => {
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) {
        return;
      }
    }

    setIsProcessing(true);
    setCurrentAction(action.id);

    try {
      await action.action(selectedIds);
      onClearSelection();
    } catch (error: any) {
      console.error(`Batch action ${action.id} failed:`, error);
      alert('작업 실행 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  const allSelected = selectedIds.length === totalCount;

  return (
    <div className="sticky top-16 z-40 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 py-3 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {selectedIds.length}개 선택됨
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectAll && !allSelected && (
              <button
                onClick={onSelectAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                전체 선택 ({totalCount}개)
              </button>
            )}
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              선택 해제
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              loading={isProcessing && currentAction === action.id}
              icon={action.icon}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 체크박스 선택 관리를 위한 Hook
 */
export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const selectAll = () => {
    setSelectedIds(items.map((item) => item.id));
  };

  const isSelected = (id: string) => selectedIds.includes(id);
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    selectAll,
    isSelected,
    isAllSelected,
    isPartiallySelected,
  };
}

/**
 * 체크박스 헤더 컴포넌트
 */
interface BatchCheckboxHeaderProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}

export function BatchCheckboxHeader({
  checked,
  indeterminate = false,
  onChange,
}: BatchCheckboxHeaderProps) {
  return (
    <th className="px-6 py-3 text-left">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
      />
    </th>
  );
}

/**
 * 체크박스 셀 컴포넌트
 */
interface BatchCheckboxCellProps {
  checked: boolean;
  onChange: () => void;
}

export function BatchCheckboxCell({ checked, onChange }: BatchCheckboxCellProps) {
  return (
    <td className="px-6 py-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
      />
    </td>
  );
}
