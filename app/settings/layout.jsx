import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'

export default async function SettingsLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  return <section>{children}</section>
}
