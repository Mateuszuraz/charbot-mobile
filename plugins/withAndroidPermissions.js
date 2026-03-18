const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

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

// Adds proguard rules for llama.rn and whisper.rn to proguard-rules.pro
const withProguardRules = (config) => {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const proguardFile = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      const rules = `\n# llama.rn and whisper.rn\n-keep class com.rnllama.** { *; }\n-keep class com.rnwhisper.** { *; }\n`;
      const contents = fs.readFileSync(proguardFile, 'utf8');
      if (!contents.includes('com.rnllama')) {
        fs.writeFileSync(proguardFile, contents + rules);
      }
      return mod;
    },
  ]);
};

module.exports = (config) => {
  config = withRecordAudio(config);
  config = withProguardRules(config);
  return config;
};
