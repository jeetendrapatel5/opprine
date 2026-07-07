// app/dashboard/settings/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import SettingsShell from '@/components/settings/SettingsShell'

export default async function SettingsPage() {

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      bio: true,
      avatarUrl: true,
      portfolioUrl: true,
      username: true,
      profileTagline: true,
      profileEnabled: true,
    },
  })

  const bankAccounts = await prisma.bankAccount.findMany({
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

  return <SettingsShell user={user} bankAccounts={bankAccounts} />
}