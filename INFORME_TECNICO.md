# 🤖 INFORME MAESTRO PARA REPLICA DE IA (Paso a Paso)

Este documento es un "Mega Prompt" o Manual de Instrucciones diseñado específicamente para alimentar a otra Inteligencia Artificial. Al entregar este documento a otra IA, será capaz de reconstruir la aplicación **Capa Cero Web v2** exactamente igual sin alucinar y respetando los límites de tokens al seguir un desarrollo por Fases.

---

## 📋 CÓMO USAR ESTE DOCUMENTO CON OTRA IA:
1. Copia y pega desde la **"INSTRUCCIÓN PARA LA IA"** hasta el final y envíalo en tu primer mensaje.
2. La IA entenderá el contexto global de todo el ecosistema.
3. Luego, tú (el usuario) le dirás: *"Ejecuta la Fase 1"*. De este modo, la IA generará el código exacto sin quedarse sin tokens. Luego dirás *"Ejecuta la Fase 2"*, y así sucesivamente.

---

> 👇 **COPIA A PARTIR DE AQUÍ Y PÉGALO EN LA NUEVA IA** 👇

# INSTRUCCIÓN PARA LA IA: ROL Y CONTEXTO

Actúa como un Desarrollador Senior Experto en React 18, Vite, Tailwind CSS v4, Vercel Serverless y Arquitecturas "Static Site Generation" basadas en Google Sheets.
Tu objetivo es reconstruir desde cero una aplicación llamada **Capa Cero Web v2**. El proyecto es un Hub de Afiliados (Affiliate Hub) para productos de Amazon/AliExpress y a la vez una Academia de Formación con captación de Leads.

**Reglas Críticas para ti (la IA):**
1. Escribe código modular, limpio y listo para producción.
2. Esta es una guía dividida en **8 Fases**. NO ESCRIBAS TODO EL CÓDIGO AHORA. 
3. Simplemente confirma que has leído y entendido esta estructura, y dime *"Estoy listo. Pídeme que ejecute la Fase 1 cuando quieras."*
4. Cuando el usuario te pida ejecutar una Fase, escribirás SOLO los archivos de esa fase detalladamente.

---

## ESTRUCTURA DEL PROYECTO (Mental Model)

**Tech Stack:** React 18, Vite, TailwindCSS v4, Framer Motion, Lucide React, NodeJS (solo scripts de compilación locales), Vercel (funciones Serverless).
El proyecto NO tiene una base de datos tradicional. Se alimenta de archivos JSON estáticos en `src/data/` generados en el *build-time* usando hojas de cálculo de Google.

```text
/
├── package.json y vite.config.js
├── tailwind.config.js
├── vercel.json
├── index.html
├── api/
│   ├── subscribe.js
│   └── render-product.js
├── scripts/
│   ├── update-products.js
│   └── update-cursos.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── utils/
    │   ├── analytics.js
    │   └── loadProducts.js
    └── components/
        ├── Header.jsx, SearchBar.jsx, FilterButtons.jsx, CategoryFilters.jsx
        ├── ProductGrid.jsx, ProductCard.jsx, ProductModal.jsx
        ├── CourseLanding.jsx, CourseGrid.jsx, CourseCard.jsx, CourseLeadForm.jsx
        └── AnalyticsDashboard.jsx, CookieBanner.jsx, PrivacyCookies.jsx
```

---

## FASE 1: Setup y Dependencias Base
**Objetivos:** 
1. Crea el `package.json` configurado para Vite y modulos ESM (`"type": "module"`). Las dependencias son: `framer-motion`, `lucide-react`, `papaparse`, `read-excel-file`, `sharp`, `typewriter-effect`, `xlsx`. Dev dependencies: `vite`, `tailwindcss`, `autoprefixer`, `postcss`.
2. Crea un `tailwind.config.js` que extienda el color principal: `colors: { capaBlue: '#2575c4' }`.
3. Crea el archivo `index.html`. Debe tener configurado Google Analytics, OpenGraph tags, el color del theme, preámbulos para SEO JSON-LD y un div root.
4. Crea `/vercel.json` con `rewrites` para mandar `/producto/:id` a la API `/api/render-product` y el resto `/(.*)` al `index.html`.

## FASE 2: Sistema de Datos y Utils Locales
**Objetivos:**
1. Crear `src/utils/analytics.js`: Maneja eventos de GA4 (`window.gtag`) y rastreo manual enviando `fetch` con `mode: no-cors` a un endpoint secreto de Google Sheets Macros para telemetría propia (origen social, clics puros a productos, búsquedas locales).
2. Crear `src/utils/loadProducts.js`: Exporta `loadProducts()` para agrupar asincronamente `products.json`, `amazon.json` y `aliexpress.json` de `src/data/`. Debe contener la lógica de búsqueda global `filterProducts()`.
3. Crea el archivo `/src/index.css` que importa las bases de Tailwind y crea utilidades CSS puras como una animación `.breathe-animation` y limpieza global para esconder scrollbars (`no-scrollbar`).

