# 🎨 Sistema de Badges

Los badges se configuran añadiendo un campo `badge` en el JSON del producto.

## Badges Disponibles:

- **Top** ⭐ - Fondo amarillo
- **Eco** 🌱 - Fondo verde  
- **Indispensable** 🔥 - Fondo rojo
- **Nuevo** ✨ - Fondo azul
- **Oferta** 💰 - Fondo morado

## Ejemplo de uso:

```json
{
  "id": "prod-001",
  "title": "Producto Ejemplo",
  "price": "99€",
  "image": "...",
  "affiliateLink": "...",
  "description": "...",
  "badge": "Top"
}
```

**Nota:** El campo `badge` es opcional. Si no lo incluyes, el producto no tendrá etiqueta.
