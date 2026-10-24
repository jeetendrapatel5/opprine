// lib/client-request-files.test.js
//
// Run with:  node --test lib/client-request-files.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { FILE_LIMITS, sanitizeFileName, getExtension, sniffKind, readAndValidateFile, resourceTypeFor, ALLOWED_EXTENSIONS } from './client-request-files.js'

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)])
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32, 1)])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBP'), Buffer.alloc(16, 1)])
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32, 65)])
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 1)])
const OLE = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64, 1)])
const TEXT = Buffer.from('name,email\nPriya,priya@example.com\n')
const file = (bytes, name) => new File([bytes], name)
const rejects = (promise, pattern) => assert.rejects(promise, (e) => e.name === 'ValidationError' && pattern.test(e.message))

test('every supported kind passes with a matching extension', async () => {
  const cases = [[PNG, 'logo.png', 'image/png', true], [JPEG, 'a.jpg', 'image/jpeg', true], [JPEG, 'a.JPEG', 'image/jpeg', true], [GIF, 'a.gif', 'image/gif', true],
    [WEBP, 'a.webp', 'image/webp', true], [PDF, 'brand.pdf', 'application/pdf', false], [ZIP, 'assets.zip', 'application/zip', false],
    [ZIP, 'copy.docx', null, false], [ZIP, 'prices.xlsx', null, false], [ZIP, 'deck.pptx', null, false], [OLE, 'old.doc', 'application/msword', false],
    [OLE, 'old.xls', 'application/vnd.ms-excel', false], [TEXT, 'notes.txt', 'text/plain', false], [TEXT, 'data.csv', 'text/csv', false]]
  for (const [bytes, name, mime, isImage] of cases) {
    const out = await readAndValidateFile(file(bytes, name))
    assert.equal(out.fileName, name); assert.equal(out.isImage, isImage); assert.ok(Buffer.isBuffer(out.buffer)); assert.equal(out.buffer.length, bytes.length)
    if (mime) assert.equal(out.mime, mime)
  }
})
test('the stored type comes from the extension, never from what the browser claimed', async () => {
  const f = new File([PNG], 'logo.png', { type: 'text/html' })
  assert.equal((await readAndValidateFile(f)).mime, 'image/png')
})
test('dangerous or unknown extensions are refused', async () => {
  for (const name of ['setup.exe', 'page.html', 'run.js', 'icon.svg', 'script.sh', 'a.php', 'README', '.png', 'photo.png.exe', 'archive.rar', 'a.bat', 'a.ps1'])
    await rejects(readAndValidateFile(file(PNG, name)), /not allowed/)
})
test('content must match the extension (spoofed files are refused)', async () => {
  await rejects(readAndValidateFile(file(Buffer.from('<script>alert(1)</script>'), 'logo.png')), /does not look like a real \.png/)
  await rejects(readAndValidateFile(file(PDF, 'logo.png')), /real \.png/)
  await rejects(readAndValidateFile(file(PNG, 'doc.pdf')), /real \.pdf/)
  await rejects(readAndValidateFile(file(PNG, 'copy.docx')), /real \.docx/)
  await rejects(readAndValidateFile(file(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]), 'notes.txt')), /real \.txt/) // Windows executable header contains NULs
  await rejects(readAndValidateFile(file(Buffer.from([1, 2, 3, 0, 5]), 'x.zip')), /real \.zip/)
})
test('empty, oversized, and non-file inputs', async () => {
  await rejects(readAndValidateFile(file(Buffer.alloc(0), 'a.png')), /empty/)
  await rejects(readAndValidateFile(file(Buffer.concat([PNG, Buffer.alloc(FILE_LIMITS.MAX_BYTES)]), 'big.png')), /too large.*4 MB/)
  const ok = Buffer.concat([PNG, Buffer.alloc(FILE_LIMITS.MAX_BYTES - PNG.length)])
  assert.equal((await readAndValidateFile(file(ok, 'exact.png'))).buffer.length, FILE_LIMITS.MAX_BYTES)
  for (const bad of [null, undefined, 'a string', {}, 42]) await rejects(readAndValidateFile(bad), /choose a file/)
})
test('a file that lies about its size (declared small, actually large) is still caught', async () => {
  const real = Buffer.concat([PNG, Buffer.alloc(FILE_LIMITS.MAX_BYTES)])
  const liar = { size: 100, name: 'x.png', arrayBuffer: async () => real.buffer.slice(real.byteOffset, real.byteOffset + real.byteLength) }
  await rejects(readAndValidateFile(liar), /too large/)
})
test('file names are cleaned: path characters and control characters removed', async () => {
  assert.equal(sanitizeFileName('../../etc/passwd.png'), '.._.._etc_passwd.png')
  assert.equal(sanitizeFileName('C:\\Users\\me\\logo.png'), 'C:_Users_me_logo.png')
  assert.equal(sanitizeFileName('lo\u0000go\n.png'), 'logo.png')
  assert.equal(sanitizeFileName('  spaced.png  '), 'spaced.png')
  assert.equal(sanitizeFileName(null), '')
  assert.equal((await readAndValidateFile(file(PNG, '../../evil.png'))).fileName, '.._.._evil.png')
})
test('a very long name is shortened but keeps its extension (and still validates)', async () => {
  const long = 'a'.repeat(300) + '.png'
  const clean = sanitizeFileName(long)
  assert.equal(clean.length, FILE_LIMITS.NAME_MAX); assert.ok(clean.endsWith('.png'))
  assert.equal((await readAndValidateFile(file(PNG, long))).ext, 'png')
})
test('helpers: getExtension, sniffKind, resourceTypeFor, allowlist', () => {
  assert.equal(getExtension('a.b.PNG'), 'png'); assert.equal(getExtension('noext'), ''); assert.equal(getExtension('.hidden'), ''); assert.equal(getExtension('trailing.'), '')
  assert.equal(sniffKind(PNG), 'png'); assert.equal(sniffKind(Buffer.alloc(0)), null); assert.equal(sniffKind(Buffer.from([0, 1, 2])), null)
  assert.equal(resourceTypeFor('png'), 'image'); assert.equal(resourceTypeFor('pdf'), 'raw'); assert.equal(resourceTypeFor('docx'), 'raw'); assert.equal(resourceTypeFor('zzz'), 'raw')
  for (const bad of ['svg', 'html', 'exe', 'js']) assert.ok(!ALLOWED_EXTENSIONS.includes(bad))
})