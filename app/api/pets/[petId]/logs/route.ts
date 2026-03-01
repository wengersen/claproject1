/**
 * GET  /api/pets/[petId]/logs  → 获取宠物日志列表（倒序）
 * POST /api/pets/[petId]/logs  → 添加一条健康记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { isPetOwner, addHealthLog, getLogsByPetId } from '@/lib/petStore'

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: { petId: string } }
) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token 已过期' }, { status: 401 })

  const { petId } = params
  if (!isPetOwner(petId, payload.userId)) {
    return NextResponse.json({ error: '无权限访问此宠物档案' }, { status: 403 })
  }

  const logs = getLogsByPetId(petId)
  return NextResponse.json({ logs })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { petId: string } }
) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token 已过期' }, { status: 401 })

  const { petId } = params
  if (!isPetOwner(petId, payload.userId)) {
    return NextResponse.json({ error: '无权限访问此宠物档案' }, { status: 403 })
  }

  const body = await req.json()
  const { date, appetite, energy, drinking, stool, vomiting, weightKg, notes } = body

  if (!date || !appetite || !energy || !drinking || !stool || !vomiting) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }

  const log = addHealthLog({
    petId,
    userId: payload.userId,
    date,
    appetite,
    energy,
    drinking,
    stool,
    vomiting,
    weightKg: weightKg ? Number(weightKg) : undefined,
    notes,
  })

  return NextResponse.json({ log }, { status: 201 })
}
