'use client'

import Dock from './Dock'
import { VscHome, VscArchive, VscAccount, VscSettingsGear } from 'react-icons/vsc'
import { useRouter } from 'next/navigation'

export default function DockWrapper() {
  const router = useRouter()

  const items = [
    { icon: <VscHome size={18} />, label: 'Home', onClick: () => router.push('/') },
    { icon: <VscArchive size={18} />, label: 'Archive', onClick: () => router.push('/') },
    { icon: <VscAccount size={18} />, label: 'Profile', onClick: () => router.push('/dashboard/settings') },
    { icon: <VscSettingsGear size={18} />, label: 'Settings', onClick: () => router.push('/settings') },
  ]

  return (
    <Dock 
      items={items}
      panelHeight={70}
      baseItemSize={50}
      magnification={60}
      className='text-white bg-fp-base/80 backdrop-blur-md'
    />
  )
}