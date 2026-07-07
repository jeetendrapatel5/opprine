// app/api/bank-accounts/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { encrypt, lastFour } from '@/lib/encryption'

// GET: list all bank accounts
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      label: true,
      bankName: true,
      accountHolderName: true,
      currency: true,
      country: true,
      isDefault: true,
      accountNumberLast4: true,
      createdAt: true,
    },

    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(accounts)
}

// POST: create a new bank account
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      label,
      bankName,
      accountHolderName,
      accountNumber,
      routingCode,
      currency = 'INR',
      country,
      isDefault,
    } = body

    if (!label?.trim() || !bankName?.trim() || !accountHolderName?.trim()) {
      return NextResponse.json(
        { error: 'label, bankName, and accountHolderName are required' },
        { status: 400 }
      )
    }
    if (!accountNumber || accountNumber.trim().length < 4) {
      return NextResponse.json(
        { error: 'A valid accountNumber is required' },
        { status: 400 }
      )
    }

    const accountNumberEnc = encrypt(accountNumber.trim())
    const accountNumberLast4 = lastFour(accountNumber.trim())
    const routingCodeEnc = routingCode?.trim() ? encrypt(routingCode.trim()) : null

    const newAccount = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.bankAccount.count({
        where: { userId: session.user.id },
      })

      const shouldBeDefault = existingCount === 0 || isDefault === true

      if (shouldBeDefault && existingCount > 0) {

        await tx.bankAccount.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.bankAccount.create({
        data: {
          userId: session.user.id,
          label: label.trim(),
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim(),
          currency: currency.toUpperCase(),
          country: country || null,
          isDefault: shouldBeDefault,
          accountNumberLast4,
          accountNumberEnc,
          routingCodeEnc,
        },
      })
    })

    const { accountNumberEnc: _a, routingCodeEnc: _b, ...safeAccount } = newAccount

    return NextResponse.json(safeAccount, { status: 201 })

  } catch (error) {
    console.error('[POST /api/bank-accounts]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}