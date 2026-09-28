// Supabase Auth email templates — single source of truth.
//
// `npm run email:build` writes the final HTML to supabase/templates/ (to paste
// into the dashboard or preview), `npm run email:push` uploads them all at
// once through the Supabase Management API. Images live in public/email/
// (see scripts/email/assets.mjs).
//
// Placeholders like {{ .TokenHash }} are Go template variables that Supabase
// fills in when it sends the email.

const SITE = 'https://administratum.site';
const ASSETS = `${SITE}/email`;
const CONTACT = 'hola@administratum.site';

// Palette: dark stone, bone and burnished gold, as in the logo.
const C = {
  page: '#0a0a0b',
  card: '#111113',
  panel: '#18181b',
  line: '#26262b',
  text: '#d4d4d8',
  muted: '#8f8f98',
  faint: '#5f5f68',
  white: '#fafafa',
  gold: '#d8c08a',
  goldDeep: '#a8894c',
  alert: '#e8a25c',
};

// Cinzel (Trajan-like, as the logo lettering) and Geist load where the client
// allows web fonts (Apple Mail, iOS, Outlook.com…); elsewhere the fallbacks
// keep the same classic serif / clean sans contrast.
const SERIF = "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif";
const SANS = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

/** Link into the app's /auth/confirmar page, which verifies the token itself. */
const confirmLink = (type, extra = '') =>
  `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=${type}${extra}`;

/** "Hola, José." — the name the person signed up with (or Google's), if any. */
const GREETING =
  'Hola{{ if .Data.display_name }}, {{ .Data.display_name }}{{ else if .Data.full_name }}, {{ .Data.full_name }}{{ end }}.';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const greeting = (text = GREETING) =>
  `<p style="margin:0 0 18px;font-family:${SERIF};font-size:22px;line-height:1.3;font-weight:700;color:${C.white};">${text}</p>`;

const p = (html) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.7;color:${C.text};">${html}</p>`;

const strong = (text) => `<strong style="color:${C.white};font-weight:600;">${text}</strong>`;

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 30px;">
  <tr>
    <td align="center" bgcolor="${C.gold}" style="border-radius:10px;background:${C.gold};background-image:linear-gradient(135deg,#ecdcae 0%,${C.gold} 45%,${C.goldDeep} 100%);box-shadow:0 10px 30px rgba(216,192,138,0.18);">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:15px;font-weight:700;letter-spacing:0.02em;line-height:1;color:#141210;text-decoration:none;border-radius:10px;">${label}&nbsp;&nbsp;&rarr;</a>
    </td>
  </tr>
</table>`;

/** Panel with a coloured side accent. */
const note = (html, accent = C.gold) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-left:3px solid ${accent};background:${C.panel};border-radius:0 10px 10px 0;padding:16px 20px;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.muted};">${html}</td>
  </tr>
</table>`;

/** "Before → after" panel for email changes. */
const swap = (fromLabel, from, toLabel, to) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 8px;background:${C.panel};border:1px solid ${C.line};border-radius:12px;">
  <tr>
    <td style="padding:16px 20px 12px;font-family:${SANS};">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${C.faint};">${fromLabel}</div>
      <div style="margin-top:4px;font-size:15px;color:${C.muted};text-decoration:line-through;word-break:break-all;">${from}</div>
    </td>
  </tr>
  <tr><td style="padding:0 20px;"><div style="height:1px;line-height:1px;font-size:1px;background:${C.line};">&nbsp;</div></td></tr>
  <tr>
    <td style="padding:12px 20px 16px;font-family:${SANS};">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${C.gold};">${toLabel}</div>
      <div style="margin-top:4px;font-size:16px;font-weight:600;color:${C.white};word-break:break-all;">${to}</div>
    </td>
  </tr>
</table>`;

const code = (value) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
  <tr>
    <td align="center" style="background:${C.panel};border:1px solid ${C.line};border-radius:14px;padding:26px 12px;">
      <div style="font-family:${SANS};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${C.faint};margin-bottom:10px;">Tu código</div>
      <div style="font-family:${MONO};font-size:38px;font-weight:700;letter-spacing:0.35em;color:${C.gold};padding-left:0.35em;">${value}</div>
    </td>
  </tr>
</table>`;

