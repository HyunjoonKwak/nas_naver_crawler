"use client";

import { useNotifications } from '@/hooks/useNotifications';

export function NotificationSettings() {
  const notifications = useNotifications();

  const handleRequestPermission = async () => {
    const permission = await notifications.requestPermission();
    if (permission === 'granted') {
      // 테스트 알림 전송
      notifications.sendNotification({
        title: '알림이 활성화되었습니다',
        body: '이제 중요한 업데이트를 실시간으로 받아보실 수 있습니다.',
        icon: '/icon-192x192.png',
      });
    }
  };

  const handleTestNotification = () => {
    notifications.sendNotification({
      title: '테스트 알림',
      body: '알림이 정상적으로 작동하고 있습니다.',
      icon: '/icon-192x192.png',
    });
  };

  if (!notifications.isSupported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              알림이 지원되지 않습니다
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              현재 브라우저는 알림 기능을 지원하지 않습니다. 최신 브라우저를 사용해 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 알림 상태 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              notifications.isGranted
                ? 'bg-green-500'
                : notifications.isDenied
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`} />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                브라우저 알림
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {notifications.isGranted
                  ? '활성화됨 - 중요한 업데이트를 받을 수 있습니다'
                  : notifications.isDenied
                  ? '차단됨 - 브라우저 설정에서 권한을 허용해주세요'
                  : '비활성화됨 - 알림을 받으려면 권한을 허용해주세요'}
              </p>
            </div>
          </div>

          {!notifications.isGranted && !notifications.isDenied && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              알림 허용
            </button>
          )}

          {notifications.isGranted && (
            <button
              onClick={handleTestNotification}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              테스트 알림
            </button>
          )}
        </div>
      </div>

      {/* 알림 종류 안내 */}
      {notifications.isGranted && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
            받을 수 있는 알림
          </h4>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>새 매물 등록</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>가격 변동</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>크롤링 완료</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>알림 설정 조건 충족</span>
            </li>
          </ul>
        </div>
      )}

      {/* 차단된 경우 안내 */}
      {notifications.isDenied && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
            알림 권한이 차단되었습니다
          </h4>
          <p className="text-sm text-red-800 dark:text-red-300 mb-3">
            브라우저 설정에서 알림 권한을 허용해주세요.
          </p>
          <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
            <p><strong>Chrome:</strong> 주소창 왼쪽 자물쇠 아이콘 → 사이트 설정 → 알림</p>
            <p><strong>Safari:</strong> Safari 메뉴 → 환경설정 → 웹사이트 → 알림</p>
            <p><strong>Firefox:</strong> 주소창 왼쪽 자물쇠 아이콘 → 권한 → 알림</p>
          </div>
        </div>
      )}
    </div>
  );
}
