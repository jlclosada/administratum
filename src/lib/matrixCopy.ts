/**
 * Copy of the pairing matrix tool (/competitivo/matrices), written for
 * people searching "matriz warhammer 40k", "matrices WTC" or "emparejamientos
 * por equipos". api/render.ts keeps an identical copy (a test checks both).
 */

export const MATRIX_COPY = {
  title: "Matrices de emparejamientos de Warhammer 40K para torneos por equipos (WTC)",
  description:
    "Haz la matriz de emparejamientos de tu equipo de Warhammer 40K desde el móvil: puntúa cada cruce del 1 al 5 y obtén el defensor, los atacantes, las listas peligrosas y el emparejamiento ideal. Gratis, para 4vs4, 5vs5, 6vs6 y 8vs8 (WTC/ETC).",
  lead:
    "La matriz es la herramienta con la que los equipos de Warhammer 40.000 preparan los emparejamientos de un torneo por equipos: cada jugador puntúa del 1 al 5 cómo le va contra cada lista rival y, con esa tabla, el capitán decide quién defiende, a quién manda como atacante y qué cruces evitar.",
  howItWorks: [
    "Cada equipo presenta en secreto un defensor.",
    "El rival le ofrece dos atacantes y el equipo del defensor elige contra cuál juega; el atacante rechazado vuelve a la reserva.",
    "Se repite hasta completar todas las mesas, así que conviene saber de antemano qué cruces te favorecen y cuáles te hunden.",
  ],
  scale: [
    ["5", "Muy favorable: deberías ganar con claridad."],
    ["4", "Favorable: partida a tu favor."],
    ["3", "Igualado: depende de la misión y del día."],
    ["2", "Desfavorable: vas a sufrir."],
    ["1", "Muy desfavorable: cruce a evitar."],
  ] as [string, string][],
  steps: [
    "Elige el formato (4vs4, 5vs5, 6vs6 u 8vs8) y escribe el nombre y el ejército de cada jugador de los dos equipos.",
    "Puntúa del 1 al 5 cada cruce: jugador a jugador, con botones grandes pensados para el móvil.",
    "Revisa el resumen: defensor recomendado, atacantes contra su defensor más probable, listas peligrosas, bazas y el emparejamiento ideal.",
    "Comparte la matriz con tu equipo por WhatsApp o Discord con un enlace y, después de jugar, guarda el resultado de cada mesa para ver si la matriz acertó.",
  ],
  faq: [
    [
      "¿Qué es una matriz en Warhammer 40K?",
      "Es una tabla en la que cada jugador de tu equipo puntúa sus posibilidades contra cada lista del equipo rival. Se usa en torneos por equipos como el WTC o el ETC para preparar los emparejamientos.",
    ],
    [
      "¿Cómo se elige el defensor?",
      "El rival te ofrecerá sus dos peores cruces para tu defensor, y tú eliges uno, así que te quedas con el segundo peor. El mejor defensor es el jugador cuyo segundo peor cruce es más alto: el más difícil de castigar.",
    ],
    [
      "¿Qué atacantes mando contra su defensor?",
      "Los dos jugadores con mejor puntuación contra esa lista. El rival rechazará al mejor, así que importa que el segundo también sea bueno.",
    ],
    [
      "¿Sirve para 4vs4, 5vs5, 6vs6 y 8vs8?",
      "Sí. Puedes hacer matrices de 3, 4, 5, 6 y 8 jugadores, el formato del WTC.",
    ],
    [
      "¿Necesito cuenta para usarla?",
      "Puedes hacer una matriz sin cuenta, pero no se guarda. Con una cuenta gratuita guardas todas tus matrices y los resultados de cada partida, y ves si la matriz acertó.",
    ],
    [
      "¿Por qué del 1 al 5?",
      "Es una escala rápida de rellenar en el móvil durante un torneo y suficiente para tomar decisiones: 5 es un cruce muy favorable y 1 uno muy desfavorable.",
    ],
  ] as [string, string][],
};
