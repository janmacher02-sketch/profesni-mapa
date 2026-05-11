import { readFile } from 'node:fs/promises'

const host = 'profesni-mapa.vercel.app'
const key = '9d7f42b8c6e24f9aa8b32d55c7819e04'
const keyLocation = `https://${host}/${key}.txt`
const endpoint = 'https://api.indexnow.org/indexnow'
const sitemapPath = new URL('../public/sitemap.xml', import.meta.url)
const dryRun = process.env.INDEXNOW_DRY_RUN === '1'

function extractUrls(sitemap) {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => url.startsWith(`https://${host}/`))
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const sitemap = await readFile(sitemapPath, 'utf8')
const urls = extractUrls(sitemap)

if (urls.length === 0) {
  throw new Error('No URLs found in public/sitemap.xml')
}

console.log(`Preparing ${urls.length} URLs for IndexNow`)

if (dryRun) {
  console.log(JSON.stringify({ host, keyLocation, count: urls.length, sample: urls.slice(0, 5) }, null, 2))
  process.exit(0)
}

const batches = chunk(urls, 10000)

for (const [index, urlList] of batches.entries()) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  })

  const body = await response.text()

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow batch ${index + 1}/${batches.length} failed with ${response.status}: ${body}`)
  }

  console.log(`IndexNow batch ${index + 1}/${batches.length}: ${response.status} ${response.statusText}`)
}
