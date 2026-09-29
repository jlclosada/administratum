// Vercel function for everything email that isn't Supabase Auth:
//
//   POST /api/email  { action: 'preview' | 'test' | 'send' | 'run-reminders', … }
//        Admin panel (Authorization: Bearer <user access token>, admins only).
//   GET  /api/email?action=cron
//        Daily Vercel Cron (Authorization: Bearer $CRON_SECRET): inactivity
//        reminders, when enabled in Admin → Correos.
//   GET|POST /api/email?action=unsubscribe&u=<user>&t=<signature>
//        One-click unsubscribe link in every email (RFC 8058 POST too).
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, CRON_SECRET; optional EMAIL_FROM, EMAIL_SEND_LIMIT.
//
// Self-contained on purpose: Vercel compiles each function file on its own.
// The look mirrors scripts/email/templates.mjs (the Supabase Auth emails).

import { createHmac, timingSafeEqual } from 'node:crypto';

const SITE = 'https://administratum.site';
const ASSETS = `${SITE}/email`;
const CONTACT = 'hola@administratum.site';
const FROM = process.env.EMAIL_FROM || 'Administratum <hola@administratum.site>';
/** Resend's free plan allows 100 emails a day; keep some room for auth emails. */
const SEND_LIMIT = Number(process.env.EMAIL_SEND_LIMIT) || 80;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

