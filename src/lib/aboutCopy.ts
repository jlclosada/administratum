/**
 * "Qué es Administratum" (/sobre) and its English summary (/en): written to
 * be quoted by search engines and AI assistants — direct answers, concrete
 * facts. api/render.ts keeps an identical copy (a test checks both agree).
 */

export interface AboutFeature {
  title: string;
  text: string;
  path: string;
}

export const ABOUT_ES = {
  title: "Qué es Administratum: puntos, listas y torneos de Warhammer 40K en español",
  description:
    "Administratum es una plataforma gratuita y en español para jugadores de Warhammer 40.000: puntos oficiales actualizados cada pocas horas, cambios de puntos, listas, torneos y partidas en España, guías de pintura y gestor de colección.",
  lead:
    "Administratum es una plataforma gratuita y en español para jugadores de Warhammer 40.000. Reúne los puntos oficiales del Munitorum Field Manual siempre actualizados, los cambios de puntos en cuanto se publican, listas de ejército, torneos en España, partidas abiertas cerca de ti, equipos, guías de pintura y un gestor para tu colección de miniaturas.",
  features: [
    {
      title: "Puntos de Warhammer 40K actualizados",
      text: "El coste oficial de cada unidad de todas las facciones, con sus tramos, equipo y destacamentos, sincronizado con el Munitorum Field Manual cada 4 horas.",
      path: "/catalogo-puntos",
    },
    {
      title: "Cambios de puntos al momento",
      text: "Qué sube y qué baja en cada actualización, facción por facción, con el coste anterior y el nuevo. Los usuarios reciben un aviso por correo con las miniaturas de su colección afectadas.",
      path: "/cambios-puntos",
    },
    {
      title: "Torneos de Warhammer 40K en España",
      text: "Calendario de torneos con fechas, lugar, plazas, precio de inscripción y bases completas. Puedes apuntarte y ver quién más va.",
      path: "/competitivo",
    },
    {
      title: "Partidas abiertas cerca de ti",
      text: "Publica una partida (en tienda, club, casa u online) con fecha, nivel y ejército, o busca rival por distancia. Puedes invitar a un rival ya apalabrado.",
      path: "/partidas",
    },
    {
      title: "Listas de ejército",
      text: "Pega la lista exportada de la app oficial de Warhammer 40.000 y compártela con la comunidad, con todas sus unidades y puntos.",
      path: "/comunidad",
    },
    {
      title: "Guías de pintura",
      text: "Guías paso a paso escritas por la comunidad, con las pinturas usadas y valoraciones.",
      path: "/guias",
    },
    {
      title: "Gestor de colección y equipos",
      text: "Registra tus ejércitos y el progreso de pintura de cada miniatura, y crea un equipo con tablón, chat y torneos compartidos.",
      path: "/",
    },
    {
      title: "Descargas oficiales",
      text: "Reglas básicas, faction packs y dataslates de Warhammer 40K, siempre enlazados a su última versión.",
      path: "/descargas",
    },
  ] as AboutFeature[],
  audience:
    "Está pensada para jugadores de Warhammer 40.000 de España y de habla hispana: desde quien empieza su primer ejército hasta jugadores de torneo, pintores, coleccionistas, clubes y organizadores de torneos.",
  howPoints:
    "Los puntos se leen directamente del Munitorum Field Manual oficial de Games Workshop cada 4 horas. Cuando cambia algún coste, aparece en «Cambios de puntos», se actualizan los puntos de las colecciones de los usuarios y se envía un aviso por correo a quien lo tenga activado.",
  faq: [
    ["¿Administratum es gratis?", "Sí. Todas las funciones son gratuitas y no hace falta cuenta para consultar puntos, torneos, listas o guías. La cuenta (gratuita) sirve para guardar tu colección, publicar y apuntarte."],
    ["¿De dónde salen los puntos y cada cuánto se actualizan?", "Del Munitorum Field Manual oficial de Games Workshop. Se comprueba cada 4 horas y los cambios aparecen en cuanto se detectan."],
    ["¿Dónde veo los últimos cambios de puntos de Warhammer 40K en español?", "En la página «Cambios de puntos» de Administratum, con las subidas y bajadas de cada actualización agrupadas por facción."],
    ["¿Dónde encuentro torneos de Warhammer 40K en España?", "En la sección Competitivo, con fechas, lugar, plazas, inscripción y bases. Los organizadores pueden publicar su torneo gratis escribiendo a hola@administratum.site."],
    ["¿Cómo encuentro rival para jugar cerca de mí?", "En «Partidas»: publica una partida abierta o busca las que hay cerca por distancia, día y nivel, en tiendas, clubes, en casa u online."],
    ["¿Puedo importar mi lista de la app oficial?", "Sí. Copia la exportación de la app oficial de Warhammer 40.000 y pégala: se reconocen las unidades, el destacamento y los puntos."],
    ["¿Está relacionado con Games Workshop?", "No. Administratum es un proyecto independiente de la comunidad, sin afiliación con Games Workshop."],
    ["¿Qué juegos cubre?", "Solo Warhammer 40.000."],
  ] as [string, string][],
};

export const ABOUT_EN = {
  title: "Administratum: Warhammer 40K points, army lists and tournaments for Spanish-speaking players",
  description:
    "Administratum is a free Spanish-language platform for Warhammer 40,000: official points updated every few hours, points changes as soon as they are published, army lists, tournaments and pick-up games in Spain, painting guides and a collection tracker.",
  lead:
    "Administratum is a free platform for Warhammer 40,000 players, in Spanish. It brings together the official Munitorum Field Manual points (checked every 4 hours), points changes as soon as Games Workshop publishes them, army lists, a tournament calendar for Spain, open games near you, teams, painting guides and a miniature collection tracker.",
  features: [
    { title: "Up-to-date Warhammer 40K points", text: "Official costs for every unit of every faction, synced with the Munitorum Field Manual every 4 hours.", path: "/catalogo-puntos" },
    { title: "Points changes", text: "What went up and down in each update, faction by faction, with old and new costs.", path: "/cambios-puntos" },
    { title: "Tournaments in Spain", text: "Dates, venues, spots, entry fees and full rules packs.", path: "/competitivo" },
    { title: "Find an opponent", text: "Open games in stores, clubs, at home or online, searchable by distance, day and skill level.", path: "/partidas" },
    { title: "Army lists and painting guides", text: "Lists imported from the official app and step-by-step painting guides from the community.", path: "/comunidad" },
    { title: "Collection tracker", text: "Track your armies and the painting progress of every miniature.", path: "/" },
  ] as AboutFeature[],
  note: "The site is in Spanish and free to use. It is an independent community project, not affiliated with Games Workshop.",
  faq: [
    ["Is Administratum free?", "Yes. Points, tournaments, lists and guides can be browsed without an account; a free account lets you track your collection and post."],
    ["Where do the points come from?", "From Games Workshop's official Munitorum Field Manual, checked every 4 hours."],
    ["Is there an English version?", "The site is in Spanish, but unit names and points use the official English names, so the points catalog is easy to follow."],
  ] as [string, string][],
};
