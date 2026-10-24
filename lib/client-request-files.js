// lib/client-request-files.js
//
// Everything about the FILE a client uploads to answer a request: checking it
// is acceptable, and storing it on Cloudinary. No database access here.
//
// WHY THIS IS STRICT
// The upload endpoint is used by a person with NO account (only a magic link),
// and the file is later opened by your team. So we never trust anything the
// browser says about the file. Four checks run on the SERVER, before anything
// is stored:
//   1. size       - not empty, and at most FILE_LIMITS.MAX_BYTES
//   2. extension  - must be in the allowlist below (no .exe, .html, .js, .svg...)
//   3. content    - the file's first bytes ("magic bytes") must match what that
//                   extension claims. A .png that is really a script is refused.
//   4. name       - cleaned of path characters / control characters
// The type we STORE is derived from the extension allowlist, never from the
// Content-Type the browser sent.
//
// WHY 4 MB
// The file goes browser -> your server -> Cloudinary, and Vercel limits a
// function's request body to about 4.5 MB. 4 MB leaves room for the form
// wrapper. Bigger files would need direct-to-Cloudinary signed uploads, which
// is a larger change; until then, a larger file can be shared as a link in a
// written-answer request.

import { randomUUID } from 'node:crypto'
import { ValidationError } from './errors.js'

export const FILE_LIMITS = Object.freeze({
  MAX_BYTES: 4 * 1024 * 1024,
  NAME_MAX: 150,
})

// extension -> which content signatures are acceptable, and the type we store.
// "zip" covers .docx/.xlsx/.pptx (they are zip containers); "ole" is the old
// Office format (.doc/.xls).
const ALLOWED = {
  png: { kinds: ['png'], mime: 'image/png', image: true },
  jpg: { kinds: ['jpeg'], mime: 'image/jpeg', image: true },
  jpeg: { kinds: ['jpeg'], mime: 'image/jpeg', image: true },
  gif: { kinds: ['gif'], mime: 'image/gif', image: true },
  webp: { kinds: ['webp'], mime: 'image/webp', image: true },
  pdf: { kinds: ['pdf'], mime: 'application/pdf' },
  zip: { kinds: ['zip'], mime: 'application/zip' },
  docx: { kinds: ['zip'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xlsx: { kinds: ['zip'], mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pptx: { kinds: ['zip'], mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  doc: { kinds: ['ole'], mime: 'application/msword' },
  xls: { kinds: ['ole'], mime: 'application/vnd.ms-excel' },
  txt: { kinds: ['text'], mime: 'text/plain' },
  csv: { kinds: ['text'], mime: 'text/csv' },
}

export const ALLOWED_EXTENSIONS = Object.freeze(Object.keys(ALLOWED))

// Used by the portal's <input type="file" accept="...">: a convenience for the
// file picker only, the server check above is what actually protects you.
export const FILE_ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const MAX_MB = FILE_LIMITS.MAX_BYTES / (1024 * 1024)

export function getExtension(fileName) {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0 || dot === fileName.length - 1) return ''
  return fileName.slice(dot + 1).toLowerCase()
}

// Strips path separators and control characters, trims, and caps the length.
// A too-long name is shortened in the MIDDLE so its extension survives (a
// 200-character "logo....png" must not turn into a file with no type).
export function sanitizeFileName(name) {
  const cleaned = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]/g, '_')
    .trim()
  if (cleaned.length <= FILE_LIMITS.NAME_MAX) return cleaned

  const ext = getExtension(cleaned)
  const suffix = ext ? `.${cleaned.slice(-ext.length)}` : ''
  return cleaned.slice(0, FILE_LIMITS.NAME_MAX - suffix.length) + suffix
}

const hasPrefix = (buffer, bytes) => bytes.every((byte, i) => buffer[i] === byte)
const ascii = (buffer, start, end) => buffer.subarray(start, end).toString('latin1')

// What does the file's content say it is? null = unrecognised.
export function sniffKind(buffer) {
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (ascii(buffer, 0, 4) === 'GIF8') return 'gif'
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'webp'
  if (ascii(buffer, 0, 5) === '%PDF-') return 'pdf'
  if (hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06])) return 'zip'
  if (hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'
  // Plain text: no NUL bytes in the first 8 KB.
  const head = buffer.subarray(0, 8192)
  if (head.length > 0 && !head.includes(0x00)) return 'text'
  return null
}

// `file` is a Web File from request.formData(). Returns everything needed to
// store it, or throws a ValidationError with a message written for a person.
export async function readAndValidateFile(file) {
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    throw new ValidationError('Please choose a file to upload.')
  }

  // Cheap checks first, before reading the file into memory.
  if (!(file.size > 0)) throw new ValidationError('That file is empty.')
  if (file.size > FILE_LIMITS.MAX_BYTES) {
    throw new ValidationError(`That file is too large. The maximum is ${MAX_MB} MB.`)
  }

  const fileName = sanitizeFileName(file.name)
  const ext = getExtension(fileName)
  const rule = ALLOWED[ext]
  if (!rule) {
    throw new ValidationError(
      `This file type is not allowed. You can upload: ${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')}.`
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // `file.size` came from the client; re-check against the real bytes.
  if (buffer.length === 0) throw new ValidationError('That file is empty.')
  if (buffer.length > FILE_LIMITS.MAX_BYTES) {
    throw new ValidationError(`That file is too large. The maximum is ${MAX_MB} MB.`)
  }

  const kind = sniffKind(buffer)
  if (!kind || !rule.kinds.includes(kind)) {
    throw new ValidationError(`This file does not look like a real .${ext} file.`)
  }

  return { buffer, fileName, ext, mime: rule.mime, isImage: Boolean(rule.image) }
}

// Images go up as Cloudinary "image" assets; everything else as "raw", which
// keeps PDFs and zips downloadable without changing any Cloudinary setting.
export const resourceTypeFor = (ext) => (ALLOWED[ext]?.image ? 'image' : 'raw')

// ── Cloudinary (loaded lazily so importing this file never needs the SDK) ──

// -> { url, publicId, bytes }
export async function defaultUploader({ buffer, projectId, requestId, ext }) {
  const { default: cloudinary } = await import('./cloudinary.js')
  const resourceType = resourceTypeFor(ext)
  // Random id: nothing a user typed becomes part of the stored path. Raw assets
  // keep their extension inside the public id; images get theirs from the format.
  const id = `${requestId}-${randomUUID()}`

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `client-portal/${projectId}/requests`,
        public_id: resourceType === 'raw' ? `${id}.${ext}` : id,
        resource_type: resourceType,
        overwrite: false,
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded))
    )
    stream.end(buffer)
  })

  return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes ?? buffer.length }
}

// Best effort: used to clean up when an upload turned out not to be wanted
// (for example, two uploads raced and only one can win).
export async function defaultRemover({ publicId, ext }) {
  const { default: cloudinary } = await import('./cloudinary.js')
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceTypeFor(ext) })
}