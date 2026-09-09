// Format optimisation only. Composition and clipping happen in the live canvas.
// Pass the directory containing the six user-supplied source screenshots.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const source = process.argv[2]
if(!source)throw new Error('Usage: node tools/prepare-art.mjs <screenshots-directory>')
const files = [['235253','ram'],['235313','goose'],['235325','tiger'],['235155','knight'],['235413','toucan'],['235351','harpy']]
await mkdir(new URL('../assets/art/',import.meta.url),{recursive:true})
for(const [time,name] of files){
  const output=new URL(`../assets/art/${name}.webp`,import.meta.url)
  const result=await sharp(resolve(source,`Screenshot 2026-09-07 ${time}.png`)).webp({quality:88,effort:6}).toFile(fileURLToPath(output))
  console.log(`${name}: ${result.width}×${result.height}, ${Math.round(result.size/1024)} KB`)
}
