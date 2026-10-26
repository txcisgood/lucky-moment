import { build } from 'esbuild';
await build({
  entryPoints: ['src/desktop/main.ts'], outfile: 'dist-electron/main.cjs',
  bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron'],
});
await build({
  entryPoints: ['src/desktop/preload.ts'], outfile: 'dist-electron/preload.cjs',
  bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron'],
});
