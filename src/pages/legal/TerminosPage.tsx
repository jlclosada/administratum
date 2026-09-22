import { LegalLayout, List, Section } from "./LegalLayout";
import { CONTACT_EMAIL, LAST_UPDATED, OWNER_NAME, SITE_NAME } from "./constants";

export function TerminosPage() {
  return (
    <LegalLayout title="Términos y condiciones de uso" updatedAt={LAST_UPDATED}>
      <Section title="1. Objeto y aceptación">
        <p>
          Estos términos regulan el acceso y uso de {SITE_NAME}, una aplicación web
          gratuita para gestionar colecciones de miniaturas de wargaming, titularidad
          de {OWNER_NAME}. Al crear una cuenta o usar {SITE_NAME} aceptas estos
          términos junto con el{" "}
          <a href="/legal/aviso-legal" className="text-primary hover:underline">
            aviso legal
          </a>
          , la{" "}
          <a href="/legal/privacidad" className="text-primary hover:underline">
            política de privacidad
          </a>{" "}
          y la{" "}
          <a href="/legal/cookies" className="text-primary hover:underline">
            política de cookies
          </a>
          . Si no estás de acuerdo, no debes usar el servicio.
        </p>
      </Section>

      <Section title="2. Registro de cuenta">
        <List>
          <li>
            Para usar {SITE_NAME} necesitas crear una cuenta con un correo
            electrónico válido y una contraseña.
          </li>
          <li>
            Eres responsable de mantener la confidencialidad de tus credenciales y
            de toda actividad realizada desde tu cuenta.
          </li>
          <li>
            {SITE_NAME} no está dirigido a menores de 14 años (ver la{" "}
            <a href="/legal/privacidad" className="text-primary hover:underline">
              política de privacidad
            </a>
            ).
          </li>
          <li>
            Debes proporcionar datos veraces al registrarte y mantenerlos
            actualizados.
          </li>
        </List>
      </Section>

      <Section title="3. Uso permitido">
        <p>Al usar {SITE_NAME} te comprometes a no:</p>
        <List>
          <li>
            Subir contenido ilegal, difamatorio, que infrinja derechos de propiedad
            intelectual de terceros, o que resulte ofensivo, violento o
            discriminatorio.
          </li>
          <li>
            Suplantar la identidad de otra persona o usar {SITE_NAME} para acosar,
            spamear o engañar a otras personas usuarias.
          </li>
          <li>
            Intentar acceder sin autorización a cuentas de otras personas, a datos
            que no te pertenecen, o vulnerar las medidas de seguridad del servicio.
          </li>
          <li>
            Utilizar herramientas automatizadas para extraer datos de forma masiva
            (scraping) o sobrecargar la infraestructura del servicio.
          </li>
        </List>
        <p>
          El incumplimiento de estas condiciones puede dar lugar a la suspensión o
          eliminación de la cuenta.
        </p>
      </Section>

      <Section title="4. Contenido generado por las personas usuarias">
        <p>
          Conservas la propiedad de todo el contenido que introduces en {SITE_NAME}
          (colección, imágenes, notas, guías de pintura). Al introducirlo, concedes
          al titular una licencia no exclusiva, mundial y gratuita para almacenarlo,
          mostrarlo y procesarlo únicamente con el fin de prestarte el servicio y,
          cuando decidas publicarlo (por ejemplo, una guía de pintura), mostrarlo a
          otras personas usuarias o visitantes.
        </p>
        <p>
          Eres el único responsable del contenido que publicas y de contar con los
          derechos necesarios sobre él (por ejemplo, sobre fotografías que subas). El
          titular podrá retirar contenido que incumpla estos términos o la
          legislación aplicable.
        </p>
        <p>
          Las guías de pintura se publican como visibles para cualquier visitante
          por defecto al crearlas. Puedes cambiar su visibilidad o eliminarlas en
          cualquier momento desde la propia aplicación.
        </p>
      </Section>

      <Section title="5. Disponibilidad del servicio">
        <p>
          {SITE_NAME} es un proyecto personal gratuito, ofrecido "tal cual" (as is),
          sin garantía de disponibilidad continua, ausencia de errores, o
          idoneidad para un propósito concreto. El titular podrá modificar,
          suspender o interrumpir el servicio, total o parcialmente, en cualquier
          momento, procurando avisar con antelación razonable cuando sea posible a
          través de la propia aplicación.
        </p>
      </Section>

      <Section title="6. Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, el titular no será responsable de
          pérdidas de datos, lucro cesante o daños indirectos derivados del uso o la
          imposibilidad de uso de {SITE_NAME}. Se recomienda conservar copias
          propias de la información especialmente importante (por ejemplo,
          exportando o fotografiando tus listas de ejército).
        </p>
      </Section>

      <Section title="7. Cancelación de cuenta">
        <p>
          Puedes eliminar tu cuenta en cualquier momento desde los ajustes de la
          aplicación; esto borra tu colección, tus archivos y tus datos de cuenta
          conforme a lo descrito en la{" "}
          <a href="/legal/privacidad" className="text-primary hover:underline">
            política de privacidad
          </a>
          . El titular podrá suspender o eliminar cuentas que incumplan gravemente
          estos términos, notificándolo cuando sea razonablemente posible.
        </p>
      </Section>

      <Section title="8. Modificación de estos términos">
        <p>
          Estos términos pueden actualizarse para reflejar cambios en el servicio o
          en la normativa aplicable. Los cambios relevantes se indicarán en esta
          misma página junto con la fecha de la última actualización. El uso
          continuado de {SITE_NAME} tras una modificación implica la aceptación de
          los nuevos términos.
        </p>
      </Section>

      <Section title="9. Legislación aplicable">
        <p>
          Estos términos se rigen por la legislación española. Para cualquier
          controversia, y sin perjuicio de los fueros que correspondan por normativa
          de protección de consumidores y usuarios, serán competentes los juzgados y
          tribunales que determine la ley aplicable.
        </p>
      </Section>

      <Section title="10. Contacto">
        <p>
          Para cualquier duda sobre estos términos, escribe a {CONTACT_EMAIL}.
        </p>
      </Section>
    </LegalLayout>
  );
}
