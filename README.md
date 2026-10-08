# PSD Template Editor para Vercel

Esta es una primera versión de una página web para abrir plantillas PSD y simplificar cambios de texto e imágenes.

## Qué hace

- Abre un PSD desde tu computadora.
- Inserta Photopea dentro de la propia página.
- Detecta las capas de texto del PSD y crea campos para editarlas.
- Permite seleccionar una capa y reemplazarla por una imagen PNG/JPG/WEBP.
- Permite descargar el resultado como PSD o PNG.
- No necesita Node, base de datos ni backend para esta versión.

Photopea expone un API de integración mediante iframe y Live Messaging, y permite ejecutar scripts JavaScript sobre el documento abierto. La documentación oficial indica que también puede devolver el PSD/PNG al sitio anfitrión mediante `saveToOE`. 

## IMPORTANTE sobre las imágenes

La versión incluida reemplaza una capa por una nueva capa de imagen y la ajusta al área de la capa original. Para obtener el mejor resultado en plantillas profesionales:

1. Convierte las áreas de foto en Objetos Inteligentes.
2. Pon nombres claros a las capas, por ejemplo:
   - `IMG_FOTO`
   - `IMG_LOGO`
   - `TXT_NOMBRE`
   - `TXT_FOLIO`
   - `TXT_FECHA`
3. Mantén las capas de texto como capas de texto, no las rasterices.
4. Si quieres conservar máscaras, sombras y transformaciones específicas de una foto, la siguiente versión puede hacerse para reemplazar directamente el contenido del Objeto Inteligente.

## Cómo subirlo a Vercel

### Opción A — Vercel desde GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta.
3. En Vercel, selecciona `Add New -> Project`.
4. Importa el repositorio.
5. Framework Preset: `Other`.
6. Build Command: déjalo vacío.
7. Output Directory: `.`.
8. Deploy.

### Opción B — Vercel CLI

Si tienes Node.js y Vercel CLI:

```bash
npm i -g vercel
vercel
```

Cuando pregunte por el directorio, usa la carpeta del proyecto.

## Uso

1. Abre la página.
2. Pulsa **Abrir PSD**.
3. Selecciona tu plantilla.
4. Espera a que aparezcan los campos de texto.
5. Cambia un texto y pulsa **Aplicar texto**.
6. Para una imagen, selecciona la capa destino, selecciona una imagen y pulsa **Reemplazar imagen**.
7. Pulsa **Descargar PSD** para conservar la edición o **Descargar PNG** para obtener una imagen final.

## Siguiente versión recomendada

Para hacer la herramienta realmente cómoda para producción, se recomienda una segunda versión con:

- plantillas guardadas en una carpeta/galería;
- nombres amigables para los campos (`Nombre`, `Folio`, `Fecha`, `Foto`);
- reemplazo real de Objetos Inteligentes;
- ajuste automático de la foto (cubrir/contener);
- vista previa de la plantilla;
- botones para generar varias versiones de una sola vez;
- campos obligatorios;
- generación automática de folios;
- exportación de múltiples PNG;
- posibilidad de bloquear el editor completo y dejar solamente tus controles.

## Dependencia externa

La página utiliza `https://www.photopea.com` como editor PSD incrustado. Photopea documenta oficialmente el uso mediante iframe, Live Messaging y scripts. El modo sin anuncios/white-label requiere una cuenta Distributor; el editor incrustado básico está disponible mediante su API. 

## Nota de seguridad

Este proyecto no guarda los PSD en una base de datos. El procesamiento se realiza en el navegador y se comunica con el editor incrustado. Si más adelante quieres guardar plantillas, usuarios, historial o archivos en la nube, habrá que añadir almacenamiento y autenticación.
