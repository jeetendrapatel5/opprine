// app/api/portal/[token]/requests/[requestId]/upload/route.js
//
//   POST /api/portal/:token/requests/:requestId/upload     (multipart/form-data, field "file")
//
// The client answers a FILE request. Separate from the JSON answer route
// because a file has to be validated, stored on Cloudinary, and only THEN
// recorded - all handled in submitPortalFileRequest() (lib/client-requests.js).
//
// This endpoint has no login, so it is the most abusable one in the feature.
// Layers, in order:
//   1. rate limit        - per IP and per link (best effort, see lib/rate-limit.js:
//                          it lives in one server instance's memory)
//   2. body size guard   - refuse obviously oversized bodies before parsing them
//   3. token + request   - the link must be valid and the request must belong to
//                          that link's project, be a FILE request, and still be OPEN
//   4. file checks       - size, extension allowlist, real content (lib/client-request-files.js)
//   5. one conditional update OPEN -> SUBMITTED, so a request takes exactly one file
//
// Vercel limits a request body to ~4.5 MB; our own limit is 4 MB per file.

import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/http-errors'
import { ValidationError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { FILE_LIMITS } from '@/lib/client-request-files'
import { submitPortalFileRequest } from '@/lib/client-requests'

// Uploading to Cloudinary can take a few seconds.
export const maxDuration = 30

const TEN_MINUTES = 10 * 60 * 1000
// The multipart wrapper adds a little on top of the file itself.
const MAX_BODY_BYTES = FILE_LIMITS.MAX_BYTES + 256 * 1024

export async function POST(request, { params }) {
  try {
    const { token, requestId } = await params

    const ip = checkRateLimit(`portal-upload:ip:${getClientIp(request)}`, { limit: 20, windowMs: TEN_MINUTES })
    const link = checkRateLimit(`portal-upload:link:${token}`, { limit: 10, windowMs: TEN_MINUTES })
    if (!ip.allowed || !link.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }

    const declaredLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: `That file is too large. The maximum is ${FILE_LIMITS.MAX_BYTES / (1024 * 1024)} MB.` },
        { status: 413 }
      )
    }

    let formData
    try {
      formData = await request.formData()
    } catch {
      throw new ValidationError('Please choose a file to upload.')
    }

    const updated = await submitPortalFileRequest({ token, requestId, file: formData.get('file') })
    return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleApiError(error)
  }
}