/** "Lo que te espera": three features numbered in Roman numerals. */
const features = () => {
  const items = [
    ['I', 'Tu colección, en orden', 'Ejércitos, miniaturas y su progreso de pintura, de la caja al barniz.'],
    ['II', 'Listas con los puntos al día', 'Crea y comparte listas con los puntos oficiales, actualizados cada día.'],
    ['III', 'Una comunidad que pinta', 'Comparte fotos, sigue torneos y aprende con las guías de otros usuarios.'],
  ];
  const rows = items
    .map(
      ([n, title, text]) => `
  <tr>
    <td width="44" valign="top" style="padding:14px 0;font-family:${SERIF};font-size:15px;font-weight:700;color:${C.gold};">${n}</td>
    <td valign="top" style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${SANS};">
      <div style="font-size:15px;font-weight:600;color:${C.white};">${title}</div>
      <div style="margin-top:3px;font-size:14px;line-height:1.6;color:${C.muted};">${text}</div>
    </td>
  </tr>`,
    )
    .join('');
  return `
<div style="margin:8px 0 6px;font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.gold};">Lo que te espera</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">${rows}
</table>`;
};

const fallback = (href) => `
<p style="margin:0 0 24px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint};">
  ¿El botón no funciona? Copia este enlace en tu navegador:<br>
  <a href="${href}" style="color:${C.muted};text-decoration:underline;word-break:break-all;">${href}</a>
</p>`;

