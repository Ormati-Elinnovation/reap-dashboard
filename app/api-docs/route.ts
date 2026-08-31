import { requestOrigin } from "@/lib/api/http";

// Swagger UI for the public API. Public on purpose: the developers integrating the
// API have no dashboard login, and the page shows no data without a key.
export const dynamic = "force-dynamic";

const SWAGGER = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.14";

function page(origin: string): string {
  return `<!DOCTYPE html>
<html lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reap Expenses API — תיעוד</title>
<link rel="stylesheet" href="${SWAGGER}/swagger-ui.css">
<style>
  :root{ --ink:#16201e; --soft:#4d5b58; --line:#d3dbd9; --accent:#0d6b60; --ground:#f2f4f3; --panel:#fff }
  @media (prefers-color-scheme: dark){
    :root{ --ink:#e7efed; --soft:#a9b9b5; --line:#2a3b37; --accent:#59cbb8; --ground:#0f1614; --panel:#16211f }
  }
  body{ margin:0; background:var(--ground); font-family:"Assistant",system-ui,-apple-system,"Segoe UI",sans-serif }
  .masthead{ direction:rtl; background:var(--panel); border-bottom:1px solid var(--line); padding:26px 24px }
  .masthead .inner{ max-width:1160px; margin:0 auto }
  .masthead h1{ margin:0 0 6px; font-size:26px; color:var(--ink); letter-spacing:-.01em }
  .masthead p{ margin:0 0 14px; color:var(--soft); font-size:15px; max-width:70ch; line-height:1.6 }
  .row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center }
  .tag{ font-size:12.5px; font-weight:700; padding:4px 11px; border-radius:999px;
        border:1px solid var(--line); color:var(--soft); text-decoration:none }
  .tag.key{ background:var(--accent); border-color:var(--accent); color:var(--panel) }
  .tag.link:hover{ border-color:var(--accent); color:var(--accent) }
  code{ direction:ltr; unicode-bidi:embed; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px }
  .swagger-ui .topbar{ display:none }
  .swagger-ui{ max-width:1160px; margin:0 auto; padding:8px 12px 60px }
  .swagger-ui .info{ display:none }
  @media (prefers-color-scheme: dark){
    .swagger-ui, .swagger-ui .opblock .opblock-summary-description,
    .swagger-ui .opblock-tag, .swagger-ui table thead tr td, .swagger-ui table thead tr th,
    .swagger-ui .parameter__name, .swagger-ui .parameter__type, .swagger-ui .response-col_status,
    .swagger-ui .response-col_links, .swagger-ui .model-title, .swagger-ui .model,
    .swagger-ui label, .swagger-ui .tab li, .swagger-ui .btn{ color:var(--ink) }
    .swagger-ui .opblock{ background:var(--panel); border-color:var(--line) }
    .swagger-ui .opblock .opblock-section-header{ background:rgba(255,255,255,.05) }
    .swagger-ui section.models, .swagger-ui .model-box{ background:var(--panel); border-color:var(--line) }
    .swagger-ui select, .swagger-ui input[type=text]{ background:var(--panel); color:var(--ink); border-color:var(--line) }
    .swagger-ui svg:not(:root){ fill:var(--ink) }
  }
</style>
</head>
<body>
  <div class="masthead">
    <div class="inner">
      <h1>Reap Expenses API</h1>
      <p>
        גישה תוכנתית לנתוני ההוצאות — קריאה בלבד. לוחצים <b>Authorize</b>, מדביקים את מפתח ה-API
        (<code>reap_…</code>) ואפשר לנסות כל קריאה ישירות מהדף.
      </p>
      <div class="row">
        <span class="tag key">קריאה בלבד</span>
        <span class="tag">כתובת בסיס: <code>${origin}/api/v1</code></span>
        <a class="tag link" href="${origin}/api/v1/openapi.json">openapi.json</a>
      </div>
    </div>
  </div>
  <div id="swagger"></div>
  <script src="${SWAGGER}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "${origin}/api/v1/openapi.json",
      dom_id: "#swagger",
      deepLinking: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 0,
      tryItOutEnabled: true,
      persistAuthorization: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
}

export const GET = (req: Request) =>
  new Response(page(requestOrigin(req)), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
