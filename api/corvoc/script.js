import { getRequestId, setApiHeaders } from '../_requestGuard.js'
import { loadScriptRows } from './_data.js'

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  setApiHeaders(response, null, requestId)

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Metodo non supportato.', code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const rows = await loadScriptRows()
    const recorded = rows.filter((row) => row.recorded).length
    return response.status(200).json({
      rows,
      counts: { total: rows.length, recorded, missing: rows.length - recorded },
      recordingsDir: 'Vercel Blob · corvoc/registrata',
      metadataFile: 'Vercel Blob · corvoc/registrazioni.json',
      defaultRecordings: false,
    })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'corvoc_script_failed',
      requestId,
      message: error?.message || 'unknown',
    }))
    return response.status(500).json({
      error: 'Non riesco a leggere il copione online.',
      code: 'CORVOC_SCRIPT_FAILED',
      requestId,
    })
  }
}
