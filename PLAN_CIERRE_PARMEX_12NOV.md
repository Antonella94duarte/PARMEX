# PARMEX — Verificación técnica y plan de cierre

**Fecha:** 12 de noviembre de 2026 · **Entrega:** 17 de noviembre de 2026, 23:59 (Ciudad de México) · 18 de noviembre, 02:59 (Asunción)
**Alcance de este documento:** qué es el proyecto hoy, qué se verificó, qué falta y cómo cerrarlo.

> **Cambio de plazo.** El 11 de noviembre la organización anunció la extensión al 17 de noviembre a las 23:59 de Ciudad de México. La conversión a hora de Asunción da las 02:59 del 18. El alcance de §5 no cambia; sí el calendario de §7, que ahora tiene cinco días de colchón para desplegar, grabar el video y ensayar en vez de uno.

---

## 1. Qué es PARMEX (en corto)

Una prueba de concepto del **Sistema de Denuncias Públicas (S5)** de la Plataforma Digital Nacional, para el Datatón Anticorrupción 2026. La persona denunciante llena un formulario guiado de tres preguntas, escribe su relato y adjunta evidencia; **el navegador cifra todo antes de enviarlo** y solo muestra el folio y el código de seguimiento cuando la autoridad confirma que pudo abrirlo.

La idea central no es el formulario: es **mover el cifrado al origen**. El expediente viaja y se almacena cifrado; solo la autoridad, con su llave privada, puede leerlo. Eso reduce la exposición si una copia se filtra en tránsito o en reposo.

Hoy funciona como demo local: dos pestañas del mismo navegador (captura y autoridad) que se hablan por `BroadcastChannel`. Sin servidor, sin base de datos, sin dependencias externas.

## 2. Lo que verifiqué

| Prueba | Resultado |
| --- | --- |
| Suite unitaria del módulo criptográfico (`node --test crypto.test.mjs`, Node 24) | **8 / 8** |
| Flujo completo en Chrome real, dos pestañas, con captura de pantalla y medición | **22 / 22** |
| Camino de error: enviar sin la pestaña de autoridad abierta | **OK** (conserva el relato, muestra la ayuda, enfoca el enlace) |
| Envío de punta a punta | **861 ms** |
| HTML: ids duplicados, `label for`, `aria-*`, nombres accesibles | **0 problemas** en ambas páginas |
| Recursos servidos (`/`, `*.html`, `*.mjs`, `*.css`) | **200** en todos |
| Ancho móvil 390 px, desbordamiento horizontal | **Ninguno** en ambas páginas |
| Sintaxis de los 4 módulos JS | **OK** |

Evidencia gráfica en `validacion/`: `captura-escritorio.png`, `captura-movil-390px.png`, `bandeja-con-casos.png`, `comprobante-folio.png`.

**Reproducir:**

```powershell
python -m http.server 8765 --bind 127.0.0.1
# abrir http://localhost:8765/ y http://localhost:8765/autoridad.html
node --test crypto.test.mjs
```

### Cómo funciona, técnicamente

```text
Pestaña ciudadana                                  Pestaña autoridad
        │  descubre la clave pública (BroadcastChannel)  │
        │ ──────────────────────────────────────────────►│
        │ ◄──────────────  {version, spki}  ──────────────│
        │                                                │
  AES-256-GCM (clave nueva por expediente)              │
  envuelve la clave con RSA-OAEP-SHA256 (3072 bits)     │
        │ ──────  {folio, keyId, nonce, wrappedKey,       │
        │           ciphertext}  ────────────────────────►│
        │                                        descifra │
        │ ◄────────────  confirmación con folio  ─────────│
   muestra el folio                                     bandeja en memoria
```

- **AAD** = `JSON.stringify([version, folio, keyId])`: si alguien cambia el folio, el `keyId` o la versión, AES-GCM falla al autenticar.
- **Folio**: 16 bytes aleatorios (32 hex). **Nonce**: 12 bytes. **Etiqueta**: 128 bits.
- **La llave privada es no exportable** y vive solo en memoria de la pestaña de autoridad.
- **Límites**: adjunto 1 MiB, relato 12 000 caracteres, paquete 2 MiB, clave pública 2 KiB.
- **Base64 canónico** obligatorio, campos exactos, versión exacta: el validador rechaza todo lo que no encaje.

