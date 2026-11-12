import { getRequestId, setApiHeaders } from '../_requestGuard.js'
import { buildManifest } from './_data.js'

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  setApiHeaders(response, null, requestId)

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Metodo non supportato.', code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const manifest = await buildManifest()
    return response.status(200).json(manifest)
  } catch (error) {
    console.error(JSON.stringify({
      event: 'corvoc_manifest_failed',
      requestId,
      message: error?.message || 'unknown',
    }))
    return response.status(500).json({
      error: 'Non riesco a costruire il manifest online.',
      code: 'CORVOC_MANIFEST_FAILED',
      requestId,
    })
  }
}
