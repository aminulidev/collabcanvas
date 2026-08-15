/**
 * POST /api/generate-image
 * ------------------------------------------------------------------
 * Generates an image node asset via the z-ai-web-dev-sdk and returns a
 * relative URL that is safe to store in the CRDT (every peer loads it
 * from the same origin).
 *
 * Body: { prompt: string }
 * Returns: { imageUrl: string, prompt: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

const OUTPUT_DIR = join(process.cwd(), 'public', 'generated')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) {
      return NextResponse.json(
        { error: 'A "prompt" string is required.' },
        { status: 400 }
      )
    }

    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const zai = await ZAI.create()
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    })

    const base64 = response.data?.[0]?.base64
    if (!base64) {
      return NextResponse.json(
        { error: 'Image generation returned no data.' },
        { status: 502 }
      )
    }

    const filename = `img_${Date.now()}_${randomBytes(4).toString('hex')}.png`
    const filepath = join(OUTPUT_DIR, filename)
    writeFileSync(filepath, Buffer.from(base64, 'base64'))

    return NextResponse.json({
      imageUrl: `/generated/${filename}`,
      prompt,
    })
  } catch (err) {
    console.error('[generate-image] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Unknown image generation error',
      },
      { status: 500 }
    )
  }
}
