// Promotional email presenting Administratum, for people who have agreed to
// hear from us (see marketing/README.md before sending). Same look as the
// auth emails; each feature carries a small HTML mock-up with sample data, so
// it reads well even when the client blocks images.
//
// Placeholders use Resend Broadcasts syntax: {{{FIRST_NAME|…}}} and
// {{{RESEND_UNSUBSCRIBE_URL}}}. `npm run email:build` writes
// marketing/presentacion.html.

import { C, CONTACT, MONO, SANS, SERIF, SITE, button, layout, p, signature, strong } from './templates.mjs';

const SIGNUP = `${SITE}/?registro=1&utm_source=email&utm_medium=presentacion`;

// ---------------------------------------------------------------------------
// Mock-up building blocks (tables + inline styles only)
// ---------------------------------------------------------------------------

/** Panel with three "window" dots, framing each mock-up. */
const frame = (inner) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;background:${C.panel};border:1px solid ${C.line};border-radius:14px;">
  <tr>
    <td style="padding:12px 18px 0;font-size:9px;line-height:1;letter-spacing:4px;color:#3a3a42;">&#9679;&#9679;&#9679;</td>
  </tr>
  <tr>
    <td style="padding:12px 18px 18px;font-family:${SANS};">${inner}</td>
  </tr>
</table>`;

const bar = (pct) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 8px;">
  <tr>
    <td bgcolor="${C.line}" style="background:${C.line};border-radius:99px;height:8px;line-height:8px;font-size:1px;">
      <table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0" border="0">
        <tr><td bgcolor="${C.gold}" style="background:${C.gold};background-image:linear-gradient(90deg,#ecdcae,${C.gold},#a8894c);border-radius:99px;height:8px;line-height:8px;font-size:1px;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>`;

const pill = (text, strongPill = false) =>
  `<span style="display:inline-block;margin:4px 6px 0 0;padding:5px 11px;border-radius:99px;font-size:12px;font-weight:600;${
    strongPill
      ? `background:${C.gold};color:#141210;`
      : `border:1px solid ${C.line};color:${C.muted};`
  }">${text}</span>`;

const row = (left, right, rightColor = C.white) => `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.text};">${left}</td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${MONO};font-size:13px;font-weight:700;color:${rightColor};white-space:nowrap;">${right}</td>
  </tr>`;

