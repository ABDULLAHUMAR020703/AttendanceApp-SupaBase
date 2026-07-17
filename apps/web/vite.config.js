import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogCjsPath = path.resolve(__dirname, '../../shared/permissions/catalog.cjs');
const catalogVirtualId = '\0shared-permissions-catalog';

/**
 * Loads shared/permissions/catalog.cjs at build/dev time (Node) and exposes
 * proper ESM named exports to the browser bundle.
 */
function sharedPermissionsCatalogPlugin() {
  const require = createRequire(import.meta.url);

  function loadCatalogModule() {
    return require(catalogCjsPath);
  }

  function toEsmSource(catalog) {
    const lines = Object.entries(catalog).map(([key, value]) => {
      if (typeof value === 'function') {
        return `export const ${key} = ${value.toString()};`;
      }
      return `export const ${key} = ${JSON.stringify(value)};`;
    });
    lines.push(`export default { ${Object.keys(catalog).join(', ')} };`);
    return lines.join('\n');
  }

  return {
    name: 'shared-permissions-catalog',
    enforce: 'pre',
    resolveId(source) {
      const normalized = source.replace(/\\/g, '/');
      if (
        source === '@shared/permissions/catalog.cjs' ||
        normalized.endsWith('/shared/permissions/catalog.cjs')
      ) {
        return catalogVirtualId;
      }
      return null;
    },
    load(id) {
      if (id !== catalogVirtualId) return null;
      return toEsmSource(loadCatalogModule());
    },
  };
}

export default defineConfig({
  plugins: [react(), sharedPermissionsCatalogPlugin()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
    },
  },
  server: {
    host: true,
    fs: { allow: [path.resolve(__dirname, '../..')] },
  },
});