## 3. Hallazgos

Ordenados por impacto real sobre la entrega.

### Alto

| # | Hallazgo | Evidencia | Acción |
| --- | --- | --- | --- |
| 1 | **No existe seguimiento anónimo.** El folio se muestra, pero no hay forma de consultar el estado con folio + código. Es el eje obligatorio de la convocatoria (anonimato, trámite y seguimiento). | `README.md` §Relación con S5 lo reconoce; no hay página de consulta | Crear `consulta.html`: folio + código secreto, respuesta genérica de estado |
| 2 | **No se limpian metadatos.** La foto se cifra tal cual: GPS, dispositivo y hora viajan dentro y se ven al descifrar. Contradice el «Escudo Criptográfico y Limpieza de Metadatos» de la propuesta. | `README.md` §Alcance, última línea | Re-codificar imágenes en `<canvas>` antes de cifrar y renombrar el archivo |
| 3 | **Recargar la pestaña de autoridad borra todo** (bandeja y llave). Un F5 en vivo durante la evaluación deja la demo vacía. | `autoridad.html` + `README.md` | Guardar en IndexedDB el `CryptoKey` no exportable y los paquetes cifrados; repoblar al recargar |
| 4 | **El PDF afirma dos cosas técnicamente incorrectas**: «folio cifrado con Argon2» y «modelo de k-anonimato» para el tablero público. Argon2 no cifra: es una función de derivación; no se puede «descifrar» un folio con Argon2. | `PARMEX PROPUESTA.pdf`, pág. 1 | Corregir la redacción (ver §6) antes de entregar |
| 5 | **El repo no tiene control de versiones** y cinco personas van a tocar los mismos archivos. | `git rev-parse` falla | `git init` hoy y una regla de «un dueño por archivo» |

### Medio

| # | Hallazgo | Evidencia | Acción |
| --- | --- | --- | --- |
| 6 | Al llegar una **segunda** denuncia, el aviso anuncia el folio nuevo pero la bandeja sigue mostrando el primero. | `validacion/bandeja-con-casos.png` | En `add()`, seleccionar y mostrar el recién llegado |
| 7 | Tras enviar, el formulario **vuelve al paso 1** y el comprobante aparece debajo: dos estados a la vez. | `validacion/comprobante-folio.png` | Ocultar el formulario y dejar el comprobante como pantalla final, con botón «Enviar otra» |
| 8 | **CSS con dos temas**: líneas 1–50 definen un tema claro que las líneas 65–122 pisan por completo. El bloque claro es código muerto. | `styles.css` | Borrar el bloque claro o separarlo en un archivo de tema |
| 9 | El contenido vive en **760 px dentro de 1120 px**: ~30 % de la pantalla queda vacío. En proyector se ve desbalanceado. | capturas de escritorio | Rejilla de dos columnas a partir de 900 px (formulario + panel técnico; bandeja + tablero) |
| 10 | En el flujo automático **la persona nunca ve la huella** de la llave con la que se cifró. | `app.mjs` | Mostrar los primeros 16 hex de la huella en el comprobante |
| 11 | `discover` espera **650 ms**; en un equipo lento o una pestaña en segundo plano puede fallar y el mensaje culpa a la autoridad. | `channel.mjs:22` | Subir a 1500 ms con un reintento |
| 12 | **Sin aviso de privacidad ni consentimiento** en la captura. | `index.html` | Texto breve de borrador + casilla, marcado como «sujeto a revisión jurídica» |

### Bajo

- `#example` tiene dos `addEventListener` (uno llena el ejemplo, otro limpia el paquete pendiente). Inofensivo, pero confunde.
- No hay `beforeunload` que avise antes de cerrar la pestaña de autoridad.
- El PDF promete FastAPI/Django, PostgreSQL, Figma y ExifTool; nada de eso existe. No es un defecto del código, es un riesgo de coherencia frente al jurado.

## 4. Propuesta del grupo vs. lo construido