const table = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`;

const caption = (text) =>
  `<div style="margin-top:10px;font-size:11px;letter-spacing:0.04em;color:${C.faint};">${text}</div>`;

const heading = (text, sub) =>
  `<div style="font-size:15px;font-weight:700;color:${C.white};">${text}</div>${
    sub ? `<div style="margin-top:2px;font-size:12px;color:${C.muted};">${sub}</div>` : ''
  }`;

// ---------------------------------------------------------------------------
// Feature mock-ups (illustrative sample data)
// ---------------------------------------------------------------------------

const mockCollection = frame(`
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>${heading('Mil Hijos', 'Warhammer 40,000 · 42 miniaturas')}</td>
    <td align="right" valign="top" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C.gold};">68%</td>
  </tr></table>
  ${bar(68)}
  ${pill('Sin montar · 6')}${pill('Imprimadas · 8')}${pill('Pintadas · 28', true)}`);

const mockPoints = frame(`
  ${heading('Puntos · Mil Hijos', 'Actualizados hoy')}
  <div style="height:8px;line-height:8px;font-size:1px;">&nbsp;</div>
  ${table([
    row('Rubric Marines <span style="color:' + C.faint + ';">· 5</span>', '100 pts &nbsp;<span style="color:' + C.alert + ';">&#9650;10</span>'),
    row('Scarab Occult Terminators <span style="color:' + C.faint + ';">· 5</span>', '180 pts &nbsp;<span style="color:#6fcf97;">&#9660;5</span>'),
    row('Tzaangors <span style="color:' + C.faint + ';">· 10</span>', '65 pts &nbsp;<span style="color:' + C.faint + ';">=</span>'),
  ])}
  ${caption('Ejemplo ilustrativo')}`);

const mockList = frame(`
  ${heading('Grand Coven · 2.000 pts', 'Mil Hijos · Destacamento Grand Coven')}
  <div style="height:8px;line-height:8px;font-size:1px;">&nbsp;</div>
  ${table([
    row('<span style="font-size:11px;letter-spacing:0.16em;color:' + C.gold + ';">PERSONAJES</span>', ''),
    row('Hechicero en disco de Tzeentch', '130'),
    row('<span style="font-size:11px;letter-spacing:0.16em;color:' + C.gold + ';">LÍNEA</span>', ''),
    row('Rubric Marines ×2', '200'),
  ])}
  <div style="margin-top:12px;">${pill('Copiar lista', true)}${pill('Publicar en la comunidad')}</div>`);

const mockTournament = frame(`
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="62" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:10px;">
        <tr><td align="center" style="padding:6px 12px 0;font-family:${SERIF};font-size:22px;font-weight:700;color:${C.white};">12</td></tr>
        <tr><td align="center" style="padding:0 12px 6px;font-size:10px;letter-spacing:0.18em;color:${C.gold};">OCT</td></tr>
      </table>
    </td>
    <td valign="top" style="padding-left:14px;">
      ${heading('Torneo de liga · 2.000 pts', 'Tu ciudad · 24 de 32 plazas')}
      ${bar(75)}
      ${pill('Asistiré &#10003;', true)}${pill('Ver bases')}
    </td>
  </tr></table>`);

const swatch = (hex) =>
  `<td style="padding-right:8px;"><div style="width:30px;height:30px;border-radius:99px;background:${hex};border:1px solid rgba(255,255,255,0.12);font-size:1px;line-height:1px;">&nbsp;</div></td>`;

const mockPainting = frame(`
  ${heading('Armadura azul y oro, paso a paso', '8 pasos · 5 pinturas · &#9733; 4,8')}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>
    ${['#1c2f57', '#2f5da8', '#78a6dd', '#b8923f', '#e9dcbc'].map(swatch).join('')}
  </tr></table>
  ${caption('Base · Capa · Luces · Metal · Detalles')}`);

const mockCommunity = frame(`
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="40" valign="top">
      <div style="width:34px;height:34px;border-radius:99px;background:${C.gold};background-image:linear-gradient(135deg,#ecdcae,${C.gold},#a8894c);color:#141210;font-weight:700;font-size:14px;line-height:34px;text-align:center;">L</div>
    </td>
    <td valign="top" style="padding-left:10px;">
      <div style="display:inline-block;background:${C.card};border:1px solid ${C.line};border-radius:4px 14px 14px 14px;padding:10px 14px;font-size:14px;line-height:1.5;color:${C.text};">
        <strong style="color:${C.white};">Laura</strong><br>¡Qué degradados en la capa! ¿Qué pinturas usaste?
      </div>
      <div style="margin-top:8px;font-size:12px;color:${C.muted};">&#9829; 24 &nbsp;·&nbsp; 6 comentarios &nbsp;·&nbsp; Guardado</div>
    </td>
  </tr></table>`);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const feature = (n, label, title, text, mock) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 40px;">
  <tr>
    <td>
      <div style="font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${C.gold};">${n}&nbsp;&nbsp;·&nbsp;&nbsp;${label}</div>
      <h2 style="margin:8px 0 10px;font-family:${SERIF};font-size:22px;line-height:1.3;font-weight:700;color:${C.white};">${title}</h2>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.text};">${text}</p>
      ${mock}
    </td>
  </tr>
</table>`;

