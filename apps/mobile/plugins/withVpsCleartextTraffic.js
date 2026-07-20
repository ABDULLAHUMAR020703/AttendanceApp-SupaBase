/**
 * TEMPORARY Expo config plugin — internal testing only.
 *
 * Writes a Network Security Config that permits cleartext HTTP only to
 * 91.98.153.199, and wires it on the release AndroidManifest application tag.
 *
 * Remove this plugin from app.json (and delete this file) once the backend
 * is served over HTTPS.
 *
 * Note: When android:networkSecurityConfig is set, android:usesCleartextTraffic
 * is ignored by the platform — scoped domain-config is the correct approach.
 */
const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const CLEARTEXT_HOST = '91.98.153.199';

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  TEMPORARY — internal testing only.
  Allows cleartext HTTP solely to the VPS API gateway host (${CLEARTEXT_HOST}).
  Remove this file and the android:networkSecurityConfig attribute from
  AndroidManifest.xml once the backend is served over HTTPS.
-->
<network-security-config>
    <!-- Keep cleartext disabled for all other hosts. -->
    <base-config cleartextTrafficPermitted="false" />

    <!-- Opt in cleartext only for the temporary VPS IP used by apiGatewayUrl. -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">${CLEARTEXT_HOST}</domain>
    </domain-config>
</network-security-config>
`;

function withVpsCleartextTraffic(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(xmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG_XML,
        'utf8'
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    // TEMPORARY: scoped cleartext via network_security_config.xml (see comment in that file).
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
}

module.exports = withVpsCleartextTraffic;
