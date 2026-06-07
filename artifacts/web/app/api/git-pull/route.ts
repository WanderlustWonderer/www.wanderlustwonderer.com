import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const output = execSync(
      'git -C /home/runner/workspace pull github main 2>&1',
      { timeout: 30000 }
    ).toString()
    return NextResponse.json({ ok: true, output })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
