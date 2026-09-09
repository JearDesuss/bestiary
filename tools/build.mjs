import { cp, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = new URL('../', import.meta.url)
// Fail rather than deploying a page with missing artwork.
for (const name of ['ram','goose','tiger','knight','toucan','harpy'])
  await stat(new URL(`assets/art/${name}.webp`, root))
await mkdir(new URL('dist/', root), {recursive:true})
await cp(new URL('index.html',root),new URL('dist/index.html',root))
await cp(new URL('assets/',root),new URL('dist/assets/',root),{recursive:true})
console.log(`Built static website: ${fileURLToPath(new URL('dist/',root))}`)
