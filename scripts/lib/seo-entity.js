// Fuente única de la identidad (persona + marca) para JSON-LD.
// La usan update-seo-sitemap.js (portada) y prerender-sobre-mi.js (/sobre-mi).
// Si cambias un perfil social, cámbialo SOLO aquí.

export const SITE = 'https://www.capacero3d.com';
export const PERSON_ID = `${SITE}/#person`;
export const ORG_ID = `${SITE}/#organization`;
export const ABOUT_URL = `${SITE}/sobre-mi`;

export const PROFILES = [
  { key: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@CapaCero0', handle: '@CapaCero0' },
  { key: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@capacero', handle: '@capacero' },
  { key: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/capa.cero_3d/', handle: '@capa.cero_3d' },
  { key: 'udemy', label: 'Udemy', url: 'https://www.udemy.com/user/alfonso-alcaide-cornejo/', handle: 'Alfonso Alcaide Cornejo' },
  { key: 'makerworld', label: 'MakerWorld', url: 'https://makerworld.com/en/@capa_cero', handle: '@capa_cero' },
];

export const SAME_AS = PROFILES.map((p) => p.url);

export const PERSON_NAME = 'Alfonso Alcaide Cornejo';
export const PERSON_DESCRIPTION =
  'Alfonso Alcaide Cornejo es un creador de contenido español especializado en impresión 3D. ' +
  'Dirige CapaCero3D, con tutoriales de Bambu Studio y Fusion 360, cursos en Udemy y presencia en YouTube, TikTok e Instagram.';

export const personNode = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: PERSON_NAME,
  alternateName: ['Alfonso Alcaide', 'CapaCero3D', 'Capa Cero 3D'],
  url: ABOUT_URL,
  mainEntityOfPage: ABOUT_URL,
  image: `${SITE}/logo-emblem.png`,
  description: PERSON_DESCRIPTION,
  jobTitle: 'Creador de contenido sobre impresión 3D',
  nationality: { '@type': 'Country', name: 'España' },
  knowsLanguage: 'es',
  knowsAbout: [
    'Impresión 3D', 'Impresión 3D FDM', 'Bambu Studio', 'Bambu Lab', 'Fusion 360',
    'Calibración de impresoras 3D', 'Modelado 3D para impresión', 'Fabricación digital', 'Grabado láser',
  ],
  worksFor: { '@id': ORG_ID },
  sameAs: SAME_AS,
};

export const organizationNode = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Capa Cero 3D',
  alternateName: 'CapaCero3D',
  url: `${SITE}/`,
  logo: `${SITE}/logo-capa-cero.webp`,
  description: 'Marca de creación de contenido en español sobre impresión 3D, Bambu Studio y Fusion 360, fundada por Alfonso Alcaide Cornejo.',
  sameAs: SAME_AS,
  founder: { '@id': PERSON_ID },
};
