// app/api/bank-accounts/[id]/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'

async function getOwnedAccount(id, userId) {
  return prisma.bankAccount.findFirst({ where: { id, userId } })
}

// PATCH: edit label/details, OR set this account as default 
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const account = await getOwnedAccount(id, session.user.id)
    if (!account) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()

    const { label, bankName, accountHolderName, currency, country, isDefault } = body

    if (isDefault === true && !account.isDefault) {
      await prisma.$transaction([
        prisma.bankAccount.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.bankAccount.update({
          where: { id },
          data: { isDefault: true },
        }),
      ])
    }

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(bankName !== undefined && { bankName: bankName.trim() }),
        ...(accountHolderName !== undefined && { accountHolderName: accountHolderName.trim() }),
        ...(currency !== undefined && { currency: currency.toUpperCase() }),
        ...(country !== undefined && { country }),
      },
      select: {
        id: true, label: true, bankName: true, accountHolderName: true,
        currency: true, country: true, isDefault: true, accountNumberLast4: true,
      },
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('[PATCH /api/bank-accounts/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: remove an account, and promote a new default if needed
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const account = await getOwnedAccount(id, session.user.id)
    if (!account) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.bankAccount.delete({ where: { id } })

    if (account.isDefault) {
      const remaining = await prisma.bankAccount.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (remaining) {
        await prisma.bankAccount.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[DELETE /api/bank-accounts/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}