| Propuesta (PDF) | Estado real | Decisión para el 13 |
| --- | --- | --- |
| Asistente de 3 preguntas | ✅ Construido y probado | Mantener |
| Cifrado del expediente | ✅ RSA-OAEP 3072 + AES-256-GCM | Mantener (es el fuerte) |
| Folio anónimo «cifrado con Argon2» | ⚠️ Folio aleatorio; no hay código ni Argon2 | Cambiar el diseño: folio + código secreto + hash |
| Limpieza de metadatos (ExifTool) | ❌ No existe | Implementar para imágenes en el navegador; documentar el límite en PDF |
| Tablero público con mapas y k-anonimato | ❌ Solo conteos internos por ámbito | No construir mapas; añadir umbral mínimo (n ≥ 5) y llamarlo por su nombre |
| FastAPI/Django + PostgreSQL | ❌ Es estático, sin backend | **No construirlo.** El estático es una ventaja: se despliega en minutos |
| Figma | — | La interfaz ya es el prototipo; no hace falta |
| WCAG 2.0 «estricto» | ⚠️ Teclado, foco y contraste; falta lector de pantalla | No afirmar certificación; entregar lista de verificación |

**La propuesta describe una plataforma; el repositorio contiene una prueba de concepto sólida.** La distancia no se cierra en un día. La salida correcta es etiquetar el PDF como *visión* y el repo como *lo construido*, y que la demo cumpla exactamente lo que promete.

## 5. Alcance congelado para la entrega

Cuatro cosas, en este orden. Todo lo demás se declara como trabajo futuro (y eso también puntúa si está bien argumentado).

**De dónde salen estos cuatro puntos.** No estaban en ningún documento del equipo. Salen de contrastar el «Diseño de la prueba de concepto» de la justificación con el eje obligatorio de la convocatoria y con lo que la demo hace al probarla: la justificación declara pendiente la limpieza de metadatos (de ahí **B**) y difiere la consulta de estado por folio a la integración con el S5 (de ahí **A**); la fragilidad de la bandeja en memoria no está escrita en ninguna parte, pero se ve al recargar (de ahí **C**); y **D** sale de revisar la interfaz renderizada, no de un documento.

**A. Seguimiento anónimo por folio + código** *(cierra el eje obligatorio)* — **hecho el 12 nov, ver §11**
- Al enviar se genera un `codigo` de 10 caracteres (base32, sin caracteres ambiguos) y se muestra **una sola vez** junto al folio.
- La autoridad guarda solo `PBKDF2-SHA256(codigo, sal=folio, 210 000 iteraciones)`.
  > **Por qué no Argon2:** WebCrypto no lo incluye; usarlo obliga a una dependencia WASM. PBKDF2 es nativo, defendible y se puede explicar en 20 segundos. Si el equipo insiste en Argon2id, se documenta como decisión de producción.
- `consulta.html`: folio + código → la pestaña de autoridad recalcula el hash y responde **solo** `{estado}`.
- Código incorrecto → mismo mensaje genérico, sin revelar si el folio existe.
- Estados de la demo: «Recibida» / «En revisión».

**B. Limpieza de metadatos en imágenes** *(cumple lo prometido)* — **hecho el 12 nov, ver §11**
- Si el adjunto es `image/jpeg|png|webp`: dibujar en `<canvas>` y re-codificar. El resultado no arrastra EXIF, GPS ni miniaturas.
- Renombrar el archivo a `evidencia-1.<ext>` para que el nombre tampoco identifique.
- PDF y Office: aviso explícito («revisa que el documento no incluya tus datos») en lugar de prometer lo que no se puede hacer.
- Mostrar «Metadatos eliminados» en el comprobante: es un momento de demo muy vendible.

**C. Que la demo sobreviva a un F5** — **hecho el 12 nov, ver §11**
- Guardar en IndexedDB el `CryptoKey` (los objetos `CryptoKey` se pueden clonar y siguen siendo **no exportables**) y los paquetes cifrados.
- Al recargar: repoblar la bandeja descifrando de nuevo. Nada de texto plano en disco.
- ~~`beforeunload` mientras haya expedientes abiertos.~~ Con persistencia ya no hace falta: el aviso estorbaría.
- Plan B: un botón «Cargar expedientes de ejemplo» que siembra dos casos con una llave de demo.

