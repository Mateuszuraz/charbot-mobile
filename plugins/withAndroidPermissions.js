const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

// Adds RECORD_AUDIO permission to AndroidManifest.xml
const withRecordAudio = (config) => {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];
    const hasRecordAudio = permissions.some(
      (p) => p.$?.['android:name'] === 'android.permission.RECORD_AUDIO'
    );
    if (!hasRecordAudio) {
      permissions.push({ $: { 'android:name': 'android.permission.RECORD_AUDIO' } });
      manifest.manifest['uses-permission'] = permissions;
    }
    return mod;
  });
};

// Adds proguard rules for llama.rn and whisper.rn
const withProguardRules = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const rules = `
# llama.rn and whisper.rn
-keep class com.rnllama.** { *; }
-keep class com.rnwhisper.** { *; }
`;
    if (!mod.modResults.contents.includes('com.rnllama')) {
      mod.modResults.contents += rules;
    }
    return mod;
  });
};

module.exports = (config) => {
  config = withRecordAudio(config);
  config = withProguardRules(config);
  return config;
};
