// app/signup/page.jsx
//
// Server component. It exists so the page can export metadata, which a
// 'use client' file cannot. The form itself lives in ./SignupForm.jsx.

import SignupForm from './SignupForm'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata = buildPageMetadata({
  title: 'Create your account',
  description:
    'Create your Opprine account to deliver client projects with shared progress, feedback and approvals. Start on the Free plan.',
  path: '/signup',
})

export default function SignupPage() {
  return <SignupForm />
}