**D. Pulido de interfaz y confianza** — **hecho el 12 nov, ver §11**
- Comprobante como pantalla final (oculta el formulario).
- Seleccionar la denuncia recién llegada.
- Huella de la llave en el comprobante.
- Rejilla de dos columnas en escritorio.
- Aviso de privacidad breve + casilla.
- Eliminar el tema claro muerto del CSS.

## 6. Correcciones a los documentos — **hecho el 12 nov**

El PDF `PARMEX PROPUESTA.pdf` contenía cuatro afirmaciones que no se sostenían, y la justificación se había quedado corta en dos. Ambas cosas quedaron corregidas:

**Propuesta → `PARMEX_Propuesta_v2.docx` y `.pdf`.** Se reescribió completa, con la misma estructura y el mismo tono, corrigiendo:

1. **Folio «cifrado con Argon2»** → folio aleatorio + código secreto de un solo uso; la autoridad conserva únicamente un verificador PBKDF2 del código. Nota técnica explícita: Argon2 no cifra y WebCrypto no lo incluye.
2. **«k-anonimato» para el tablero** → supresión de celdas con umbral mínimo (n ≥ 5) y explicación de por qué k-anonimato no aplica a conteos agregados.
3. **Stack como si estuviera construido** → dos tablas separadas: «Lo construido» y «Ruta de producción», con una frase que dice que lo segundo no se construyó.
4. **El filtro «desvía» casos menores** → el asistente orienta y ordena; no descarta ni califica. La competencia es de la autoridad. (Lo pedía el propio marco jurídico.)

Se evitó además la afirmación de WCAG 2.0 «estricto»: el texto habla de lo que se probó.

**Justificación → editada en su lugar.** Tres frases actualizadas para que no se quede corta:

- «El seguimiento institucional por folio forma parte de la integración propuesta con el S5» → el seguimiento ya funciona en la demo; la integración sigue siendo propuesta.
- «La limpieza de metadatos… quedan pendientes de validación» → la limpieza de imágenes se aplica antes de cifrar; PDF y Office se advierten.
- «El folio acredita la recepción» → el folio y el código acreditan la recepción y permiten consultar el estado.

El original quedó respaldado en `respaldo/PARMEX_Justificacion_Dataton_2026_original.docx`.

## 7. Reparto y cronograma

Cinco personas, menos de 36 horas. La regla es: **una persona, un archivo**. Nada de dos ramas tocando `app.mjs`.

### Célula 1 — Núcleo técnico, datos y criptografía (Antonella, Víctor, Nikol)

| Quién | Tarea | Archivos |
| --- | --- | --- |
| Nikol | **A.** Seguimiento folio + código + `consulta.html` | `consulta.html`, `channel.mjs` |
| Víctor | **B.** Limpieza de metadatos y renombrado de evidencia | `crypto.mjs` (validación), `app.mjs` (captura) |
| Antonella | **C.** Persistencia en IndexedDB + `beforeunload` + semilla; integración y pruebas E2E; corrección del `.docx` | `app.mjs`, `crypto.test.mjs`, `.docx` |

### Célula 2 — Experiencia ciudadana y blindaje institucional (Anahí, Joel)

| Quién | Tarea | Archivos |
| --- | --- | --- |
| Anahí | **D.** Comprobante final, selección del caso nuevo, huella visible, rejilla de dos columnas, CSS muerto | `styles.css`, `index.html` |
| Joel | Aviso de privacidad y consentimiento; lista de verificación de accesibilidad con capturas; guion de 90 s y video | `index.html`, `README.md` |

### Reloj

El calendario original era de un día. Con la extensión al 17 de noviembre quedan cinco, así que se reordena: primero lo que ya está hecho (A, B, C y D), después lo que depende de otros (Discord, despliegue) y al final el ensayo.