const why = () => {
  const items = [
    ['Gratis y en español', 'Sin suscripciones ni funciones de pago escondidas.'],
    ['Tu colección es tuya', 'Lo que registras es privado: solo tú lo ves, salvo lo que decidas compartir.'],
    ['Pensado para la mesa', 'Consulta puntos y listas desde el móvil, en la tienda o en pleno torneo.'],
  ];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;background:${C.panel};border:1px solid ${C.line};border-radius:14px;">
  <tr><td style="padding:22px 24px 8px;font-family:${SERIF};font-size:13px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${C.gold};">Por qué Administratum</td></tr>
  ${items
    .map(
      ([t, d]) => `
  <tr>
    <td style="padding:8px 24px 12px;font-family:${SANS};">
      <div style="font-size:15px;font-weight:600;color:${C.white};"><span style="color:${C.gold};">&#9670;</span>&nbsp;&nbsp;${t}</div>
      <div style="margin:3px 0 0 20px;font-size:14px;line-height:1.6;color:${C.muted};">${d}</div>
    </td>
  </tr>`,
    )
    .join('')}
  <tr><td style="height:12px;line-height:12px;font-size:1px;">&nbsp;</td></tr>
</table>`;
};

const finalCta = () => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">
  <tr>
    <td align="center" style="padding:34px 12px 8px;">
      <div style="font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:700;color:${C.white};">Tu ejército te espera.</div>
      <div style="margin-top:8px;font-family:${SANS};font-size:15px;color:${C.muted};">Crear la cuenta lleva un minuto. Puedes entrar con Google.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>${button(SIGNUP, 'Crear mi cuenta gratis')}</td></tr></table>
    </td>
  </tr>
</table>`;

const body = [
  `<p style="margin:0 0 18px;font-family:${SERIF};font-size:22px;line-height:1.3;font-weight:700;color:${C.white};">Hola, {{{FIRST_NAME|hobbyista}}}.</p>`,
  p(`Si coleccionas, pintas o juegas a Warhammer 40,000, seguramente tienes tu hobby repartido entre una hoja de cálculo, la app de listas, fotos en el móvil y tres grupos de mensajería. ${strong('Administratum')} lo reúne todo en un solo sitio, gratis.`),
  button(SIGNUP, 'Crear mi cuenta gratis'),
  feature('I', 'Colección', 'Tu colección, en orden', 'Registra ejércitos y miniaturas y sigue su progreso de pintura, de la caja al barniz. Siempre sabrás qué te queda por pintar.', mockCollection),
  feature('II', 'Puntos', 'Los puntos oficiales, siempre al día', 'El catálogo de puntos de todas las facciones se actualiza cada día, con cada subida y bajada señalada. Sin PDFs ni capturas desactualizadas.', mockPoints),
  feature('III', 'Listas', 'Listas listas para jugar', 'Pega la exportación de tu lista y la verás ordenada y lista para copiar. Publícala con tu explicación y descubre lo que juega la comunidad.', mockList),
  feature('IV', 'Competitivo', 'Torneos con todo a mano', 'Consulta las bases de cada torneo, las fechas y las plazas, apúntate con un clic y mira qué listas están marcando el meta.', mockTournament),
  feature('V', 'Pintura', 'Aprende y enseña a pintar', 'Guías paso a paso con las pinturas usadas y fotos del proceso. Valora las que te ayuden y comparte tus técnicas.', mockPainting),
  feature('VI', 'Comunidad', 'Enseña tu trabajo', 'Comparte fotos de tus miniaturas, comenta, guarda tus favoritas y haz amigos con quien hablar por chat.', mockCommunity),
  why(),
  finalCta(),
  signature('Nos vemos en la mesa de juego,'),
  `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">${strong('P. D.')} ¿Tienes un club o una tienda, u organizas torneos? Escríbenos a <a href="mailto:${CONTACT}" style="color:${C.gold};">${CONTACT}</a> y te ayudamos a publicarlos.</p>`,
];

export const promo = {
  file: 'presentacion.html',
  subject: 'Tu colección, tus listas y tu comunidad, en un solo lugar',
  preheader: 'Colección, pintura, puntos al día, listas, torneos y comunidad. Gratis y en español.',
  html: layout({
    subject: 'Tu colección, tus listas y tu comunidad, en un solo lugar',
    preheader: 'Colección, pintura, puntos al día, listas, torneos y comunidad. Gratis y en español.',
    eyebrow: 'Presentamos Administratum',
    title: 'Todo tu hobby, en un solo lugar',
    siteUrl: SITE,
    reason: 'Te escribimos porque nos diste tu correo o te interesa el hobby. Remitente: Administratum.',
    footerNote: `
              <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:${C.faint};">
                ¿No quieres recibir más correos como este? <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${C.muted};">Date de baja</a> con un clic.
              </p>`,
    body: body.join('\n              '),
  }),
};
