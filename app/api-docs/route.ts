import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ikusa App — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0}</style>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <div id="swagger"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      supportedSubmitMethods: []
    });
  </script>
</body>
</html>`

export async function GET(_req: NextRequest) {
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}