| Día | Qué pasa |
| --- | --- |
| **12 nov** | Cerrado: A, B, C, D, documentos corregidos, manual y GIF |
| **13 nov** | Registro del grupo en Discord; despliegue estático y prueba desde otro equipo |
| **14 nov** | Video de 90 s con el guion del README; revisión de la propuesta v2 por la Célula 2 |
| **15 nov** | Ensayo general cronometrado. Congelar el alcance: nada nuevo entra |
| **16 nov** | Solo se corrige lo que rompa el guion. Revisión final de documentos |
| **17 nov** | Entrega antes de las 23:59 de Ciudad de México (02:59 del 18 en Asunción) |

La regla se mantiene: si algo no está empezado el 15, se cae. Lo único que cambia es que ahora hay colchón para desplegar y ensayar, no para agregar funciones.

Si a las **14:00** una tarea no está empezada, se cae del alcance. Sin excepciones: es mejor una demo de tres funciones que funciona que cinco a medias.

## 8. Riesgos y plan B

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Se recarga la pestaña de autoridad en vivo | Media | C: persistencia + semilla de ejemplo |
| `BroadcastChannel` no responde en el equipo del jurado | Baja | Subir el timeout; camino manual con archivos ya probado |
| El video no se graba a tiempo | Media | Grabar hoy a las 21:00 con el guion; regrabar solo si mejora |
| Dos personas editan `app.mjs` | Alta | Un dueño por archivo; integración a las 14:00 |
| El jurado compara el PDF con el repo | Alta | §6: separar «construido» de «ruta de producción» |

## 9. Mensaje listo para el grupo

> Holaaa 🙌 ya revisé el proyecto a fondo y corrí las pruebas: **8/8 de criptografía y 22/22 en Chrome con dos pestañas**, el envío completo tarda menos de un segundo. La demo funciona y el cifrado está bien hecho.
>
> Antes de la junta les dejo tres cosas para no perder tiempo:
>
> 1️⃣ **La propuesta y el código no cuentan la misma historia.** El PDF promete backend, PostgreSQL, ExifTool y k-anonimato; el repo tiene una prueba de concepto estática que cifra de verdad en el navegador. No es malo: es más honesto y se despliega en minutos. Propongo que el PDF diga «construido» vs «ruta de producción».
>
> 2️⃣ **Dos correcciones técnicas:** Argon2 **no cifra**, es una función de derivación; el folio no se puede «cifrar con Argon2». Lo correcto es folio aleatorio + código secreto y guardar solo el hash. Y el k-anonimato no aplica a conteos: para el tablero lo correcto es un umbral mínimo (n ≥ 5).
>
> 3️⃣ **Nos falta el eje obligatorio: seguimiento.** Hoy el folio se muestra pero no se puede consultar. Es lo primero que yo haría: `consulta.html` con folio + código, respuesta genérica. Se ve, se explica y cierra el requisito.
>
> Con eso, más limpieza de metadatos en imágenes y que la demo no se borre al recargar, yo creo que llegamos bien al 13. Les mando el reparto por célula en un rato. ¿La hacemos hoy en cuanto podamos? Lleven su archivo asignado abierto y vamos directo a acordar quién toca qué. 🔥

## 10. Lo que yo haría primero

Si hay que elegir una sola cosa: **A (seguimiento folio + código)**. Es la que convierte una demo bonita en una propuesta que responde al eje obligatorio de la convocatoria, y es la que un jurado va a preguntar («¿y cómo le doy seguimiento?»).

Después **B (metadatos)**, porque es la que más impresiona en vivo con menos código: se sube una foto con GPS, se envía, y al descargarla ya no trae nada.

Lo demás es blindaje.

---

## 11. Avance del 12 de noviembre

**Hecho:** los puntos A, B, C y D completos, el hallazgo #6 y la corrección de los tres documentos.

