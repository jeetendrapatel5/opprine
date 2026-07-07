// app/api/bank-accounts/[id]/reveal/route.js
// The ONLY route in the app that calls decrypt(). Kept in its own file
// on purpose — see the table above for why.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Ownership check again — even though this is a POST, not a GET,
    // the same rule applies: only the owning freelancer can decrypt.
    const account = await prisma.bankAccount.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Decrypt happens here, on-demand, and the result is sent once.
    // Nothing is cached or stored anywhere in plain form.
    const accountNumber = decrypt(account.accountNumberEnc)
    const routingCode = account.routingCodeEnc ? decrypt(account.routingCodeEnc) : null

    console.log(`[Reveal] User ${session.user.id} revealed bank account ${id}`)

    return NextResponse.json({ accountNumber, routingCode })

  } catch (error) {
    console.error('[POST /api/bank-accounts/[id]/reveal]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}