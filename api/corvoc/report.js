import { buildReport, toCsv, toJson, toMarkdown } from '../../scripts/voice-report.mjs'
import { getRequestId } from '../_requestGuard.js'
import { loadScriptRows } from './_data.js'

const FORMATS = new Set(['csv', 'md', 'json'])
const CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  json: 'application/json; charset=utf-8',
}

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Request-ID', requestId)

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    return response.status(405).json({ error: 'Metodo non supportato.', code: 'METHOD_NOT_ALLOWED' })
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const format = url.searchParams.get('format') || 'csv'
  if (!FORMATS.has(format)) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    return response.status(400).json({
      error: 'Formato del riepilogo non valido: usa csv, md o json.',
      code: 'INVALID_REPORT_FORMAT',
      requestId,
    })
  }

  try {
    const rows = await loadScriptRows()
    const report = buildReport(rows)
    const body = format === 'md' ? toMarkdown(report) : format === 'json' ? toJson(report) : toCsv(report)
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[format],
      'Content-Disposition': `attachment; filename="riepilogo-registrazioni.${format}"`,
    })
    return response.end(body)
  } catch (error) {
    console.error(JSON.stringify({
      event: 'corvoc_report_failed',
      requestId,
      message: error?.message || 'unknown',
    }))
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    return response.status(500).json({
      error: 'Non riesco a costruire il riepilogo online.',
      code: 'CORVOC_REPORT_FAILED',
      requestId,
    })
  }
}
