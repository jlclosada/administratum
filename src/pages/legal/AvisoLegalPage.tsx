import { LegalLayout, List, Section } from "./LegalLayout";
import { CONTACT_EMAIL, LAST_UPDATED, OWNER_NAME, SITE_DOMAIN, SITE_NAME } from "./constants";

export function AvisoLegalPage() {
  return (
    <LegalLayout title="Aviso legal" updatedAt={LAST_UPDATED}>
      <Section title="1. Datos identificativos">
        <p>
          En cumplimiento del deber de información recogido en el artículo 10 de la
          Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información
          y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos:
        </p>
        <List>
          <li>Titular: {OWNER_NAME}</li>
          <li>
            Naturaleza: persona física, proyecto personal sin actividad económica
            registrada (no se presta a través de {SITE_NAME} ningún servicio de pago
            ni se realiza actividad comercial)
          </li>
          <li>Correo de contacto: {CONTACT_EMAIL}</li>
          <li>Sitio web: {SITE_DOMAIN}</li>
        </List>
        <p>
          Al tratarse de un proyecto personal sin actividad económica, no resultan
          de aplicación las obligaciones de identificación mercantil (NIF, domicilio
          social, datos de inscripción registral) exigibles a quienes prestan
          servicios de la sociedad de la información con carácter comercial. Aun
          así, se facilitan los datos anteriores para que cualquier persona usuaria
          pueda identificar al responsable del sitio y ponerse en contacto con él.
        </p>
      </Section>

      <Section title="2. Objeto">
        <p>
          {SITE_NAME} es una aplicación web gratuita para gestionar colecciones de
          miniaturas de wargaming: organizar juegos, ejércitos y miniaturas, registrar
          el proceso de pintado, guardar listas de ejército y compartir guías de
          pintura con la comunidad.
        </p>
        <p>
          El acceso y uso de {SITE_NAME} atribuye la condición de persona usuaria y
          supone la aceptación de este aviso legal, de la{" "}
          <a href="/legal/privacidad" className="text-primary hover:underline">
            política de privacidad
          </a>
          , de la{" "}
          <a href="/legal/cookies" className="text-primary hover:underline">
            política de cookies
          </a>{" "}
          y de los{" "}
          <a href="/legal/terminos" className="text-primary hover:underline">
            términos y condiciones de uso
          </a>{" "}
          vigentes en cada momento.
        </p>
      </Section>

      <Section title="3. Condiciones de acceso y uso">
        <p>
          El acceso a {SITE_NAME} es gratuito. Algunas funcionalidades requieren
          registrarse con una cuenta (correo electrónico y contraseña). El uso de la
          aplicación debe realizarse conforme a la ley, la buena fe, el orden público
          y los presentes términos. Queda prohibido usar {SITE_NAME} con fines
          ilícitos, lesivos de derechos e intereses de terceros, o que de cualquier
          forma puedan dañar, inutilizar o sobrecargar el servicio.
        </p>
      </Section>

      <Section title="4. Propiedad intelectual e industrial">
        <p>
          El código fuente, el diseño gráfico, los logotipos, la marca "Administratum"
          y demás elementos de la aplicación son propiedad de {OWNER_NAME} o se usan
          con la debida autorización, y están protegidos por la normativa de
          propiedad intelectual e industrial. Queda prohibida su reproducción,
          distribución o modificación sin autorización expresa, salvo en los términos
          en que el código del proyecto esté publicado bajo una licencia de software
          libre en su repositorio público.
        </p>
        <p>
          El contenido que cada persona usuaria introduce (nombres de ejércitos,
          notas, fotografías, guías de pintura, etc.) es de su propiedad. Al
          publicarlo en {SITE_NAME} concede al titular una licencia para almacenarlo
          y mostrarlo dentro de la aplicación en los términos descritos en los{" "}
          <a href="/legal/terminos" className="text-primary hover:underline">
            términos y condiciones de uso
          </a>
          .
        </p>
      </Section>

      <Section title="5. Responsabilidad">
        <p>
          {SITE_NAME} es un proyecto personal, mantenido fuera de un horario
          comercial regular. No se garantiza la disponibilidad continua o ininterrumpida
          del servicio, ni la ausencia de errores. El titular no se hace responsable
          de los daños derivados de la falta de disponibilidad o de fallos en el
          acceso, sin perjuicio de que se pondrá diligencia razonable en
          solucionarlos.
        </p>
        <p>
          {SITE_NAME} puede mostrar contenido generado por otras personas usuarias
          (guías de pintura, artículos) o enlaces a sitios de terceros. El titular no
          controla ni se responsabiliza del contenido publicado por terceros ni del
          contenido de esos sitios externos.
        </p>
      </Section>

      <Section title="6. Legislación aplicable">
        <p>
          Este aviso legal se rige por la legislación española. Para cualquier
          controversia derivada del acceso o uso de {SITE_NAME}, y sin perjuicio de
          los fueros que pudieran corresponder por normativa de protección de
          consumidores y usuarios, serán competentes los juzgados y tribunales que
          determine la ley aplicable.
        </p>
      </Section>
    </LegalLayout>
  );
}
