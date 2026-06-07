#!/usr/bin/env node
const http = require('http')
const { execSync } = require('child_process')

const SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = 8080

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/git-pull') {
    const secret = req.headers['x-webhook-secret']
    if (!SECRET || secret !== SECRET) {
      res.writeHead(401)
      return res.end(JSON.stringify({ error: 'Unauthorized' }))
    }
    try {
      const out = execSync('git -C /home/runner/workspace pull github main 2>&1', { timeout: 30000 }).toString()
      console.log('[webhook] git pull output:', out)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, output: out }))
    } catch (e) {
      console.error('[webhook] git pull error:', e.message)
      res.writeHead(500)
      res.end(JSON.stringify({ error: e.message }))
    }
  } else {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'webhook ready' }))
  }
})

server.listen(PORT, () => console.log(`[webhook] listening on :${PORT}`))
