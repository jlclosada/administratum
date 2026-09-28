// Supabase Auth email templates — single source of truth.
//
// `npm run email:build` writes the final HTML to supabase/templates/ (to paste
// into the dashboard or preview), `npm run email:push` uploads them all at
// once through the Supabase Management API.
//
// Placeholders like {{ .TokenHash }} are Go template variables that Supabase
// fills in when it sends the email.

const SITE = 'https://administratum.site';
const CONTACT = 'hola@administratum.site';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Link into the app's /auth/confirmar page, which verifies the token itself. */
const confirmLink = (type, extra = '') =>
  `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=${type}${extra}`;

const HELLO = 'Hola{{ if .Data.display_name }} {{ .Data.display_name }}{{ end }},';

const p = (html) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46;">${html}</p>`;

const small = (html) =>
  `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">${html}</p>`;

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" bgcolor="#0a0a0b" style="border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;

const fallback = (href) =>
  small(
    `Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${href}" style="color:#52525b;word-break:break-all;">${href}</a>`,
  );

const code = (value) => `
<div style="margin:28px 0 8px;padding:18px 0;border-radius:8px;background:#f4f4f5;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#0a0a0b;">${value}</div>`;

/** Shared frame: dark header with the logo, white body, quiet footer. */
function layout({ subject, preheader, title, body, siteUrl = '{{ .SiteURL }}' }) {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" bgcolor="#0a0a0b" style="background:#0a0a0b;border-radius:12px 12px 0 0;padding:28px 32px;border-bottom:3px solid #c8b88e;">
              <a href="${siteUrl}" target="_blank" style="text-decoration:none;">
                <img src="${SITE}/images/logo.png" width="200" alt="ADMINISTRATUM" style="display:block;width:200px;max-width:100%;height:auto;border:0;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:0.2em;color:#e7e2d6;">
              </a>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;padding:40px 36px 36px;font-family:${FONT};">
              <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0a0a0b;">${title}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td bgcolor="#fafafa" style="background:#fafafa;border-top:1px solid #e4e4e7;border-radius:0 0 12px 12px;padding:20px 36px;font-family:${FONT};font-size:12px;line-height:1.6;color:#71717a;">
              Has recibido este correo porque se ha usado esta dirección en
              <a href="${SITE}" style="color:#52525b;">administratum.site</a>.
              ¿Dudas? Escríbenos a <a href="mailto:${CONTACT}" style="color:#52525b;">${CONTACT}</a>.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 16px 0;font-family:${FONT};font-size:11px;line-height:1.5;color:#a1a1aa;">
              Administratum es un proyecto independiente, sin afiliación con Games Workshop.<br>
              <a href="${SITE}/legal/privacidad" style="color:#a1a1aa;">Política de privacidad</a>
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
    preheader: 'Un clic y entras directamente en tu cuenta.',
    title: 'Confirma tu correo',
    body: [
      p(HELLO),
      p('Gracias por unirte a Administratum. Pulsa el botón para confirmar tu dirección de correo: entrarás directamente en tu cuenta.'),
      button(confirmLink('email'), 'Confirmar mi cuenta'),
      fallback(confirmLink('email')),
      small('Si no has creado una cuenta en Administratum, ignora este correo.'),
    ],
  },
  {
    api: 'recovery',
    dashboard: 'Reset password',
    subject: 'Restablece tu contraseña de Administratum',
    preheader: 'Elige una contraseña nueva para tu cuenta.',
    title: 'Restablece tu contraseña',
    body: [
      p(HELLO),
      p('Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.'),
      button(confirmLink('recovery'), 'Elegir nueva contraseña'),
      fallback(confirmLink('recovery')),
      small('El enlace caduca en poco tiempo y solo puede usarse una vez. Si no lo has pedido tú, ignora este correo: tu contraseña no cambiará.'),
    ],
  },
  {
    api: 'email_change',
    dashboard: 'Change email address',
    subject: 'Confirma el cambio de correo en Administratum',
    preheader: 'Confirma tu nueva dirección de correo.',
    title: 'Confirma el cambio de correo',
    body: [
      p(HELLO),
      p('Has pedido cambiar el correo de tu cuenta de <strong>{{ .Email }}</strong> a <strong>{{ .NewEmail }}</strong>. Pulsa el botón para confirmarlo.'),
      button(confirmLink('email_change'), 'Confirmar el cambio'),
      fallback(confirmLink('email_change')),
      small(`Si no has pedido este cambio, ignora este correo y escríbenos a <a href="mailto:${CONTACT}" style="color:#52525b;">${CONTACT}</a>.`),
    ],
  },
  {
    api: 'magic_link',
    dashboard: 'Magic link',
    subject: 'Tu enlace para entrar en Administratum',
    preheader: 'Entra en tu cuenta con un clic.',
    title: 'Entra en tu cuenta',
    body: [
      p(HELLO),
      p('Pulsa el botón para iniciar sesión en Administratum. No necesitas contraseña.'),
      button(confirmLink('email', '&flow=magiclink'), 'Iniciar sesión'),
      fallback(confirmLink('email', '&flow=magiclink')),
      small('El enlace caduca en poco tiempo y solo puede usarse una vez. Si no has intentado entrar, ignora este correo.'),
    ],
  },
  {
    api: 'invite',
    dashboard: 'Invite user',
    subject: 'Te han invitado a Administratum',
    preheader: 'Acepta la invitación y elige tu contraseña.',
    title: 'Te han invitado a Administratum',
    body: [
      p('Hola,'),
      p('Te han invitado a unirte a Administratum, el sitio para gestionar tu colección de miniaturas, tus listas y tu progreso de pintura. Pulsa el botón para aceptar y elegir tu contraseña.'),
      button(confirmLink('invite'), 'Aceptar invitación'),
      fallback(confirmLink('invite')),
      small('Si no esperabas esta invitación, ignora este correo.'),
    ],
  },
  {
    api: 'reauthentication',
    dashboard: 'Reauthentication',
    subject: 'Tu código de verificación de Administratum',
    preheader: 'Introduce este código para continuar.',
    title: 'Código de verificación',
    body: [
      p(HELLO),
      p('Introduce este código para confirmar que eres tú:'),
      code('{{ .Token }}'),
      small('El código caduca en poco tiempo. Si no has pedido ningún código, ignora este correo y cambia tu contraseña.'),
    ],
  },
  {
    api: 'password_changed_notification',
    dashboard: 'Password changed (Security notifications)',
    notification: 'password_changed',
    subject: 'Tu contraseña de Administratum ha cambiado',
    preheader: 'Aviso de seguridad sobre tu cuenta.',
    title: 'Tu contraseña ha cambiado',
    siteUrl: SITE,
    body: [
      p('Hola,'),
      p('La contraseña de tu cuenta de Administratum (<strong>{{ .Email }}</strong>) se acaba de cambiar.'),
      p('Si has sido tú, no tienes que hacer nada.'),
      p(`Si <strong>no</strong> has sido tú, restablece tu contraseña ahora desde la pantalla de inicio de sesión («¿Has olvidado tu contraseña?») y escríbenos a <a href="mailto:${CONTACT}" style="color:#0a0a0b;">${CONTACT}</a>.`),
      button(SITE, 'Ir a Administratum'),
    ],
  },
  {
    api: 'email_changed_notification',
    dashboard: 'Email address changed (Security notifications)',
    notification: 'email_changed',
    subject: 'El correo de tu cuenta de Administratum ha cambiado',
    preheader: 'Aviso de seguridad sobre tu cuenta.',
    title: 'El correo de tu cuenta ha cambiado',
    siteUrl: SITE,
    body: [
      p('Hola,'),
      p('El correo de tu cuenta de Administratum ha cambiado de <strong>{{ .OldEmail }}</strong> a <strong>{{ .Email }}</strong>.'),
      p(`Si no has sido tú, escríbenos cuanto antes a <a href="mailto:${CONTACT}" style="color:#0a0a0b;">${CONTACT}</a> para recuperar tu cuenta.`),
    ],
  },
].map((t) => ({ ...t, html: layout({ ...t, body: t.body.join('\n              ') }) }));
