import { Callout, LegalLayout, List, Section, SubHeading } from "./LegalLayout";
import { CONTACT_EMAIL, LAST_UPDATED, OWNER_NAME, SITE_NAME } from "./constants";

export function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" updatedAt={LAST_UPDATED}>
      <Section title="1. Responsable del tratamiento">
        <List>
          <li>Responsable: {OWNER_NAME}</li>
          <li>Contacto: {CONTACT_EMAIL}</li>
        </List>
        <p>
          Esta política se ajusta al Reglamento (UE) 2016/679 (RGPD) y a la Ley
          Orgánica 3/2018, de Protección de Datos Personales y garantía de los
          derechos digitales (LOPDGDD).
        </p>
      </Section>

      <Section title="2. Qué datos se recogen">
        <SubHeading>Al crear una cuenta</SubHeading>
        <p>
          Correo electrónico, contraseña y, si se indica, un nombre para mostrar. La
          contraseña la gestiona directamente Supabase Auth: nunca se almacena en
          texto plano ni es accesible por el titular del sitio.
        </p>
        <SubHeading>Contenido que introduces voluntariamente</SubHeading>
        <p>
          Todo lo que registras dentro de tu colección: juegos, ejércitos,
          miniaturas y su cantidad, notas, precio y tienda de compra (si lo indicas),
          procesos de pintado, colores usados, imágenes que subas, listas de
          ejército y, si las publicas, guías de pintura y valoraciones a guías de
          otras personas.
        </p>
        <SubHeading>Datos técnicos</SubHeading>
        <p>
          Al usar la aplicación se procesan automáticamente datos técnicos básicos
          (dirección IP, tipo de navegador) a través de los proveedores descritos en
          la sección 5, necesarios para prestar el servicio, servir la aplicación y
          diagnosticar errores.
        </p>
      </Section>

      <Section title="3. Con qué finalidad y base legal">
        <List>
          <li>
            <strong className="text-foreground">Prestar el servicio</strong> (crear
            tu cuenta, guardar y mostrarte tu colección, mantener tu sesión iniciada)
            — base legal: ejecución de un contrato (art. 6.1.b RGPD), ya que es
            necesario para el propio funcionamiento de {SITE_NAME}.
          </li>
          <li>
            <strong className="text-foreground">
              Publicar guías de pintura o participar en la comunidad
            </strong>{" "}
            — base legal: consentimiento (art. 6.1.a RGPD). Publicar una guía es una
            acción voluntaria; puedes despublicarla o eliminarla en cualquier
            momento.
          </li>
          <li>
            <strong className="text-foreground">
              Diagnosticar errores y mantener la seguridad del servicio
            </strong>{" "}
            — base legal: interés legítimo (art. 6.1.f RGPD) en mantener la
            aplicación funcionando correctamente.
          </li>
        </List>
      </Section>

      <Section title="4. Contenido privado y contenido público">
        <Callout>
          Tu colección personal (juegos, ejércitos, miniaturas, listas, notas) es{" "}
          <strong className="text-foreground">privada</strong>: solo tú puedes verla
          y modificarla, protegida mediante políticas de seguridad a nivel de fila
          (Row Level Security) en la base de datos. Las{" "}
          <strong className="text-foreground">guías de pintura se publican por
          defecto</strong> al crearlas, y en ese caso son visibles para cualquier
          visitante de {SITE_NAME}, incluso sin haber iniciado sesión, junto con el
          nombre que hayas indicado para mostrar. Revisa el estado de publicación de
          tus guías si quieres mantenerlas privadas.
        </Callout>
        <p>
          Las imágenes que subes (fotos de miniaturas, procesos de pintado) se
          almacenan en un espacio de archivos cuya URL, si se conoce, es accesible
          sin necesidad de iniciar sesión — no están listadas ni indexadas
          públicamente en ningún buscador ni sección pública de {SITE_NAME}, pero
          técnicamente no equivalen a un almacenamiento privado en sentido estricto.
          No subas imágenes que contengan información sensible que no quieras que
          pueda llegar a ser accesible por ese medio.
        </p>
      </Section>

      <Section title="5. Con quién se comparten los datos">
        <p>
          {SITE_NAME} utiliza los siguientes proveedores (encargados del
          tratamiento) para funcionar:
        </p>
        <List>
          <li>
            <strong className="text-foreground">Supabase</strong> (base de datos,
            autenticación y almacenamiento de archivos). El proyecto está alojado en
            la región "West EU (Londres, Reino Unido)". El Reino Unido cuenta con
            una decisión de adecuación de la Comisión Europea, por lo que la
            transferencia de datos a esa región está amparada sin necesidad de
            garantías adicionales.
          </li>
          <li>
            <strong className="text-foreground">Vercel Inc.</strong> (alojamiento
            del sitio web). Empresa con sede en Estados Unidos; cualquier
            transferencia internacional de datos derivada de su uso está amparada
            por cláusulas contractuales tipo aprobadas por la Comisión Europea.
          </li>
          <li>
            <strong className="text-foreground">Sentry</strong> (monitorización de
            errores técnicos). Cuando está activo, recibe tu identificador de cuenta
            y correo electrónico (para poder asociar un error a una persona
            usuaria), junto con datos técnicos del error (mensaje, traza, navegador).
            Los datos se procesan en la región UE (Frankfurt, Alemania).
          </li>
          <li>
            <strong className="text-foreground">Google Fonts</strong> (tipografías
            de la interfaz). Se cargan desde servidores de Google, lo que implica el
            envío de tu dirección IP a Google en el momento de cargar la página.
          </li>
        </List>
        <p>
          Ningún dato se vende ni se cede a terceros con fines publicitarios.{" "}
          {SITE_NAME} no utiliza herramientas de analítica ni de publicidad.
        </p>
      </Section>

      <Section title="6. Plazo de conservación">
        <p>
          Tus datos se conservan mientras mantengas tu cuenta activa. Si eliminas tu
          cuenta desde los ajustes de la aplicación, se eliminan tus archivos
          subidos y, en cascada, todos los registros de tu colección asociados a esa
          cuenta. Al ser un borrado en el que intervienen varios sistemas
          (almacenamiento de archivos y base de datos), el borrado de archivos se
          realiza con la mejor diligencia posible; si algún archivo no llegara a
          eliminarse por un fallo puntual, puedes solicitar su borrado manual
          escribiendo a {CONTACT_EMAIL}.
        </p>
      </Section>

      <Section title="7. Tus derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de acceso, rectificación,
          supresión, oposición, limitación del tratamiento y portabilidad de tus
          datos. La mayoría de estas acciones puedes realizarlas tú mismo/a desde los
          ajustes de tu cuenta (editar tu nombre, tu correo, tu contraseña, o
          eliminar la cuenta). Para cualquier otra solicitud, escribe a{" "}
          {CONTACT_EMAIL} indicando el derecho que quieres ejercer.
        </p>
        <p>
          Si consideras que el tratamiento de tus datos no se ajusta a la normativa,
          tienes derecho a presentar una reclamación ante la Agencia Española de
          Protección de Datos (
          <a
            href="https://www.aepd.es"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            www.aepd.es
          </a>
          ).
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          El acceso a tus datos está protegido mediante autenticación y políticas de
          seguridad a nivel de fila en la base de datos, que garantizan que cada
          persona usuaria solo puede leer y modificar su propia información. Las
          contraseñas se gestionan de forma segura por Supabase Auth y nunca son
          accesibles en texto plano por el titular del sitio.
        </p>
      </Section>

      <Section title="9. Menores de edad">
        <p>
          {SITE_NAME} no está dirigido a menores de 14 años. Si eres menor de esa
          edad, no debes crear una cuenta ni facilitar tus datos personales sin el
          consentimiento de tu madre, padre o tutor legal.
        </p>
      </Section>

      <Section title="10. Cambios en esta política">
        <p>
          Esta política puede actualizarse para reflejar cambios en el servicio o en
          la normativa aplicable. Los cambios relevantes se indicarán en esta misma
          página junto con la fecha de la última actualización.
        </p>
      </Section>
    </LegalLayout>
  );
}
