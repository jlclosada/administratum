import { Callout, LegalLayout, List, Section } from "./LegalLayout";
import { LAST_UPDATED, SITE_NAME } from "./constants";

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updatedAt={LAST_UPDATED}>
      <Callout>
        {SITE_NAME} <strong className="text-foreground">no utiliza cookies de
        analítica, publicidad ni de seguimiento de terceros</strong>. Esta página
        describe el almacenamiento técnico estrictamente necesario para que la
        aplicación funcione.
      </Callout>

      <Section title="1. Almacenamiento técnico necesario">
        <p>
          Para mantener tu sesión iniciada, {SITE_NAME} utiliza el almacenamiento
          local de tu navegador (localStorage), gestionado por Supabase Auth. No son
          cookies en sentido estricto, pero cumplen una función equivalente:
          recuerdan que has iniciado sesión para que no tengas que volver a
          introducir tus credenciales en cada visita.
        </p>
        <p>
          Este almacenamiento es estrictamente necesario para el funcionamiento del
          servicio (artículo 22.2 de la LSSI-CE) y, por tanto, no requiere tu
          consentimiento previo.
        </p>
        <List>
          <li>Finalidad: mantener la sesión iniciada.</li>
          <li>Titular: {SITE_NAME} (a través de Supabase).</li>
          <li>
            Duración: hasta que cierres sesión manualmente o borres los datos del
            navegador.
          </li>
        </List>
      </Section>

      <Section title="2. Recursos de terceros">
        <p>
          La aplicación carga las tipografías de la interfaz desde los servidores de
          Google Fonts. Esto implica una conexión a servidores de Google al cargar
          la página, que recibe tu dirección IP como parte de esa petición técnica.
          Google Fonts no instala cookies de seguimiento a través de este uso.
        </p>
      </Section>

      <Section title="3. Cómo eliminar este almacenamiento">
        <p>
          Puedes cerrar sesión desde el menú de tu cuenta, o borrar manualmente los
          datos de navegación (cookies y datos de sitios) de tu navegador para este
          sitio. Ten en cuenta que, al hacerlo, se cerrará tu sesión y tendrás que
          volver a iniciarla.
        </p>
      </Section>

      <Section title="4. Cambios en esta política">
        <p>
          Si en el futuro {SITE_NAME} incorpora cookies de analítica o de terceros,
          esta página se actualizará y, cuando corresponda, se solicitará tu
          consentimiento antes de instalarlas.
        </p>
      </Section>
    </LegalLayout>
  );
}
