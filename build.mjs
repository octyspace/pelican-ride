import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const { outputFiles } = await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  minify: true,
  legalComments: 'inline',
  format: 'iife',
  target: 'es2020',
  write: false,
});
const [template, style, license] = await Promise.all(
  ['src/index.html', 'src/style.css', 'node_modules/three/LICENSE'].map((f) => readFile(f, 'utf8')),
);
await writeFile(
  'index.html',
  template
    .replace('/*__STYLE__*/', () => style)
    .replace('/*__SCRIPT__*/', () =>
      ('/*! Three.js\n' + license + '*/\n' + outputFiles[0].text).replaceAll('</script', '<\\/script'),
    ),
);