/** Sign-off with the emblem, like a letter's seal. */
const signature = (closing) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-top:1px solid ${C.line};">
  <tr>
    <td style="padding-top:26px;">
      <p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${closing}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:14px;">
            <img src="${ASSETS}/emblem.png" width="46" height="46" alt="" style="display:block;border:0;width:46px;height:46px;">
          </td>
          <td valign="middle" style="font-family:${SANS};">
            <div style="font-family:${SERIF};font-size:15px;font-weight:700;letter-spacing:0.06em;color:${C.white};">El equipo de Administratum</div>
            <div style="margin-top:2px;font-size:13px;color:${C.muted};">
              <a href="${SITE}" style="color:${C.gold};text-decoration:none;">administratum.site</a>
              &nbsp;·&nbsp;
              <a href="mailto:${CONTACT}" style="color:${C.muted};text-decoration:none;">${CONTACT}</a>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const footerLink = (href, label) => `<a href="${href}" style="color:${C.muted};text-decoration:none;">${label}</a>`;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function layout({ subject, preheader, eyebrow, title, body, accent = C.gold, siteUrl = '{{ .SiteURL }}', reason }) {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <style>
    @font-face { font-family: 'Geist'; src: url('${SITE}/fonts/Geist-Variable.woff2') format('woff2'); font-weight: 100 900; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    a { color: ${C.gold}; }
    @media only screen and (max-width: 620px) {
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .hero-title { font-size: 26px !important; }
      .hero-logo { width: 240px !important; }
      .outer { padding: 0 !important; }
      .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr>
      <td align="center" class="outer" style="padding:36px 16px 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;">

          <!-- Hero: blurred aquila backdrop, logo, section label and title -->
          <tr>
            <td align="center" valign="top" background="${ASSETS}/hero.jpg" bgcolor="${C.page}" style="background:${C.page} url('${ASSETS}/hero.jpg') center / cover no-repeat;">
              <!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:320px;"><v:fill type="frame" src="${ASSETS}/hero.jpg" color="${C.page}" /><v:textbox inset="0,0,0,0"><![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" class="px" style="padding:48px 40px 44px;">
                    <a href="${siteUrl}" target="_blank" style="text-decoration:none;">
                      <img src="${ASSETS}/logo.png" width="300" alt="ADMINISTRATUM" class="hero-logo" style="display:block;width:300px;max-width:100%;height:auto;border:0;font-family:${SERIF};font-size:24px;font-weight:700;letter-spacing:0.18em;color:${C.gold};">
                    </a>
                    <div style="margin:34px 0 14px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:${accent};">
                      &#9670;&nbsp;&nbsp;${eyebrow}&nbsp;&nbsp;&#9670;
                    </div>
                    <h1 class="hero-title" style="margin:0;font-family:${SERIF};font-size:32px;line-height:1.2;font-weight:700;letter-spacing:0.02em;color:${C.white};">${title}</h1>
                  </td>
                </tr>
              </table>
              <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>

          <!-- Gold hairline -->
          <tr>
            <td style="height:1px;line-height:1px;font-size:1px;background:${C.goldDeep};background-image:linear-gradient(90deg,rgba(216,192,138,0) 0%,${C.gold} 50%,rgba(216,192,138,0) 100%);">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="px" style="padding:42px 48px 44px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" align="center" style="padding:28px 48px 32px;background:#0d0d0f;border-top:1px solid ${C.line};font-family:${SANS};">
              <p style="margin:0 0 14px;font-size:13px;letter-spacing:0.04em;">
                ${footerLink(SITE, 'Inicio')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/comunidad`, 'Comunidad')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/competitivo`, 'Competitivo')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/catalogo-puntos`, 'Puntos')}
              </p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:${C.faint};">
                ${reason}<br>
                ¿Dudas? Escríbenos a <a href="mailto:${CONTACT}" style="color:${C.muted};">${CONTACT}</a>.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.7;color:#4a4a52;">
                © 2026 Administratum · Proyecto independiente, sin afiliación con Games Workshop.<br>
                <a href="${SITE}/legal/privacidad" style="color:#4a4a52;">Privacidad</a>&nbsp;·&nbsp;<a href="${SITE}/legal/terminos" style="color:#4a4a52;">Términos</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const ACCOUNT_REASON = 'Recibes este correo porque se ha usado esta dirección en administratum.site.';
const SECURITY_REASON = 'Te avisamos de los cambios importantes en tu cuenta para que puedas protegerla.';

/**
 * `api` is the Management API suffix: subject goes to `mailer_subjects_<api>`
 * and HTML to `mailer_templates_<api>_content`. `dashboard` is the template's
 * name in Supabase → Authentication → Emails.
 */
export const templates = [
  {
    api: 'confirmation',
    dashboard: 'Confirm sign up',
    subject: 'Confirma tu cuenta de Administratum',
    preheader: 'Un clic y entras directamente. Tu colección te espera.',
    eyebrow: 'Nueva cuenta',
    title: 'Te damos la bienvenida',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p(`Gracias por unirte a ${strong('Administratum')}, el cuartel general de tu hobby. Solo falta un paso: confirma tu correo y entrarás directamente en tu cuenta.`),
      button(confirmLink('email'), 'Confirmar mi cuenta'),
      features(),
      note('¿No has creado tú esta cuenta? Ignora este correo: sin confirmar, la cuenta no se activará.'),
      fallback(confirmLink('email')),
      signature('Nos vemos en la mesa de juego,'),
    ],
  },
  {
    api: 'recovery',
    dashboard: 'Reset password',
    subject: 'Restablece tu contraseña de Administratum',
    preheader: 'Elige una contraseña nueva y vuelve a tu colección.',
    eyebrow: 'Seguridad de la cuenta',
    title: 'Restablece tu contraseña',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p('Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón, elige una nueva y entrarás directamente.'),
      button(confirmLink('recovery'), 'Elegir nueva contraseña'),
      note(`${strong('¿No lo has pedido tú?')} Ignora este correo: tu contraseña seguirá siendo la misma. Por seguridad, el enlace caduca pronto y solo funciona una vez.`),
      fallback(confirmLink('recovery')),
      signature('Un saludo,'),
    ],
  },
  {
    api: 'email_change',
    dashboard: 'Change email address',
    subject: 'Confirma el cambio de correo en Administratum',
    preheader: 'Confirma la nueva dirección de tu cuenta.',
    eyebrow: 'Cambio de correo',
    title: 'Confirma tu nuevo correo',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p('Has pedido cambiar la dirección de correo de tu cuenta:'),
      swap('Correo actual', '{{ .Email }}', 'Correo nuevo', '{{ .NewEmail }}'),
      button(confirmLink('email_change'), 'Confirmar el cambio'),
      note(`${strong('¿No has sido tú?')} No pulses el botón y escríbenos a <a href="mailto:${CONTACT}" style="color:${C.gold};">${CONTACT}</a>.`, C.alert),
      fallback(confirmLink('email_change')),
      signature('Un saludo,'),
    ],
  },
  {
    api: 'magic_link',
    dashboard: 'Magic link',
    subject: 'Tu enlace para entrar en Administratum',
    preheader: 'Entra en tu cuenta con un solo clic.',
    eyebrow: 'Acceso',
    title: 'Tu enlace para entrar',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p('Pulsa el botón para entrar en tu cuenta de Administratum. No necesitas contraseña.'),
      button(confirmLink('email', '&flow=magiclink'), 'Entrar en Administratum'),
      note('El enlace caduca pronto y solo funciona una vez. Si no has intentado entrar, ignora este correo.'),
      fallback(confirmLink('email', '&flow=magiclink')),
      signature('Un saludo,'),
    ],
  },
  {
    api: 'invite',
    dashboard: 'Invite user',
    subject: 'Te han invitado a Administratum',
    preheader: 'Acepta la invitación y elige tu contraseña.',
    eyebrow: 'Invitación',
    title: 'Te han invitado a Administratum',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p(`Te han invitado a unirte a ${strong('Administratum')}, el sitio para gestionar tu colección, tus listas y tu progreso de pintura. Acepta la invitación y elige tu contraseña.`),
      button(confirmLink('invite'), 'Aceptar invitación'),
      features(),
      note('¿No esperabas esta invitación? Puedes ignorar este correo sin problema.'),
      fallback(confirmLink('invite')),
      signature('Nos vemos en la mesa de juego,'),
    ],
  },
  {
    api: 'reauthentication',
    dashboard: 'Reauthentication',
    subject: 'Tu código de verificación de Administratum',
    preheader: 'Introduce este código para continuar.',
    eyebrow: 'Verificación',
    title: 'Confirma que eres tú',
    reason: ACCOUNT_REASON,
    body: [
      greeting(),
      p('Introduce este código en Administratum para continuar:'),
      code('{{ .Token }}'),
      note(`El código caduca pronto. ${strong('Si no lo has pedido tú')}, ignora este correo y cambia tu contraseña.`, C.alert),
      signature('Un saludo,'),
    ],
  },
  {
    api: 'password_changed_notification',
    dashboard: 'Password changed (Security notifications)',
    notification: 'password_changed',
    subject: 'Tu contraseña de Administratum ha cambiado',
    preheader: 'Aviso de seguridad sobre tu cuenta.',
    eyebrow: 'Aviso de seguridad',
    title: 'Tu contraseña ha cambiado',
    accent: C.alert,
    siteUrl: SITE,
    reason: SECURITY_REASON,
    body: [
      greeting('Hola.'),
      p(`La contraseña de tu cuenta ${strong('{{ .Email }}')} se acaba de cambiar.`),
      note(`${strong('¿Has sido tú?')} Perfecto, no tienes que hacer nada.`),
      note(`${strong('¿No has sido tú?')} Restablece tu contraseña ahora desde la pantalla de inicio de sesión («¿Olvidaste tu contraseña?») y escríbenos a <a href="mailto:${CONTACT}" style="color:${C.gold};">${CONTACT}</a>.`, C.alert),
      button(SITE, 'Ir a Administratum'),
      signature('Un saludo,'),
    ],
  },
  {
    api: 'email_changed_notification',
    dashboard: 'Email address changed (Security notifications)',
    notification: 'email_changed',
    subject: 'El correo de tu cuenta de Administratum ha cambiado',
    preheader: 'Aviso de seguridad sobre tu cuenta.',
    eyebrow: 'Aviso de seguridad',
    title: 'El correo de tu cuenta ha cambiado',
    accent: C.alert,
    siteUrl: SITE,
    reason: SECURITY_REASON,
    body: [
      greeting('Hola.'),
      p('La dirección de correo de tu cuenta de Administratum ha cambiado:'),
      swap('Correo anterior', '{{ .OldEmail }}', 'Correo actual', '{{ .Email }}'),
      note(`${strong('¿No has sido tú?')} Escríbenos cuanto antes a <a href="mailto:${CONTACT}" style="color:${C.gold};">${CONTACT}</a> para recuperar tu cuenta.`, C.alert),
      signature('Un saludo,'),
    ],
  },
].map((t) => ({ ...t, html: layout({ ...t, body: t.body.join('\n              ') }) }));
