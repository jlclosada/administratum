# Correos de marketing

`presentacion.html` presenta Administratum y sus funciones. Se genera con
`npm run email:build` a partir de `scripts/email/promo.mjs`; edita ese archivo,
no el HTML.

## Antes de enviar

En España (LSSI, art. 21), un correo comercial solo se puede enviar a quien
lo ha pedido o aceptado expresamente, o a quien ya tiene relación contigo y no
se ha opuesto. No compres listas ni escribas a direcciones sacadas de
internet. Cada correo debe identificar al remitente y ofrecer una forma
sencilla de darse de baja; la plantilla ya lo incluye.

## Enviar con Resend (Broadcasts)

1. Resend → **Audiences**: crea una audiencia e importa los contactos
   (CSV con `email` y, opcional, `first_name`).
2. Resend → **Broadcasts → Create**: remitente `Administratum <hola@administratum.site>`,
   asunto «Tu colección, tus listas y tu comunidad, en un solo lugar».
3. Cambia el editor a HTML y pega el contenido de `presentacion.html`.
4. Envíate una prueba a ti mismo antes de mandarlo a la audiencia.

Resend rellena `{{{FIRST_NAME|hobbyista}}}` con el nombre del contacto (o
«hobbyista» si no lo tiene) y `{{{RESEND_UNSUBSCRIBE_URL}}}` con el enlace de
baja. Si usas otra herramienta, sustituye esos dos marcadores por los suyos.