async function rest(
  path: string,
  init: { key?: string; token?: string; method?: string; body?: unknown; prefer?: string } = {},
) {
  const key = init.key ?? SERVICE_KEY;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${init.token ?? key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) throw new Error(`${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** The signed-in admin behind a request, or null. */
async function adminFromRequest(req: Request): Promise<{ id: string; email: string } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const user = await rest('/auth/v1/user', { key: ANON_KEY, token });
    const isAdmin = await rest('/rest/v1/rpc/is_admin', { key: ANON_KEY, token, method: 'POST', body: {} });
    return user?.id && isAdmin === true ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Unsubscribe links (HMAC-signed user id)
// ---------------------------------------------------------------------------

const unsubSecret = () => process.env.EMAIL_UNSUBSCRIBE_SECRET || SERVICE_KEY;

export function signUser(userId: string, secret = unsubSecret()): string {
  return createHmac('sha256', secret).update(`unsubscribe:${userId}`).digest('base64url');
}

export function verifyUser(userId: string, signature: string, secret = unsubSecret()): boolean {
  const expected = Buffer.from(signUser(userId, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const unsubscribeUrl = (userId: string) =>
  `${SITE}/api/email?action=unsubscribe&u=${encodeURIComponent(userId)}&t=${signUser(userId)}`;

// ---------------------------------------------------------------------------
// Content for the emails (public data)
// ---------------------------------------------------------------------------

export interface Digest {
  articles: Row[];
  points: Row[];
  tournaments: Row[];
  lists: Row[];
  photos: Row[];
}

async function loadDigest(): Promise<Digest> {
  const q = (path: string) => rest(path, { key: ANON_KEY }).catch(() => [] as Row[]);
  const today = new Date().toISOString().slice(0, 10);
  const [articles, points, tournaments, lists, photos] = await Promise.all([
    q('/rest/v1/articles?select=id,title,excerpt,cover_image&published=eq.true&order=created_at.desc&limit=3'),
    q('/rest/v1/catalog_updates?select=title,description,points_delta,points_after,link&type=eq.points&order=occurred_at.desc&limit=6'),
    q(
      `/rest/v1/tournaments?select=id,name,location,start_date,max_players,attendee_count&published=eq.true&start_date=gte.${today}&order=start_date.asc&limit=3`,
    ),
    q('/rest/v1/community_lists?select=id,title,faction_name,total_points,author_name&order=created_at.desc&limit=3'),
    q('/rest/v1/shared_photos?select=id,title,caption,image,author_name&order=created_at.desc&limit=3'),
  ]);
  return { articles, points, tournaments, lists, photos };
}

// ---------------------------------------------------------------------------
// Email building blocks (email-safe tables + inline styles)
// ---------------------------------------------------------------------------

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
  up: '#e8a25c',
  down: '#6fcf97',
};
const SERIF = "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif";
const SANS = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const p = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.7;color:${C.text};">${html}</p>`;
const strong = (t: string) => `<strong style="color:${C.white};font-weight:600;">${t}</strong>`;
const greeting = (name: string) =>
  `<p style="margin:0 0 18px;font-family:${SERIF};font-size:22px;line-height:1.3;font-weight:700;color:${C.white};">${
    name ? `Hola, ${esc(name)}.` : 'Hola.'
  }</p>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 30px;">
  <tr><td align="center" bgcolor="${C.gold}" style="border-radius:10px;background:${C.gold};background-image:linear-gradient(135deg,#ecdcae 0%,${C.gold} 45%,${C.goldDeep} 100%);">
    <a href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:15px;font-weight:700;line-height:1;color:#141210;text-decoration:none;border-radius:10px;">${label}&nbsp;&nbsp;&rarr;</a>
  </td></tr>
</table>`;

const sectionTitle = (text: string, href?: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:34px 0 12px;">
  <tr>
    <td style="font-family:${SERIF};font-size:13px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${C.gold};">${text}</td>
    ${href ? `<td align="right" style="font-family:${SANS};font-size:13px;"><a href="${href}" style="color:${C.muted};text-decoration:none;">Ver todo &rarr;</a></td>` : ''}
  </tr>
</table>`;

const panel = (inner: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border:1px solid ${C.line};border-radius:14px;">
  <tr><td style="padding:6px 20px;font-family:${SANS};">${inner}</td></tr>
</table>`;

const itemRow = (href: string, title: string, meta: string, right = '', last = false) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:13px 0;${last ? '' : `border-bottom:1px solid ${C.line};`}">
      <a href="${href}" style="font-size:15px;font-weight:600;color:${C.white};text-decoration:none;">${esc(title)}</a>
      ${meta ? `<div style="margin-top:3px;font-size:13px;color:${C.muted};">${meta}</div>` : ''}
    </td>
    ${
      right
        ? `<td align="right" valign="middle" style="padding:13px 0 13px 12px;${last ? '' : `border-bottom:1px solid ${C.line};`}white-space:nowrap;font-family:${MONO};font-size:13px;font-weight:700;">${right}</td>`
        : ''
    }
  </tr>
</table>`;

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

function pointsBlock(points: Row[]) {
  if (!points.length) return '';
  return (
    sectionTitle('Cambios de puntos', `${SITE}/catalogo-puntos`) +
    panel(
      points
        .map((u, i) => {
          const d = Number(u.points_delta);
          const delta =
            Number.isFinite(d) && d !== 0
              ? `<span style="color:${d > 0 ? C.up : C.down};">${d > 0 ? '&#9650;' : '&#9660;'}${Math.abs(d)}</span>`
              : '';
          const right = `${u.points_after != null ? `${esc(u.points_after)} pts&nbsp;&nbsp;` : ''}${delta}`;
          return itemRow(
            u.link ? `${SITE}${u.link}` : `${SITE}/catalogo-puntos`,
            u.title,
            esc(u.description ?? ''),
            right,
            i === points.length - 1,
          );
        })
        .join(''),
    )
  );
}

function articlesBlock(articles: Row[]) {
  if (!articles.length) return '';
  return (
    sectionTitle('Noticias') +
    panel(
      articles
        .map((a, i) =>
          itemRow(`${SITE}/articulos/${a.id}`, a.title, esc((a.excerpt ?? '').slice(0, 120)), '', i === articles.length - 1),
        )
        .join(''),
    )
  );
}

function tournamentsBlock(tournaments: Row[]) {
  if (!tournaments.length) return '';
  return (
    sectionTitle('Próximos torneos', `${SITE}/competitivo`) +
    panel(
      tournaments
        .map((t, i) =>
          itemRow(
            `${SITE}/competitivo/torneos/${t.id}`,
            t.name,
            [t.start_date && fmtDate(t.start_date), t.location].filter(Boolean).map(esc).join(' · '),
            t.max_players ? `<span style="color:${C.gold};">${esc(t.attendee_count ?? 0)}/${esc(t.max_players)}</span>` : '',
            i === tournaments.length - 1,
          ),
        )
        .join(''),
    )
  );
}

function listsBlock(lists: Row[]) {
  if (!lists.length) return '';
  return (
    sectionTitle('Listas nuevas', `${SITE}/competitivo#listas`) +
    panel(
      lists
        .map((l, i) =>
          itemRow(
            `${SITE}/comunidad/listas/${l.id}`,
            l.title,
            `${esc(l.faction_name)} · por ${esc(l.author_name)}`,
            `<span style="color:${C.gold};">${esc(l.total_points)} pts</span>`,
            i === lists.length - 1,
          ),
        )
        .join(''),
    )
  );
}

function photosBlock(photos: Row[]) {
  const withImages = photos.filter((ph) => /^https?:\/\//.test(ph.image ?? ''));
  if (!withImages.length) return '';
  const cells = withImages
    .map(
      (ph) => `
    <td width="33%" valign="top" style="padding:0 5px;">
      <a href="${SITE}/comunidad?foto=${ph.id}" style="text-decoration:none;">
        <img src="${esc(ph.image)}" width="160" alt="${esc(ph.title || ph.caption || 'Miniaturas pintadas')}" style="display:block;width:100%;height:auto;border-radius:10px;border:1px solid ${C.line};">
        <div style="margin-top:6px;font-family:${SANS};font-size:12px;color:${C.muted};">${esc(ph.title || 'Foto')} · ${esc(ph.author_name)}</div>
      </a>
    </td>`,
    )
    .join('');
  return (
    sectionTitle('En la comunidad', `${SITE}/comunidad`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`
  );
}

function signature(closing: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:34px;border-top:1px solid ${C.line};">
  <tr><td style="padding-top:26px;">
    <p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${closing}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:14px;"><img src="${ASSETS}/emblem.png" width="46" height="46" alt="" style="display:block;border:0;width:46px;height:46px;"></td>
      <td valign="middle" style="font-family:${SANS};">
        <div style="font-family:${SERIF};font-size:15px;font-weight:700;letter-spacing:0.06em;color:${C.white};">El equipo de Administratum</div>
        <div style="margin-top:2px;font-size:13px;"><a href="${SITE}" style="color:${C.gold};text-decoration:none;">administratum.site</a>
        &nbsp;·&nbsp;<a href="mailto:${CONTACT}" style="color:${C.muted};text-decoration:none;">${CONTACT}</a></div>
      </td>
    </tr></table>
  </td></tr>
</table>`;
}

function layout(o: { subject: string; preheader: string; eyebrow: string; title: string; body: string; unsubscribe: string }) {
  const footerLink = (href: string, label: string) =>
    `<a href="${href}" style="color:${C.muted};text-decoration:none;">${label}</a>`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${esc(o.subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <style>
    @font-face { font-family: 'Geist'; src: url('${SITE}/fonts/Geist-Variable.woff2') format('woff2'); font-weight: 100 900; }
    a { color: ${C.gold}; }
    @media only screen and (max-width: 620px) {
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .hero-title { font-size: 26px !important; }
      .outer { padding: 0 !important; }
      .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(o.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr><td align="center" class="outer" style="padding:36px 16px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;">
        <tr><td align="center" background="${ASSETS}/hero.jpg" bgcolor="${C.page}" style="background:${C.page} url('${ASSETS}/hero.jpg') center / cover no-repeat;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" class="px" style="padding:48px 40px 44px;">
              <a href="${SITE}" style="text-decoration:none;"><img src="${ASSETS}/logo.png" width="300" alt="ADMINISTRATUM" style="display:block;width:300px;max-width:100%;height:auto;border:0;font-family:${SERIF};font-size:24px;color:${C.gold};"></a>
              <div style="margin:34px 0 14px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:${C.gold};">&#9670;&nbsp;&nbsp;${esc(o.eyebrow)}&nbsp;&nbsp;&#9670;</div>
              <h1 class="hero-title" style="margin:0;font-family:${SERIF};font-size:32px;line-height:1.2;font-weight:700;color:${C.white};">${esc(o.title)}</h1>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="height:1px;line-height:1px;font-size:1px;background:${C.goldDeep};background-image:linear-gradient(90deg,rgba(216,192,138,0) 0%,${C.gold} 50%,rgba(216,192,138,0) 100%);">&nbsp;</td></tr>
        <tr><td class="px" style="padding:42px 48px 44px;">${o.body}</td></tr>
        <tr><td class="px" align="center" style="padding:28px 48px 32px;background:#0d0d0f;border-top:1px solid ${C.line};font-family:${SANS};">
          <p style="margin:0 0 14px;font-size:13px;">
            ${footerLink(SITE, 'Inicio')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/comunidad`, 'Comunidad')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/competitivo`, 'Competitivo')}&nbsp;&nbsp;·&nbsp;&nbsp;${footerLink(`${SITE}/catalogo-puntos`, 'Puntos')}
          </p>
          <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:${C.faint};">
            Recibes este correo porque tienes una cuenta en Administratum y aceptas novedades por correo.<br>
            <a href="${o.unsubscribe}" style="color:${C.muted};">Darme de baja</a> · también puedes desactivarlo en Ajustes.
          </p>
          <p style="margin:0;font-size:11px;line-height:1.7;color:#4a4a52;">
            © ${new Date().getFullYear()} Administratum · Proyecto independiente, sin afiliación con Games Workshop.<br>
            <a href="${SITE}/legal/privacidad" style="color:#4a4a52;">Privacidad</a> · <a href="mailto:${CONTACT}" style="color:#4a4a52;">${CONTACT}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type FeatureKey = 'puntos' | 'torneos' | 'listas' | 'comunidad' | 'guias' | 'coleccion';

const FEATURES: Record<
  FeatureKey,
  { eyebrow: string; title: string; subject: string; intro: string; bullets: string[]; cta: [string, string] }
> = {
  puntos: {
    eyebrow: 'Catálogo de puntos',
    title: 'Tus puntos, siempre al día',
    subject: 'Los puntos de Warhammer 40K, actualizados cada día',
    intro:
      'Consulta los puntos oficiales de todas las facciones de Warhammer 40K, sincronizados cada día con el Munitorum Field Manual. Cada subida y bajada, señalada.',
    bullets: ['Todas las facciones, unidades y tamaños de escuadra', 'Destacamentos y mejoras con su coste', 'Aviso de cada cambio de puntos'],
    cta: ['/catalogo-puntos', 'Ver los puntos'],
  },
  torneos: {
    eyebrow: 'Competitivo',
    title: 'Encuentra tu próximo torneo',
    subject: 'Torneos de Warhammer 40K cerca de ti',
    intro:
      'Consulta el calendario de torneos de Warhammer 40K en España: bases completas, fechas, plazas disponibles y quién asiste. Apúntate con un clic.',
    bullets: ['Bases y reglamento de cada torneo', 'Plazas en tiempo real y lista de asistentes', 'Las listas con las que se juega'],
    cta: ['/competitivo', 'Ver torneos'],
  },
  listas: {
    eyebrow: 'Listas de ejército',
    title: 'Las listas que marcan el meta',
    subject: 'Descubre las listas que está jugando la comunidad',
    intro:
      'Lee las listas de otros jugadores, explicadas por quien las juega, cópialas en un clic y publica las tuyas con su resultado en torneo.',
    bullets: ['Listas ordenadas y listas para copiar', 'Filtra por facción y por torneo', 'Comenta y guarda tus favoritas'],
    cta: ['/competitivo#listas', 'Ver listas'],
  },
  comunidad: {
    eyebrow: 'Comunidad',
    title: 'Enseña tu ejército',
    subject: 'Comparte tus miniaturas con la comunidad',
    intro: 'Sube fotos de tus miniaturas, descubre ejércitos de otros coleccionistas y conversa con quien comparte tu afición.',
    bullets: ['Fotos, me gusta y comentarios', 'Guarda las publicaciones que te inspiren', 'Amigos y mensajes privados'],
    cta: ['/comunidad', 'Ir a la comunidad'],
  },
  guias: {
    eyebrow: 'Pintura',
    title: 'Aprende a pintar mejor',
    subject: 'Guías de pintura paso a paso para tu ejército',
    intro: 'Guías paso a paso de la comunidad, con las pinturas de cada fase y fotos del proceso. Y si tienes un truco, compártelo.',
    bullets: ['Esquemas de color por facción', 'Pinturas usadas en cada paso', 'Valoraciones de la comunidad'],
    cta: ['/guias', 'Ver guías'],
  },
  coleccion: {
    eyebrow: 'Tu colección',
    title: 'Tu colección, en orden',
    subject: 'Lleva el control de tu colección de Warhammer 40K',
    intro:
      'Registra tus ejércitos y miniaturas, sigue su progreso de la caja al barniz y sabrás en todo momento qué te queda por pintar.',
    bullets: ['Ejércitos, miniaturas y estado de pintura', 'Puntos de tu colección con el catálogo oficial', 'Panel con tu progreso'],
    cta: ['/coleccion', 'Abrir mi colección'],
  },
};

const bulletList = (items: string[]) =>
  panel(
    items
      .map(
        (b, i) =>
          `<div style="padding:12px 0;${i < items.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}font-size:15px;color:${C.white};"><span style="color:${C.gold};">&#9670;</span>&nbsp;&nbsp;${esc(b)}</div>`,
      )
      .join(''),
  );

export type TemplateKey = 'presentacion' | 'destacado' | 'novedades' | 'recordatorio';

export interface TemplateOptions {
  template: TemplateKey;
  feature?: FeatureKey;
  subject?: string;
}

export interface Recipient {
  id: string;
  email: string;
  name: string;
}

export function defaultSubject(o: TemplateOptions): string {
  switch (o.template) {
    case 'presentacion':
      return 'Tu colección, tus listas y tu comunidad de Warhammer 40K, en un solo lugar';
    case 'destacado':
      return FEATURES[o.feature ?? 'puntos'].subject;
    case 'novedades':
      return 'Lo último en Administratum: puntos, torneos y listas';
    case 'recordatorio':
      return 'Te echamos de menos: esto es lo que te has perdido';
  }
}

export function renderEmail(o: TemplateOptions, r: Recipient, digest: Digest): { subject: string; html: string } {
  const subject = o.subject?.trim() || defaultSubject(o);
  const unsubscribe = unsubscribeUrl(r.id);
  const hasNews = digest.points.length + digest.tournaments.length + digest.lists.length + digest.articles.length > 0;
  let eyebrow: string;
  let title: string;
  let body: string;

  if (o.template === 'presentacion') {
    eyebrow = 'Administratum';
    title = 'Todo tu hobby, en un solo lugar';
    body = [
      greeting(r.name),
      p(
        `${strong('Administratum')} reúne todo lo que necesitas para Warhammer 40K: tu colección, los puntos oficiales siempre al día, listas, torneos, guías de pintura y una comunidad con la que compartirlo. Gratis y en español.`,
      ),
      button(SITE, 'Entrar en Administratum'),
      ...(['coleccion', 'puntos', 'listas', 'torneos', 'guias', 'comunidad'] as FeatureKey[]).map((k, i) => {
        const f = FEATURES[k];
        return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
  <tr><td>
    <div style="font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${C.gold};">${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}&nbsp;&nbsp;·&nbsp;&nbsp;${esc(f.eyebrow)}</div>
    <h2 style="margin:8px 0 8px;font-family:${SERIF};font-size:21px;line-height:1.3;font-weight:700;color:${C.white};"><a href="${SITE}${f.cta[0]}" style="color:${C.white};text-decoration:none;">${esc(f.title)}</a></h2>
    <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.text};">${esc(f.intro)}</p>
  </td></tr>
</table>`;
      }),
      button(SITE, 'Empezar ahora'),
      signature('Nos vemos en la mesa de juego,'),
    ].join('\n');
  } else if (o.template === 'destacado') {
    const f = FEATURES[o.feature ?? 'puntos'];
    eyebrow = f.eyebrow;
    title = f.title;
    const extra =
      o.feature === 'torneos'
        ? tournamentsBlock(digest.tournaments)
        : o.feature === 'listas'
          ? listsBlock(digest.lists)
          : o.feature === 'comunidad'
            ? photosBlock(digest.photos)
            : o.feature === 'puntos'
              ? pointsBlock(digest.points.slice(0, 4))
              : '';
    body = [
      greeting(r.name),
      p(esc(f.intro)),
      bulletList(f.bullets),
      extra,
      button(`${SITE}${f.cta[0]}`, f.cta[1]),
      signature('Un saludo,'),
    ].join('\n');
  } else {
    const reminder = o.template === 'recordatorio';
    eyebrow = reminder ? 'Te echamos de menos' : 'Novedades';
    title = reminder ? 'Esto es lo que te has perdido' : 'Lo último en Administratum';
    body = [
      greeting(r.name),
      p(
        reminder
          ? 'Hace unos días que no pasas por Administratum y han pasado cosas: cambios de puntos, torneos nuevos y listas de la comunidad. Aquí tienes un resumen.'
          : 'Este es el resumen de lo último que ha pasado en Administratum.',
      ),
      pointsBlock(digest.points),
      tournamentsBlock(digest.tournaments),
      listsBlock(digest.lists),
      articlesBlock(digest.articles),
      photosBlock(digest.photos),
      hasNews ? '' : p('Entra y descubre lo que la comunidad está compartiendo.'),
      button(SITE, reminder ? 'Volver a Administratum' : 'Ver todas las novedades'),
      signature(reminder ? 'Te esperamos en la mesa de juego,' : 'Un saludo,'),
    ].join('\n');
  }

  return { subject, html: layout({ subject, preheader: title, eyebrow, title, body, unsubscribe }) };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

async function sendBatch(o: TemplateOptions, recipients: Recipient[], digest: Digest) {
  let sent = 0;
  const errors: string[] = [];
  const sentIds: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const payload = chunk.map((r) => {
      const { subject, html } = renderEmail(o, r, digest);
      return {
        from: FROM,
        to: [r.email],
        reply_to: CONTACT,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(r.id)}>, <mailto:${CONTACT}?subject=Baja>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      sent += chunk.length;
      sentIds.push(...chunk.map((r) => r.id));
    } else {
      errors.push(`${res.status} ${(await res.text()).slice(0, 300)}`);
    }
  }
  return { sent, failed: recipients.length - sent, sentIds, error: errors.join(' | ') || null };
}

async function audience(inactiveDays: number | null, cooldownDays: number | null): Promise<Recipient[]> {
  const rows: Row[] = await rest('/rest/v1/rpc/email_audience', {
    method: 'POST',
    body: { p_inactive_days: inactiveDays, p_cooldown_days: cooldownDays },
  });
  return rows.map((r) => ({ id: r.user_id, email: r.email, name: r.display_name ?? '' }));
}

async function logCampaign(entry: Row) {
  await rest('/rest/v1/email_campaigns', { method: 'POST', body: entry, prefer: 'return=minimal' }).catch(() => {});
}

async function runReminders(createdBy: string | null) {
  const [config] = await rest(
    '/rest/v1/app_config?select=reengagement_enabled,reengagement_days,reengagement_cooldown_days&id=eq.global',
  );
  if (!config?.reengagement_enabled && !createdBy) return { skipped: 'Recordatorios desactivados' };
  const days = Number(config?.reengagement_days) || 14;
  const cooldown = Number(config?.reengagement_cooldown_days) || 30;
  const all = await audience(days, cooldown);
  const recipients = all.slice(0, SEND_LIMIT);
  if (recipients.length === 0) return { sent: 0, recipients: 0 };
  const o: TemplateOptions = { template: 'recordatorio' };
  const result = await sendBatch(o, recipients, await loadDigest());
  if (result.sentIds.length) {
    await rest(`/rest/v1/profiles?id=in.(${result.sentIds.join(',')})`, {
      method: 'PATCH',
      body: { last_reminder_at: new Date().toISOString() },
      prefer: 'return=minimal',
    });
  }
  await logCampaign({
    kind: 'automatic',
    template: 'recordatorio',
    subject: defaultSubject(o),
    audience: `Inactivos ≥ ${days} días`,
    recipients: all.length,
    sent: result.sent,
    failed: result.failed,
    error: result.error,
    created_by: createdBy,
  });
  return { sent: result.sent, recipients: all.length, limited: all.length > recipients.length };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function unsubscribePage(ok: boolean) {
  const [heading, text] = ok
    ? ['Te has dado de baja', 'No te enviaremos más correos de novedades ni recordatorios. Puedes volver a activarlos cuando quieras en Ajustes.']
    : ['Enlace no válido', 'No hemos podido procesar la baja con este enlace. Desactiva los correos en Ajustes o escríbenos a hola@administratum.site.'];
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${heading} · Administratum</title></head>
<body style="margin:0;background:#0a0a0b;color:#d4d4d8;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px">
<main style="max-width:420px;text-align:center"><img src="${ASSETS}/logo.png" alt="Administratum" width="220" style="max-width:100%">
<h1 style="color:#fafafa;font-size:24px;margin:28px 0 8px">${heading}</h1><p>${text}</p>
<p><a href="${SITE}" style="color:#d8c08a">Volver a Administratum</a></p></main></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

async function handleUnsubscribe(url: URL, method: string): Promise<Response> {
  const u = url.searchParams.get('u') ?? '';
  const t = url.searchParams.get('t') ?? '';
  const ok = /^[0-9a-f-]{36}$/i.test(u) && verifyUser(u, t);
  if (ok) {
    await rest(`/rest/v1/profiles?id=eq.${u}`, {
      method: 'PATCH',
      body: { email_updates: false },
      prefer: 'return=minimal',
    });
  }
  return method === 'POST' ? new Response(ok ? 'OK' : 'Invalid', { status: ok ? 200 : 400 }) : unsubscribePage(ok);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  if (action === 'unsubscribe') return handleUnsubscribe(url, 'GET');
  if (action === 'cron') {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'No autorizado' }, 401);
    try {
      return json(await runReminders(null));
    } catch (err) {
      return json({ error: (err as Error).message }, 500);
    }
  }
  return json({ error: 'Acción no válida' }, 400);
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get('action') === 'unsubscribe') return handleUnsubscribe(url, 'POST');

  if (!SERVICE_KEY || !process.env.RESEND_API_KEY) {
    return json({ error: 'Faltan SUPABASE_SERVICE_ROLE_KEY o RESEND_API_KEY en Vercel.' }, 500);
  }
  const admin = await adminFromRequest(req);
  if (!admin) return json({ error: 'Solo administradores' }, 403);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    template?: TemplateKey;
    feature?: FeatureKey;
    subject?: string;
    audience?: { type: 'all' | 'inactive'; days?: number };
  };
  const templates: TemplateKey[] = ['presentacion', 'destacado', 'novedades', 'recordatorio'];
  const o: TemplateOptions = {
    template: templates.includes(body.template as TemplateKey) ? (body.template as TemplateKey) : 'novedades',
    feature: body.feature && body.feature in FEATURES ? body.feature : 'puntos',
    subject: body.subject,
  };
  const myName = async () => {
    const [profile] = await rest(`/rest/v1/profiles?select=display_name&id=eq.${admin.id}`);
    return (profile?.display_name as string) ?? '';
  };

  try {
    if (body.action === 'preview') {
      const { subject, html } = renderEmail(o, { ...admin, name: await myName() }, await loadDigest());
      return json({ subject, html });
    }
    if (body.action === 'test') {
      const result = await sendBatch(o, [{ ...admin, name: await myName() }], await loadDigest());
      await logCampaign({
        kind: 'test',
        template: o.template,
        subject: o.subject || defaultSubject(o),
        audience: `Prueba a ${admin.email}`,
        recipients: 1,
        sent: result.sent,
        failed: result.failed,
        error: result.error,
        created_by: admin.id,
      });
      return result.sent ? json({ sent: 1 }) : json({ error: result.error ?? 'No se pudo enviar' }, 502);
    }
    if (body.action === 'send') {
      const inactive = body.audience?.type === 'inactive' ? Math.max(1, Number(body.audience.days) || 14) : null;
      const all = await audience(inactive, null);
      const recipients = all.slice(0, SEND_LIMIT);
      const result = recipients.length
        ? await sendBatch(o, recipients, await loadDigest())
        : { sent: 0, failed: 0, sentIds: [] as string[], error: null };
      await logCampaign({
        kind: 'manual',
        template: o.template === 'destacado' ? `destacado:${o.feature}` : o.template,
        subject: o.subject || defaultSubject(o),
        audience: inactive ? `Inactivos ≥ ${inactive} días` : 'Todos los suscritos',
        recipients: all.length,
        sent: result.sent,
        failed: result.failed,
        error: result.error,
        created_by: admin.id,
      });
      return json({
        sent: result.sent,
        recipients: all.length,
        failed: result.failed,
        limited: all.length > recipients.length,
        error: result.error,
      });
    }
    if (body.action === 'run-reminders') return json(await runReminders(admin.id));
    return json({ error: 'Acción no válida' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
}
