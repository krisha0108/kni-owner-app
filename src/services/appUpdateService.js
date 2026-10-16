// src/services/appUpdateService.js — two independent update checks, run
// together on every app launch (see App.js):
//
// 1. checkForceUpdate() - our own Admin Panel -> App Version config
//    (AppVersionConfig, via /api/public/app-version). This is the
//    "kill switch": admin can force everyone below a given versionCode to
//    stop using the app immediately, without waiting on Play Store rollout,
//    and without any app rebuild.
// 2. checkPlayStoreUpdate() - Google's own Play Core "in-app update" API
//    (via sp-react-native-in-app-updates). Zero-maintenance: as soon as a
//    new version is published on Play Store, this detects it and shows
//    Google's native update prompt automatically. Only works for installs
//    that came from Play Store (not sideloaded APKs) and only in a
//    release build signed with the Play Store signing key.
//
// Both fail open: any network/parsing error is swallowed and treated as
// "no update needed" rather than blocking the app, so a flaky connection
// or a backend hiccup never bricks anyone's login.
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';
import { api } from '../api/client';

const inAppUpdates = new SpInAppUpdates(__DEV__);

export async function checkForceUpdate() {
  try {
    const { data } = await api.get('/public/app-version', {
      params: { app: 'owner', platform: Platform.OS },
    });

    if (!data?.ok || !data.data) return null;

    const config = data.data;
    const currentVersionCode = Number(DeviceInfo.getBuildNumber());

    if (!currentVersionCode || Number.isNaN(currentVersionCode)) return null;
    if (currentVersionCode >= config.minSupportedVersionCode) return null;

    return {
      blocking: !!config.forceUpdate,
      message: config.updateMessage,
      storeUrl: config.storeUrl,
      latestVersionName: config.latestVersionName,
    };
  } catch (err) {
    if (__DEV__) console.log('⚠️ Force-update check failed (ignored):', err?.message);
    return null;
  }
}

export async function checkPlayStoreUpdate() {
  if (Platform.OS !== 'android') return;
  try {
    const result = await inAppUpdates.checkNeedsUpdate();
    if (result.shouldUpdate) {
      await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
    }
  } catch (err) {
    // Expected to "fail" on a debug build, a sideloaded APK, or when the
    // Play Store account on-device never installed this app - none of
    // those are real errors, so this is intentionally silent in release.
    if (__DEV__) console.log('⚠️ Play Store in-app-update check failed (ignored):', err?.message);
  }
}
