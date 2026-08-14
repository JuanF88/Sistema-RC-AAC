function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getAssetBaseUrl() {
  const raw = process.env.APP_ASSET_BASE_URL || process.env.APP_LOGIN_URL || ''
  return String(raw).trim().replace(/\/$/, '')
}

function getUniversityLogoUrl() {
  const base = getAssetBaseUrl();
  if (!base) return '';
  return `${base}/LogoPagina.png`;
}

function renderKeyValueBlock(text = '') {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const pairs = lines
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx <= 0) return null
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (!key || !value) return null
      return { key, value }
    })
    .filter(Boolean)

  if (!pairs.length) return ''

  const rows = pairs
    .map(({ key, value }) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #feceae; color: #fc6f5b; font-weight: 700; width: 36%; vertical-align: top;">${escapeHtml(key)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #feceae; color: #7c4a36; vertical-align: top;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('')

  return `
    <div style="margin: 0 0 14px; border: 1px solid #feceae; border-radius: 12px; overflow: hidden; background: #fff7ed;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; table-layout: fixed;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function textToHtml(text = '', processKeyValue = false) {
  const raw = String(text)
  const keyValueCard = processKeyValue ? renderKeyValueBlock(raw) : ''
  const paragraphs = raw
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin: 0 0 12px; line-height: 1.65; color: #334155; white-space: normal; word-break: break-word; overflow: visible; text-overflow: clip;">${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  // Cambiar color de enlaces a naranja institucional
  const withOrangeLinks = paragraphs.replace(/<a ([^>]+)>/g, '<a $1 style="color:#fc6f5b; text-decoration:underline;">');
  return `${keyValueCard}${withOrangeLinks}`
}

function wrapProfessionalTemplate({ title, subtitle, intro, bodyHtml, footer }) {
  const logoUrl = getUniversityLogoUrl()
  return `
  <div style="margin:0; padding:24px; background:#fff7ed; font-family: 'Segoe UI', Arial, sans-serif;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #feceae; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 24px rgba(252, 111, 91, 0.08);">
      <div style="background: linear-gradient(135deg, #fc6f5b 0%, #f59e0b 100%); padding: 24px; color: #ffffff; position: relative;">
        ${logoUrl ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.08; background: url('${escapeHtml(logoUrl)}') center/contain no-repeat; pointer-events: none;"></div>` : ''}
        <div style="position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; letter-spacing: 0.08em; opacity: 0.9; text-transform: uppercase; font-weight: 700; margin-bottom: 12px; color: #fff; display: inline-block; vertical-align: middle;">Sistema Órbita</span>
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height: 24px; width: auto; display: inline-block; vertical-align: middle; margin-bottom: 12px;" />` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h1 style="margin: 0 0 8px; font-size: 24px; line-height: 1.2; font-weight: 700; color: #fff; display: inline-block; vertical-align: middle;">${escapeHtml(title)}</h1>
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height: 24px; width: auto; display: inline-block; vertical-align: middle; margin-bottom: 8px;" />` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p style="margin: 0; font-size: 13px; opacity: 0.9; color: #fff; display: inline-block; vertical-align: middle;">${escapeHtml(subtitle)}</p>
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height: 20px; width: auto; display: inline-block; vertical-align: middle; margin-bottom: 0;" />` : ''}
          </div>
        </div>
      </div>

      <div style="padding: 24px;">
        ${intro ? `<p style="margin: 0 0 16px; color: #7c4a36; font-size: 15px; line-height: 1.6;"><strong>${escapeHtml(intro)}</strong></p>` : ''}
        ${bodyHtml}
      </div>

      <div style="border-top: 1px solid #feceae; padding: 14px 24px; background: #fff7ed; font-size: 12px; color: #c2410c; line-height: 1.6; white-space: normal; word-break: break-word;">
        ${escapeHtml(footer || 'Este es un mensaje oficial del Sistema Órbita. Por favor no responder a este correo.')}
      </div>
    </div>
  </div>`
}

export function buildCredentialsTemplate({ nombre, apellido, email, password, loginUrl }) {
  const nombreCompleto = `${nombre || ''} ${apellido || ''}`.trim() || 'Usuario'
  const acceso = loginUrl || process.env.APP_LOGIN_URL || 'https://orbita-unicauca.vercel.app/'

  const subject = 'Credenciales de acceso - Sistema Órbita'

  const credentialsCard = `
    <p style="margin:0 0 14px; line-height:1.6; color:#7c4a36; font-size:15px;">Este es un mensaje oficial del Sistema Órbita. A continuación encontrarás tus credenciales de acceso para ingresar al aplicativo:</p>
    <div style="background:#fff7ed; border:1px solid #feceae; border-radius:12px; padding:16px; margin: 0 0 16px;">
      <p style="margin:0 0 8px; color:#c2410c;"><strong style="color:#fc6f5b;">Usuario:</strong> <br/><span style="font-family: monospace; background: #feceae; padding: 4px 8px; border-radius: 4px;">${escapeHtml(email)}</span></p>
      <p style="margin:0; color:#c2410c;"><strong style="color:#fc6f5b;">Contraseña temporal:</strong> <br/><span style="font-family: monospace; background: #feceae; padding: 4px 8px; border-radius: 4px;">${escapeHtml(password)}</span></p>
    </div>
    <div style="text-align: center; margin: 0 0 16px;">
      <a href="${escapeHtml(acceso)}" style="display:inline-block; background:linear-gradient(135deg, #fc6f5b 0%, #f59e0b 100%); color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:700; font-size:15px; box-shadow: 0 4px 12px rgba(252, 111, 91, 0.3);">Ingresar al Sistema</a>
    </div>
    <p style="margin:0; font-size:13px; color:#c2410c; line-height:1.5;">Si tienes problemas para acceder o necesitas ayuda, no dudes en contactar al equipo de soporte del Sistema Órbita.</p>
  `

  const html = wrapProfessionalTemplate({
    title: 'Credenciales de acceso',
    subtitle: 'Notificación para ingresar al Sistema Órbita',
    intro: `Hola ${escapeHtml(nombreCompleto)},`,
    bodyHtml: credentialsCard,
  })

  return { subject, html }
}

/* ------------------------------------------------------------------ *
 * Plantilla de alertas del proceso de acreditacion / registro calificado
 * Compatible con Gmail, Outlook, Apple Mail y clientes moviles:
 * maquetada con tablas, estilos inline y sin JavaScript ni SVG externo.
 * ------------------------------------------------------------------ */

const ALERT_COLORS = {
  orange: '#e2562f',
  orangeSoft: '#feede6',
  redSoft: '#fdeceb',
  orangeDeep: '#d4472c',
  gradientFrom: '#f15a3c',
  gradientTo: '#f5a623',
  navy: '#14375e',
  body: '#3f4c5a',
  value: '#26384c',
  border: '#eef1f5',
  contactBg: '#f1f6fc',
  contactBlue: '#1b5fa8',
  footerBg: '#fcf7f3',
  footerText: '#b4653f',
}

function renderAlertParagraphs(text = '', color = ALERT_COLORS.body) {
  return String(text)
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 12px; font-size:14.5px; line-height:1.65; color:${color}; word-break:break-word;">${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`,
    )
    .join('')
}

