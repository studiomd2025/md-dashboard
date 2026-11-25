import { Capacitor } from '@capacitor/core';
import type { EventCountdown } from '../types';

interface MdWidgetBridgePlugin {
  setServerUrl(options: { url: string }): Promise<void>;
  refreshAllWidgets(): Promise<void>;
  syncCountdownSelection(options: {
    countdownId: string;
    title?: string;
    targetAt?: string;
    timeZone?: string;
    displayFormat?: string;
    tag?: string;
    location?: string;
    applyToPlacedWidgets?: boolean;
  }): Promise<void>;
  syncCountdowns(options: { countdownsJson: string }): Promise<void>;
  notifyEvent(options: {
    key: string;
    title: string;
    body: string;
    url?: string;
    openExternal?: boolean;
  }): Promise<{ shown?: boolean }>;
  checkNotificationsNow(): Promise<void>;
  getNotificationStatus(): Promise<{ enabled: boolean }>;
}

function getBridgePlugin(): MdWidgetBridgePlugin | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const capWin = window as Window & {
      Capacitor?: { Plugins?: { MdWidgetBridge?: MdWidgetBridgePlugin } };
    };
    return capWin.Capacitor?.Plugins?.MdWidgetBridge || null;
  } catch {
    return null;
  }
}

export function isNativeAndroidBridgeAvailable(): boolean {
  return Boolean(getBridgePlugin());
}

export async function syncCountdownSelectionToNative(
  countdown: EventCountdown,
  applyToPlacedWidgets = true
): Promise<void> {
  const plugin = getBridgePlugin();
  if (!plugin || !countdown?.id) return;
  try {
    await plugin.syncCountdownSelection({
      countdownId: countdown.id,
      title: countdown.title,
      targetAt: countdown.targetAt,
      timeZone: countdown.timeZone,
      displayFormat: countdown.displayFormat || 'd-day',
      tag: countdown.tag,
      location: countdown.location,
      applyToPlacedWidgets,
    });
  } catch {
    // ignore bridge errors when widget not placed or running on web
  }
}

export async function syncCountdownsToNative(
  countdowns: EventCountdown[]
): Promise<void> {
  const plugin = getBridgePlugin();
  if (!plugin || countdowns.length === 0) return;
  try {
    await plugin.syncCountdowns({
      countdownsJson: JSON.stringify(
        countdowns.map((c) => ({
          id: c.id,
          title: c.title,
          targetAt: c.targetAt,
          timeZone: c.timeZone || '',
          displayFormat: c.displayFormat || 'd-day',
          tag: c.tag || '',
          location: c.location || '',
        }))
      ),
    });
  } catch {
    // ignore
  }
}

export async function refreshAllNativeWidgets(): Promise<void> {
  const plugin = getBridgePlugin();
  if (!plugin) return;
  try {
    await plugin.refreshAllWidgets();
  } catch {
    // ignore
  }
}

export async function notifyNativeEvent(options: {
  key: string;
  title: string;
  body: string;
  url?: string;
  openExternal?: boolean;
}): Promise<boolean> {
  const plugin = getBridgePlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.notifyEvent(options);
    return Boolean(res?.shown);
  } catch {
    return false;
  }
}

export async function checkNativeNotificationsNow(): Promise<void> {
  const plugin = getBridgePlugin();
  if (!plugin) return;
  try {
    await plugin.checkNotificationsNow();
  } catch {
    // ignore
  }
}

export async function getNativeNotificationEnabled(): Promise<boolean | null> {
  const plugin = getBridgePlugin();
  if (!plugin) return null;
  try {
    const res = await plugin.getNotificationStatus();
    return Boolean(res?.enabled);
  } catch {
    return null;
  }
}
