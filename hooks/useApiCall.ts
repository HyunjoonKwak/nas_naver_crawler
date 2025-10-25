import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";

interface ApiCallConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: any;
  loadingMessage: string;
  successMessage: string;
  errorPrefix?: string;
  onSuccess?: () => Promise<void> | void;
}

export const useApiCall = () => {
  const handleApiCall = async (config: ApiCallConfig) => {
    const loadingToast = showLoading(config.loadingMessage);

    try {
      const options: RequestInit = {
        method: config.method,
      };

      if (config.body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(config.body);
      }

      const response = await fetch(config.url, options);

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(config.successMessage);
        if (config.onSuccess) {
          await config.onSuccess();
        }
        return { success: true, data: await response.json().catch(() => ({})) };
      } else {
        const error = await response.json();
        const errorMsg = config.errorPrefix
          ? `${config.errorPrefix}: ${error.error}`
          : error.error;
        showError(errorMsg);
        return { success: false, error: error.error };
      }
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('API Call Error:', error);
      const errorMsg = config.errorPrefix
        ? `${config.errorPrefix} 중 오류가 발생했습니다.`
        : '오류가 발생했습니다.';
      showError(errorMsg);
      return { success: false, error };
    }
  };

  return { handleApiCall };
};