| Qué | Dónde |
| --- | --- |
| Código de seguimiento de 10 caracteres, generado en el navegador y guardado **dentro** del sobre cifrado | `crypto.mjs` (`createTrackingCode`) |
| Verificador `PBKDF2-SHA256` (210 000 iteraciones, sal = folio) y comparación en tiempo constante | `crypto.mjs` (`hashCode`, `sameSecret`) |
| Mensaje de consulta por el canal | `channel.mjs` (`consultCode`) |
| La autoridad guarda solo el verificador y el estado; botón «Marcar en revisión» | `app.mjs` |
| Comprobante con folio, código y botón de copiar | `index.html` |
| Página de consulta | `consulta.html`, `consulta.mjs` |
| Limpieza de EXIF, XMP, IPTC, GPS y fecha en JPEG, PNG y WebP, sin recomprimir | `metadata.mjs` |
| Renombrado de la evidencia a `evidencia-1.<ext>` y aviso antes de enviar | `app.mjs`, `index.html` |
| Persistencia en IndexedDB de la llave (no exportable) y de los paquetes cifrados | `storage.mjs`, `app.mjs` |
| Controles «Cargar expedientes de ejemplo» y «Vaciar la bandeja» | `app.mjs`, `autoridad.html` |
| Comprobante como pantalla final, con «Enviar otra denuncia» y la huella de la llave | `app.mjs`, `index.html` |
| Aviso de privacidad y casilla obligatoria antes de enviar | `index.html`, `app.mjs` |
| Dos columnas en escritorio y panel lateral «Qué pasa cuando envías» | `styles.css`, `index.html` |
| Tema único: se eliminó el bloque claro muerto del CSS | `styles.css` |
| Propuesta corregida en DOCX y PDF | `PARMEX_Propuesta_v2.docx`, `.pdf`, `crear_propuesta.py` |
| Justificación con tres frases actualizadas | `PARMEX_Justificacion_Dataton_2026.docx` |
| Manual de usuario en DOCX con seis capturas | `PARMEX_Manual_de_Usuario.docx`, `crear_manual.py` |
| Demostración animada en GIF (20 cuadros, 20 s) | `PARMEX_demo.gif` |
| Documentación y guion de 90 s | `README.md` |
| La denuncia recién recibida queda seleccionada en la bandeja (hallazgo #6) | `app.mjs` |

**Verificación al cierre de esta etapa:** 21/21 pruebas unitarias (12 de criptografía y 9 de metadatos), 16/16 de regresión, 14/14 de persistencia, 15/15 de interfaz y 10/10 de la limpieza con archivos reales, en Chrome. Un JPEG con GPS pasó de 1276 a 1054 bytes, sin EXIF y con los píxeles idénticos. Capturas en `validacion/`.


**Decisión técnica registrada:** el código no se «cifra con Argon2». Se genera aleatorio, viaja cifrado y la autoridad conserva únicamente un verificador PBKDF2. Argon2id queda como decisión de producción porque WebCrypto no lo incluye. La limpieza de metadatos se hace sin recomprimir para no degradar la evidencia; PDF y Office quedan fuera y se advierten. La persistencia guarda la llave como objeto `CryptoKey` —sigue siendo no exportable— y solo paquetes cifrados; el texto plano se reconstruye al abrir la pestaña.

**Pendiente:** ensayar la demo completa, grabar el video de 90 s y desplegar el sitio estático. Nada de código. La lista de correcciones documentales está cerrada (§6): propuesta en v2, justificación actualizada y marco jurídico con sus cuatro ajustes pendientes de la Célula 2.

---

## 12. Insumos recibidos el 12 de noviembre

Llegaron dos archivos del equipo. Uno es material de primera para la entrega; el otro no debe salir a la cancha tal como está.

### 12.1 Marco jurídico (`marco-jurídico.docx`)

**Sí sirve, y bastante.** Es el respaldo que la demo no puede dar por sí sola: convierte «ciframos bonito» en «esto tiene fundamento legal y criminológico». Lo que aporta:

- **LGRA, artículos 91, 92 y 93**: denuncia anónima, obligación de facilitar su recepción y presentación electrónica. Es exactamente el sustento del portal.
- **Código Penal Federal, Título Décimo**: 214, 215, 217, 222, 223 y 224, con la relación de cada conducta con el portal.
- **Alineación PDN / S5 / SESNA** y una advertencia muy sana: no afirmar que PARMEX ya está conectado al S5. Coincide con lo que dice el `README.md`.
- **Justificación criminológica** con tres enfoques (actividades rutinarias, elección racional, prevención situacional).
- **Ya corrige el error de Argon2** y advierte que el filtro «debe servir para orientar, no para excluir». Es la misma conclusión de §3 y §6 de este plan, escrita por otra célula.

**Qué ajustar para que case con lo construido:**

1. La tabla de seguridad dice «Hash Argon2id o HMAC». La demo usa `PBKDF2-SHA256(código, sal = folio)` porque WebCrypto no trae Argon2. Redactar: «PBKDF2 en la demo; Argon2id en producción».
2. Falta el **régimen de protección de datos**: la denuncia no pide datos del denunciante, pero el relato puede contener datos de terceros. Un párrafo sobre minimización, acceso restringido y conservación cierra la pregunta que un jurado haría.
3. Falta el **aviso de privacidad** que la interfaz debería mostrar (tarea D).
4. Las citas están sin formato APA 7, como el propio documento propone.
5. El seguimiento ya existe: describirlo como **folio + código con verificador**, no como promesa a futuro.

**Nota de honestidad:** no puedo validar la numeración exacta de los artículos. Alguien del equipo debe cotejarlos contra el texto vigente antes de entregar; un artículo mal citado frente a un jurado jurídico es peor que no citarlo.

### 12.2 Simulador (`parmex_simulator.html.txt`)

**No conviene usarlo como código ni mostrarlo al jurado junto a la demo.** Es una maqueta con datos falsos y varias prácticas que contradicen el discurso de PARMEX:

| Problema | Dónde | Por qué importa |
| --- | --- | --- |
| Hash falso: literal `a8f9c1...3b21` y `Math.random()` | líneas 444 y 545 | No es una función criptográfica; cualquiera lo reconstruye |
| Metadatos en claro: tipo, ámbito y estatus | tabla y DDL | Contradice el modelo: el expediente viaja cifrado o no viaja |
| `contacto_encriptado` con `user_encrypted@mail.com` fijo | línea 544 | No está cifrado nada; es una cadena de ejemplo |
| `k_anon: true` para todas las filas | líneas 546 y 576 | Un indicador que siempre vale lo mismo no protege nada |
| SQL construido por concatenación | líneas 583-598 | Modelo de inyección; no se enseña a un jurado |
| Cuarto paso que pide contacto | líneas 482-487 | Rompe la promesa de no pedir correo |

**Lo que sí vale la pena rescatar:**

1. La idea de **mostrar el esquema de la base de datos** como pieza de comunicación. Es una buena respuesta a «¿dónde queda la denuncia?». Pero con el esquema correcto.
2. La **cuarta pregunta sobre anonimato**. Nuestra respuesta es mejor y verificable: no se pide contacto; el seguimiento funciona con folio + código y la autoridad nunca ve el código.

Esquema correcto para esa pieza, alineado con lo que ya construimos:

```sql
CREATE TABLE expedientes (
  folio          CHAR(32)    PRIMARY KEY,   -- 16 bytes aleatorios
  key_id         CHAR(64)    NOT NULL,      -- huella SHA-256 de la llave receptora
  version        SMALLINT    NOT NULL,
  nonce          BYTEA       NOT NULL,
  wrapped_key    BYTEA       NOT NULL,      -- AES envuelta con RSA-OAEP
  ciphertext     BYTEA       NOT NULL,      -- respuestas, relato y adjunto
  tracking_hash  BYTEA       NOT NULL,      -- PBKDF2 del código, sal = folio
  estado         TEXT        NOT NULL DEFAULT 'Recibida',
  recibido_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Sin relato, sin respuestas, sin nombre de archivo y sin contacto: nada que identifique a la persona aunque se robe la tabla entera.

### 12.3 Qué cambia en el plan

- El **marco jurídico deja de ser trabajo pendiente**: ya existe un borrador sólido; la Célula 2 lo ajusta y lo formatea en lugar de escribirlo desde cero.
- El **simulador queda fuera del entregable**. Se reemplaza por el DDL correcto y por la demo real, que cifra de verdad.
- Se **refuerza** la decisión de no pedir contacto: es una diferencia verificable frente al simulador y frente a cualquier propuesta que pida correo «para dar seguimiento».
