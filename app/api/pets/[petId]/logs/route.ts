/**
 * /api/pets/[petId]/logs — V1.2 已迁移至客户端 localStorage（petLocalStore）
 * 此路由保留仅为兼容性占位，不再执行实际逻辑。
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: '已迁移至客户端存储，此端点已停用' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: '已迁移至客户端存储，此端点已停用' }, { status: 410 })
}
