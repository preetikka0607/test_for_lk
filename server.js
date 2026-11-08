import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.PORT || 3000)
const distDirectory = path.resolve('dist')

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    const pathname = decodeURIComponent(url.pathname)
    const requestedFile = pathname === '/' ? '/index.html' : pathname

    const filePath = path.resolve(distDirectory, `.${requestedFile}`)

    if (!filePath.startsWith(distDirectory + path.sep)) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    const content = await readFile(filePath)
    const extension = path.extname(filePath)

    response.writeHead(200, {
      'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    })

    response.end(content)
  } catch {
    response.writeHead(404)
    response.end('File not found')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Vue app is available at http://localhost:${port}`)
})
