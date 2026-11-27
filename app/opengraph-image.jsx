import { ImageResponse } from 'next/og'

export const alt = 'Opprine. Client project delivery for web studios.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24, padding: 80, width: '100%', height: '100%', background: '#F8FAFC', color: '#0F172A' }}>
        <div style={{ display: 'flex', color: '#1D4ED8', fontSize: 36 }}>Opprine</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72 }}>
          <span>Client project delivery</span>
          <span>for web studios</span>
        </div>
        <div style={{ display: 'flex', color: '#475569', fontSize: 28 }}>Project updates, files, approvals and invoices in one portal</div>
      </div>
    ),
    size,
  )
}