## FASE 3: Componentes UI Globales
**Objetivos:**
1. **Header.jsx**: Componente sticky, que dependiendo de props como `compactLogo` redimensiona el banner. Incluye los botones sociales SVG (TikTok y YouTube apuntando a `@capacero`), ambos conectados al analytics para trackear clics sociales. Con botón para "Waitlist".
2. **SearchBar.jsx**: Incorpora el `typewriter-effect` para rotar sugerencias automáticamente. Tiene manejo de input conectado a analytics (`trackSearch`) al esperar (debouncing) el input del usuario.
3. **FilterButtons.jsx** y **CategoryFilters.jsx**: Botoneras en formato "píldora" con overflow-x-auto, interactúa con el estado padre para activar/desactivar filtros.
4. **CookieBanner.jsx**: Modal persistente inferior en base a localStorage que avisa de políticas de privacidad y afiliados de Amazon.

## FASE 4: Módulo Affiliate Hub (Tienda)
**Objetivos:**
1. **ProductCard.jsx**: Renderiza imagen `.webp`. Muestra precios, tags del producto ("Top", "Oferta"), animaciones hover usando Framer Motion. Al hacer clic debe notificar vista con `trackProductClick` en analytics.
2. **ProductGrid.jsx**: Un Wrapper CSS Grid responsive para iterar las ProductCards.
3. **ProductModal.jsx**: Es el corazón de la conversión. Debe bloquear el Body Scroll. Usar Framer Motion para aparecer desde el centro. Tiene un Carrusel táctil (soporte a Touch Move y Keydown Arrows). Muestra "Ventajas / Desventajas" tipo expert-review, precio destacado, y botón gigante de CTA ("VER OFERTA") enlazado con `trackAffiliateClick`. Abajo un descargo obligatorio "En calidad de Afiliado de Amazon...".

## FASE 5: Módulo Academia (Cursos y Leads)
**Objetivos:**
1. **CourseGrid.jsx** y **CourseCard.jsx**: Similares a productos, pero iteran sobre un endpoint de `cursos.json`, montados en el interceptor `/cursos`.
2. **CourseLanding.jsx**: Landing hiper-dinámica. Pinta el Hero con o sin vídeo de Youtube (iframe si el Excel indicaba link a youtube). Renderiza hasta 10 Módulos iterando llaves dinámicas como `Modulo_1_Titulo`. 
3. **CourseLeadForm.jsx**: Maneja la captación. Tiene campos: nombre, apellidos, teléfono, correo, país select. CRÍTICO: Implementa un **Honeypot para Bots**, un `input type="text" name="website_url"` escondido por CSS; si el usuario lo llena, el servidor descartará silenciosamente el registro. El fetch apunta a `/api/subscribe`.

## FASE 6: Panel de Analíticas y Privacidad
**Objetivos:**
1. **AnalyticsDashboard.jsx**: Dashboard bloqueado por contraseña (`Contraseña Maestra`) guardando la validez en localStorage. Solicita el JSON de las macros de Google Scripts (el mismo URL del analytics). Pinta un componente con dos *Pestañas* ('estadisticas' y 'buscador') con tablas ultra-detalladas del rendimiento (vistas de tarjetas vs clics de oferta). 
2. Inyección estricta de `<meta name="robots" content="noindex, nofollow" />` para este componente en useEffect.

## FASE 7: Enrutamiento Base (App.jsx)
**Objetivos:**
1. **App.jsx**: Actuará como un Router condicional. Si la ruta es `/estadisticas` devuelve `AnalyticsDashboard`. Si es `/cursos` devuelve `CourseGrid`. En cualquier otra, renderiza el ciclo vital de la tienda: Llama `useEffect` con `loadProducts`, mantiene estados (searchQuery, activeFilter).
2. Interceptación SEO: Si `window.location.pathname` carga directo `/producto/ID`, seteará automáticamente ese producto para levantar el `ProductModal` al iniciar la app, logrando compartición directa de enlaces. Modificando también `window.history.replaceState` al limpiar o abrir modales sin recargar la página.

## FASE 8: Backend (Serverless & Scripts Build-time)
**Objetivos:**
1. **api/subscribe.js**: Función Serverless Vercel (REQ, RES). Debe validar que si el req.body trae `website_url` relleno (Honeypot), hace un return silencioso de status 200 sin registrar nada. Si es legítimo, hace un POST Server-to-Server al App Script de Google para guardar los leads con todos los parámetros.
2. **scripts/update-products.js** (El CMS No-Code): Usando NODE.JS nativo. Hace fetch al archivo XLSX expuesto públicamente de Google Sheets. Usa la librería `xlsx` para leerlo, y por fila descarga las imágenes originarias al disco local, comprimiéndolas con `sharp` y convirtiéndolas a `.webp`. Tras tabular todo, genera el archivo `src/data/products.json`. Inyecta adicionalmente SEO estático (script LD+JSON) modificando físicamente con `fs` el `index.html` en las carpetas. Escribe automáticamente también el `sitemap.xml`. Debe tener arquitectura limpia de Node.

---
*(Fin del informe, espera a que te confirme la IA para iniciar la Fase 1)*
