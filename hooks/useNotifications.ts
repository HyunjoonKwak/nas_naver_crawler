import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  sendBrowserNotification,
  sendArticleNotification,
  sendPriceChangeNotification,
  sendCrawlCompleteNotification,
  type NotificationOptions,
  type ArticleNotificationData,
  type PriceChangeNotificationData,
  type CrawlCompleteNotificationData,
} from '@/lib/notifications/browser';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  const sendNotification = useCallback((options: NotificationOptions) => {
    return sendBrowserNotification(options);
  }, []);

  const sendArticle = useCallback((data: ArticleNotificationData) => {
    return sendArticleNotification(data);
  }, []);

  const sendPriceChange = useCallback((data: PriceChangeNotificationData) => {
    return sendPriceChangeNotification(data);
  }, []);

  const sendCrawlComplete = useCallback((data: CrawlCompleteNotificationData) => {
    return sendCrawlCompleteNotification(data);
  }, []);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    sendNotification,
    sendArticle,
    sendPriceChange,
    sendCrawlComplete,
  };
}