function renderAlertSectionTitle(icon, title, circleBg = ALERT_COLORS.orangeSoft) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0 0 12px;">
      <tr>
        <td width="30" style="width:30px; height:30px; background-color:${circleBg}; border-radius:15px; text-align:center; vertical-align:middle; font-size:15px; line-height:30px; mso-line-height-rule:exactly;">${icon}</td>
        <td style="padding-left:10px; font-size:17px; font-weight:700; color:${ALERT_COLORS.orange}; vertical-align:middle;">${escapeHtml(title)}</td>
      </tr>
    </table>
  `
}

function renderAlertDetailsTable(details = []) {
  const rows = details
    .filter((item) => item && item.label)
    .map(
      (item, index, list) => {
        const isLast = index === list.length - 1
        const divider = isLast ? 'none' : `1px solid ${ALERT_COLORS.border}`
        return `
      <tr>
        <td class="em-k" width="40%" style="width:40%; padding:11px 14px; border-bottom:${divider}; color:${ALERT_COLORS.orange}; font-size:13.5px; font-weight:700; line-height:1.5; vertical-align:top;">${escapeHtml(item.label)}</td>
        <td class="em-v" width="60%" style="width:60%; padding:11px 14px; border-bottom:${divider}; color:${ALERT_COLORS.value}; font-size:13.5px; line-height:1.5; vertical-align:top; word-break:break-word;">${escapeHtml(item.value || '-')}</td>
      </tr>
    `
      },
    )
    .join('')

  if (!rows) return ''

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:separate; border-spacing:0; border:1px solid ${ALERT_COLORS.border}; border-radius:12px; overflow:hidden; background-color:#ffffff;">
      <tbody>${rows}</tbody>
    </table>
  `
}

