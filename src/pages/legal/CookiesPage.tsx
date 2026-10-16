import { CONSENT_NEEDED, HAS_ANALYTICS, HAS_MARKETING, openConsentSettings } from "@/lib/consent";
import { Callout, LegalLayout, List, Section } from "./LegalLayout";
import { LAST_UPDATED, SITE_NAME } from "./constants";

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updatedAt={LAST_UPDATED}>
      <Callout>
        {CONSENT_NEEDED ? (
          <>
            {SITE_NAME} usa almacenamiento técnico necesario y, solo si lo aceptas,
            cookies de terceros para medir visitas y mostrar anuncios.{" "}
            <button
              type="button"
              onClick={openConsentSettings}
              className="font-medium text-primary hover:underline"
            >
              Configurar cookies
            </button>
          </>
        ) : (
          <>
            {SITE_NAME} <strong className="text-foreground">no utiliza cookies de
            analítica, publicidad ni de seguimiento de terceros</strong>. Esta página
            describe el almacenamiento técnico estrictamente necesario para que la
            aplicación funcione.
          </>
        )}
      </Callout>

      <Section title="1. Almacenamiento técnico necesario">
        <p>
          Para mantener tu sesión iniciada, {SITE_NAME} utiliza el almacenamiento
          local de tu navegador (localStorage), gestionado por Supabase Auth. No son
          cookies en sentido estricto, pero cumplen una función equivalente:
          recuerdan que has iniciado sesión para que no tengas que volver a
          introducir tus credenciales en cada visita. También se guardan ahí
          preferencias como la última ubicación usada en el buscador de partidas y,
          si aparece, tu elección en el aviso de cookies.
        </p>
        <p>
          Este almacenamiento es estrictamente necesario para el funcionamiento del
          servicio (artículo 22.2 de la LSSI-CE) y, por tanto, no requiere tu
          consentimiento previo.
        </p>
        <List>
          <li>Finalidad: mantener la sesión iniciada y recordar tus preferencias.</li>
          <li>Titular: {SITE_NAME} (a través de Supabase).</li>
          <li>
            Duración: hasta que cierres sesión manualmente o borres los datos del
            navegador (la elección de cookies, como máximo un año).
          </li>
        </List>
      </Section>

      <Section title="2. Medición de visitas sin cookies">
        <p>
          {SITE_NAME} cuenta las visitas con Vercel Web Analytics, que{" "}
          <strong className="text-foreground">no instala cookies</strong> ni guarda
          datos que te identifiquen: solo registra de forma agregada qué páginas se
          visitan, el país y el tipo de dispositivo. Por eso no necesita tu
          consentimiento.
        </p>
      </Section>

      <Section title="3. Cookies de terceros (solo con tu consentimiento)">
        {CONSENT_NEEDED ? (
          <>
            <p>
              Estas cookies no se instalan hasta que las aceptas en el aviso de
              cookies. Rechazarlas no afecta al uso de {SITE_NAME}.
            </p>
            <List>
              {HAS_ANALYTICS && (
                <li>
                  <strong className="text-foreground">Google Analytics</strong>{" "}
                  (Google Ireland Ltd.) — analítica: qué páginas se visitan y desde
                  dónde llegan las visitas. Cookies <code>_ga</code> y{" "}
                  <code>_ga_*</code>, duración hasta 2 años.
                </li>
              )}
              {HAS_MARKETING && (
                <li>
                  <strong className="text-foreground">Píxel de Meta</strong> (Meta
                  Platforms Ireland Ltd.) — publicidad: medir y mostrar anuncios de{" "}
                  {SITE_NAME} en Facebook e Instagram. Cookie <code>_fbp</code>,
                  duración 3 meses.
                </li>
              )}
            </List>
            <p>
              Puedes cambiar o retirar tu consentimiento en cualquier momento desde{" "}
              <button
                type="button"
                onClick={openConsentSettings}
                className="text-primary hover:underline"
              >
                Configurar cookies
              </button>{" "}
              (también al pie de cada página).
            </p>
          </>
        ) : (
          <p>
            Ahora mismo {SITE_NAME} no carga scripts de analítica, publicidad ni redes
            sociales de terceros. Si en el futuro se incorporan, se detallarán aquí y
            no se activarán sin tu consentimiento previo. Las tipografías se sirven
            desde el propio dominio, sin conexiones a servidores como Google Fonts.
          </p>
        )}
      </Section>

      <Section title="4. Cómo eliminar este almacenamiento">
        <p>
          Puedes cerrar sesión desde el menú de tu cuenta, o borrar manualmente los
          datos de navegación (cookies y datos de sitios) de tu navegador para este
          sitio. Ten en cuenta que, al hacerlo, se cerrará tu sesión y tendrás que
          volver a iniciarla.
        </p>
      </Section>

      <Section title="5. Cambios en esta política">
        <p>
          Si {SITE_NAME} incorpora nuevas cookies, esta página se actualizará y,
          cuando corresponda, se volverá a solicitar tu consentimiento.
        </p>
      </Section>
    </LegalLayout>
  );
}
