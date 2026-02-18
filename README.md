# 🚀 CAPA CERO -# Affiliate Link Hub - CAPA CERO (✅ PROYECTO COMPLETADO)

> Hub de enlaces de afiliados optimizado para viralizar productos de TikTok

## 🎯 Características

- ✨ **Diseño Dark Mode** con identidad CAPA CERO
- 🔍 **Búsqueda con Typewriter** automático y filtrado en tiempo real
- 📱 **100% Responsive** - Mobile First
- ⚡ **Sistema Automático** de carga de productos desde JSON
- 🎭 **Modal Conversion-Focused** con animaciones smooth
- 💫 **Efectos Glow** azul eléctrico en hover

## 🛠️ Tech Stack

- React 18 + Vite
- Tailwind CSS v4
- Framer Motion
- Lucide Icons
- Typewriter Effect

## 🚀 Inicio Rápido

### Instalar dependencias
```bash
npm install
```

### Iniciar servidor de desarrollo
```bash
npm run dev
```

La web estará disponible en: `http://localhost:5173/`

### Build para producción
```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/`

## 📦 Añadir Productos

### 1. Crear archivo JSON

Simplemente crea un nuevo archivo `.json` en `src/data/`:

```json
[
  {
    "id": "unique-id",
    "title": "Nombre del Producto",
    "price": "99€",
    "image": "https://url-de-la-imagen.jpg",
    "affiliateLink": "https://tu-enlace-de-afiliado",
    "description": "Descripción del producto"
  }
]
```

### 2. ¡Eso es todo!

El sistema automáticamente detectará y cargará todos los productos. No necesitas tocar código.

## 📂 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── Header.jsx
│   ├── SearchBar.jsx
│   ├── ProductCard.jsx
│   ├── ProductGrid.jsx
│   └── ProductModal.jsx
├── data/               # Archivos JSON de productos
│   ├── amazon.json
│   └── aliexpress.json
├── utils/              # Utilidades
│   └── loadProducts.js
├── App.jsx
└── main.jsx
```

## 🎨 Personalización

### Colores

Edita `tailwind.config.js` para cambiar el color de acento:

```javascript
colors: {
  capaBlue: '#06b6d4', // Cambia este valor
}
```

### Logo

Reemplaza el logo de texto en `src/components/Header.jsx`:

```jsx
<img src="/logo-capa-cero.png" alt="CAPA CERO" className="h-24 md:h-32" />
```

### Enlaces Sociales

Actualiza los enlaces de YouTube y TikTok en `src/components/Header.jsx`:

```jsx
<a href="https://www.youtube.com/@TuCanal" ... >
<a href="https://www.tiktok.com/@TuUsuario" ... >
```


## 🔗 Despliegue

### Netlify (Recomendado)

1. Sube el proyecto a GitHub
2. Conecta tu repo en Netlify
3. Configuración:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Vercel

```bash
vercel deploy
```

## 📝 Datos de Ejemplo

El proyecto incluye 6 productos de ejemplo en:
- `src/data/amazon.json` (3 productos)
- `src/data/aliexpress.json` (3 productos)

## 🎯 Flujo de Conversión

1. Usuario **ve la rejilla** de productos
2. Usuario **hace clic** en tarjeta → **Modal se abre**
3. Usuario **lee detalles** completos
4. Usuario **hace clic en "VER OFERTA"** → Se abre enlace de afiliado en nueva pestaña

> Este flujo de 2 pasos aumenta el engagement y las conversiones.

## 🐛 Troubleshooting

### El servidor no arranca
```bash
# Limpia node_modules y reinstala
rm -rf node_modules
npm install
```

### Tailwind no funciona
```bash
# Verifica que tienes el plugin correcto
npm list @tailwindcss/postcss
```

### Los productos no aparecen
- Verifica que los archivos JSON están en `src/data/`
- Verifica que el JSON es válido (usa un validador online)
- Mira la consola del navegador para errores

## 📞 Soporte

Creado para **CAPA CERO** 💙

---

**¿Listo para viralizar productos?** 🚀