/**
 * @param {{
 *   alertBadge?: string,
 *   title?: string,
 *   programName?: string,
 *   recipientName?: string,
 *   introText?: string,
 *   detailsTitle?: string,
 *   details?: Array<{ label: string, value: string }>,
 *   actionTitle?: string,
 *   actionText?: string,
 *   importantTitle?: string,
 *   importantText?: string,
 *   contactText?: string,
 *   contactEmail?: string,
 *   footerText?: string,
 *   gradientFrom?: string,
 *   gradientTo?: string,
 *   titleSize?: number,
 *   headerPadding?: string,
 * }} options
 */
export function buildAlertTemplate({
  alertBadge = 'Alerta',
  title = 'Alerta del proceso',
  programName = '',
  recipientName = '',
  introText = '',
  detailsTitle = 'Información del proceso',
  details = [],
  actionTitle = '',
  actionText = '',
  importantTitle = '',
  importantText = '',
  contactText = '',
  contactEmail = '',
  footerText = 'Este es un mensaje automático. Por favor, no responda a este correo.',
  gradientFrom = ALERT_COLORS.gradientFrom,
  gradientTo = ALERT_COLORS.gradientTo,
  titleSize = 27,
  headerPadding = '30px 28px 34px',
}) {
  const contactHtml = contactEmail
    ? `${escapeHtml(contactText)} <a href="mailto:${escapeHtml(contactEmail)}" style="color:${ALERT_COLORS.contactBlue}; font-weight:700; text-decoration:none;">${escapeHtml(contactEmail)}</a>.`
    : escapeHtml(contactText)

  return `<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(title)}</title>
<!--[if mso]><style>body, table, td, p, a, h1 { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  @media only screen and (max-width:600px) {
    .em-card { width:100% !important; border-radius:14px !important; }
    .em-pad { padding-left:18px !important; padding-right:18px !important; }
    .em-head { padding-left:20px !important; padding-right:20px !important; padding-top:24px !important; padding-bottom:26px !important; }
    .em-title { font-size:21px !important; line-height:1.25 !important; }
    .em-subtitle { font-size:14px !important; }
    .em-k, .em-v { display:block !important; width:100% !important; }
    .em-k { padding-bottom:0 !important; border-bottom:none !important; }
    .em-v { padding-top:2px !important; }
    .em-stack { display:block !important; width:100% !important; padding-left:0 !important; }
    .em-stack-gap { padding-top:8px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#f4f5f7;">
  <tr>
    <td align="center" style="padding:24px 12px; font-family:'Segoe UI', Inter, Arial, Helvetica, sans-serif;">

      <table role="presentation" class="em-card" width="680" cellpadding="0" cellspacing="0" border="0" style="width:680px; max-width:680px; background-color:#ffffff; border:1px solid #e9ecf1; border-radius:20px; overflow:hidden;">

        <!-- Encabezado -->
        <tr>
          <td class="em-head" bgcolor="${gradientFrom}" style="background-color:${gradientFrom}; background-image:linear-gradient(90deg, ${gradientFrom} 0%, ${gradientTo} 100%); padding:${headerPadding}; border-radius:20px 20px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0 0 16px;">
              <tr>
                <td bgcolor="${ALERT_COLORS.orangeDeep}" style="background-color:${ALERT_COLORS.orangeDeep}; border-radius:14px; padding:6px 13px; color:#ffffff; font-size:11.5px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; line-height:1.4; mso-line-height-rule:exactly;">&#9888;&#65039;&nbsp; ${escapeHtml(alertBadge)}</td>
              </tr>
            </table>
            <h1 class="em-title" style="margin:0 0 10px; font-size:${titleSize}px; line-height:1.28; font-weight:700; color:#ffffff;">${escapeHtml(title)}</h1>
            ${programName ? `<p class="em-subtitle" style="margin:0; font-size:15px; line-height:1.45; color:#ffeee7;">${escapeHtml(programName)}</p>` : ''}
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td class="em-pad" style="padding:24px 28px 8px;">
            ${recipientName ? `<p style="margin:0 0 10px; font-size:15.5px; font-weight:700; color:${ALERT_COLORS.navy};">${escapeHtml(recipientName)}:</p>` : ''}
            ${renderAlertParagraphs(introText)}
          </td>
        </tr>

        <!-- Informacion del proceso -->
        ${details && details.length
          ? `<tr>
          <td class="em-pad" style="padding:16px 28px 0;">
            ${renderAlertSectionTitle('&#128203;', detailsTitle)}
            ${renderAlertDetailsTable(details)}
          </td>
        </tr>`
          : ''}

        <!-- Que debe hacer el programa -->
        ${actionText
          ? `<tr>
          <td class="em-pad" style="padding:26px 28px 0;">
            ${renderAlertSectionTitle('&#128100;', actionTitle)}
            ${renderAlertParagraphs(actionText)}
          </td>
        </tr>`
          : ''}

        <!-- Informacion importante -->
        ${importantText
          ? `<tr>
          <td class="em-pad" style="padding:14px 28px 0;">
            ${renderAlertSectionTitle('&#8505;&#65039;', importantTitle, ALERT_COLORS.redSoft)}
            ${renderAlertParagraphs(importantText)}
          </td>
        </tr>`
          : ''}

        <!-- Contacto -->
        ${contactText
          ? `<tr>
          <td class="em-pad" style="padding:12px 28px 26px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:${ALERT_COLORS.contactBg}; border-radius:12px;">
              <tr>
                <td class="em-stack" width="34" style="width:34px; padding:14px 0 14px 18px; vertical-align:top;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    <tr>
                      <td width="28" style="width:28px; height:28px; background-color:#dbe8f7; border-radius:14px; text-align:center; vertical-align:middle; font-size:13px; line-height:28px; mso-line-height-rule:exactly;">&#9993;&#65039;</td>
                    </tr>
                  </table>
                </td>
                <td class="em-stack em-stack-gap" style="padding:14px 18px 14px 12px; font-size:13.5px; line-height:1.6; color:${ALERT_COLORS.value}; vertical-align:middle; word-break:break-word;">${contactHtml}</td>
              </tr>
            </table>
          </td>
        </tr>`
          : ''}

        <!-- Pie -->
        <tr>
          <td align="center" style="border-top:1px solid #f2e6de; background-color:${ALERT_COLORS.footerBg}; padding:18px 24px; border-radius:0 0 20px 20px;">
            <span style="font-size:11.5px; line-height:1.6; color:${ALERT_COLORS.footerText};">&#128274;&nbsp; ${escapeHtml(footerText)}</span>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`
}

export function buildProfessionalTemplateFromText({
  subject,
  text,
  intro,
  nombreCompleto,
  processKeyValue = false,
  keyValueText = '',
}) {
  const introText = intro || (nombreCompleto ? `Hola ${escapeHtml(nombreCompleto)},` : '')
  const bodyHtml = keyValueText
    ? `${renderKeyValueBlock(keyValueText)}${textToHtml(text, false)}`
    : textToHtml(text, processKeyValue)
  return wrapProfessionalTemplate({
    title: subject || 'Órbita',
    subtitle: 'Mensaje desde el Sistema Órbita',
    intro: introText,
    bodyHtml,
  })
}
