/**
 * GET  /api/pets  → 获取当前用户的所有宠物
 * POST /api/pets  → 创建新宠物档案
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createPet, getPetsByUserId } from '@/lib/petStore'

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token 已过期，请重新登录' }, { status: 401 })

  const pets = getPetsByUserId(payload.userId)
  return NextResponse.json({ pets })
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token 已过期，请重新登录' }, { status: 401 })

  const body = await req.json()
  const { name, breed, gender, neutered, ageMonths, weightKg } = body

  if (!name || !breed || !gender || ageMonths === undefined || !weightKg) {
    return NextResponse.json({ error: '缺少必填字段：name, breed, gender, ageMonths, weightKg' }, { status: 400 })
  }

  const pet = createPet(payload.userId, {
    name,
    breed,
    gender,
    neutered: Boolean(neutered),
    ageMonths: Number(ageMonths),
    weightKg: Number(weightKg),
  })

  return NextResponse.json({ pet }, { status: 201 })
}
