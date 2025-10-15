import toast from 'react-hot-toast';

/**
 * Toast 유틸리티 함수 모음
 */

export const showSuccess = (message: string) => {
  return toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};

export const showError = (message: string) => {
  return toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

export const showInfo = (message: string) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
  });
};

/**
 * Promise 기반 토스트 - 자동으로 로딩 → 성공/실패 전환
 * @param promise 실행할 Promise
 * @param messages 각 상태별 메시지
 * @returns Promise
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: 'top-right',
    }
  );
};

/**
 * 사용자 정의 토스트
 * @param message 메시지
 * @param options 옵션
 */
export const showCustom = (
  message: string,
  options?: {
    icon?: string;
    duration?: number;
    style?: React.CSSProperties;
  }
) => {
  return toast(message, {
    duration: options?.duration || 3000,
    position: 'top-right',
    icon: options?.icon,
    style: options?.style,
  });
};

/**
 * 토스트 닫기
 * @param toastId 토스트 ID (showLoading 등에서 반환된 값)
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * 모든 토스트 닫기
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};
