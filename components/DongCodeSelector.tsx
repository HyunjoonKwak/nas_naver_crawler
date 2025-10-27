/**
 * 법정동코드 단계별 선택 컴포넌트
 * 시/도 → 시/군/구 → 읍/면/동 순으로 선택
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown } from "lucide-react";

interface DongCodeSelectorProps {
  onSelect: (lawdCd: string, fullName: string, dongName?: string) => void;
  value?: string;
}

interface SidoItem {
  code: string;
  name: string;
}

interface SigunguItem {
  code: string;
  name: string;
  fullCode: string;
}

interface DongItem {
  code: string;
  fullCode: string;
  name: string;
  fullName: string;
}

export default function DongCodeSelector({ onSelect, value }: DongCodeSelectorProps) {
  const [sidoList, setSidoList] = useState<SidoItem[]>([]);
  const [sigunguList, setSigunguList] = useState<SigunguItem[]>([]);
  const [dongList, setDongList] = useState<DongItem[]>([]);

  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");

  const [isLoadingSido, setIsLoadingSido] = useState(false);
  const [isLoadingSigungu, setIsLoadingSigungu] = useState(false);
  const [isLoadingDong, setIsLoadingDong] = useState(false);

  // 시/도 목록 로드
  useEffect(() => {
    loadSidoList();
  }, []);

  // 시/도 선택 시 시/군/구 목록 로드
  useEffect(() => {
    if (selectedSido) {
      loadSigunguList(selectedSido);
      setSelectedSigungu("");
      setSelectedDong("");
      setSigunguList([]);
      setDongList([]);
    }
  }, [selectedSido]);

  // 시/군/구 선택 시 읍/면/동 목록 로드 및 법정동코드 전달
  useEffect(() => {
    if (selectedSigungu) {
      const selected = sigunguList.find(s => s.code === selectedSigungu);
      if (selected) {
        // 시/군/구만 선택한 경우 5자리 코드 전달
        const sidoName = sidoList.find(s => s.code === selectedSido)?.name || "";
        onSelect(selected.fullCode, `${sidoName} ${selected.name}`);

        // 읍/면/동 목록도 로드 (선택 사항)
        loadDongList(selected.fullCode);
      }
      setSelectedDong("");
    }
  }, [selectedSigungu]);

  // 읍/면/동 선택 시 (선택 사항, 더 구체적인 검색 가능)
  useEffect(() => {
    if (selectedDong) {
      const selected = dongList.find(d => d.code === selectedDong);
      if (selected) {
        // 읍/면/동까지 선택했지만, 실거래가 API는 5자리만 사용하므로
        // 시/군/구 코드 유지하고 이름 + 읍면동명 전달
        const sigungu = sigunguList.find(s => s.code === selectedSigungu);
        if (sigungu) {
          onSelect(sigungu.fullCode, selected.fullName, selected.name);
        }
      }
    }
  }, [selectedDong, dongList, sigunguList, selectedSigungu, onSelect]);

  const loadSidoList = async () => {
    setIsLoadingSido(true);
    try {
      const response = await fetch('/api/dong-code/sido');
      const data = await response.json();
      if (data.success) {
        setSidoList(data.results);
      }
    } catch (error) {
      console.error('Failed to load sido list:', error);
    } finally {
      setIsLoadingSido(false);
    }
  };

  const loadSigunguList = async (sidoCode: string) => {
    setIsLoadingSigungu(true);
    try {
      const response = await fetch(`/api/dong-code/sigungu?sidoCode=${sidoCode}`);
      const data = await response.json();
      if (data.success) {
        setSigunguList(data.results);
      }
    } catch (error) {
      console.error('Failed to load sigungu list:', error);
    } finally {
      setIsLoadingSigungu(false);
    }
  };

  const loadDongList = async (sggCode: string) => {
    setIsLoadingDong(true);
    try {
      const response = await fetch(`/api/dong-code/dong?sggCode=${sggCode}`);
      const data = await response.json();
      if (data.success) {
        setDongList(data.results);
      }
    } catch (error) {
      console.error('Failed to load dong list:', error);
    } finally {
      setIsLoadingDong(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 시/도 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          시/도
        </label>
        <div className="relative">
          <select
            value={selectedSido}
            onChange={(e) => setSelectedSido(e.target.value)}
            disabled={isLoadingSido}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none text-gray-900 dark:text-white"
          >
            <option value="" className="text-gray-500">시/도 선택</option>
            {sidoList.map((sido) => (
              <option key={sido.code} value={sido.code} className="text-gray-900 dark:text-white">
                {sido.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
          {isLoadingSido && (
            <Loader2 className="absolute right-10 top-2.5 w-5 h-5 animate-spin text-blue-500" />
          )}
        </div>
      </div>

      {/* 시/군/구 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          시/군/구
        </label>
        <div className="relative">
          <select
            value={selectedSigungu}
            onChange={(e) => setSelectedSigungu(e.target.value)}
            disabled={!selectedSido || isLoadingSigungu}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="" className="text-gray-500">시/군/구 선택</option>
            {sigunguList.map((sigungu) => (
              <option key={sigungu.code} value={sigungu.code} className="text-gray-900 dark:text-white">
                {sigungu.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
          {isLoadingSigungu && (
            <Loader2 className="absolute right-10 top-2.5 w-5 h-5 animate-spin text-blue-500" />
          )}
        </div>
      </div>

      {/* 읍/면/동 선택 (선택 사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          읍/면/동 <span className="text-xs text-gray-500">(선택)</span>
        </label>
        <div className="relative">
          <select
            value={selectedDong}
            onChange={(e) => setSelectedDong(e.target.value)}
            disabled={!selectedSigungu || isLoadingDong || dongList.length === 0}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="" className="text-gray-500">읍/면/동 선택</option>
            {dongList.map((dong) => (
              <option key={dong.code} value={dong.code} className="text-gray-900 dark:text-white">
                {dong.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
          {isLoadingDong && (
            <Loader2 className="absolute right-10 top-2.5 w-5 h-5 animate-spin text-blue-500" />
          )}
        </div>
      </div>
    </div>
  );
}
