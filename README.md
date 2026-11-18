# PARMEX

Prueba de concepto del Sistema de Denuncias Públicas (S5) para el Datatón Anticorrupción 2026. La persona denunciante llena el formulario y pulsa **Enviar denuncia**. El navegador cifra el relato y la evidencia, los envía a la pestaña de autoridad y muestra un folio y un código de seguimiento después de recibir confirmación. Con ambos consulta el estado sin dar nombre ni correo. Todo el recorrido usa datos ficticios.

## Propuesta para el S5

Incorporar el cifrado del relato y la evidencia al botón de envío del S5. Para la persona denunciante, la interacción sería llenar un formulario guiado, recibir un comprobante con folio y código de seguimiento, y consultar el estado cuando quiera. Para la autoridad, sería abrir el expediente desde su bandeja y actualizar su estado. La clave, el código y el formato de intercambio se gestionan detrás de esas acciones.

El aporte aborda dos problemas concretos. Una persona puede necesitar ayuda para describir los hechos sin conocer la clasificación administrativa. A la vez, una copia de un expediente en tránsito o almacenado antes de su apertura puede contener información que la identifique. PARMEX prueba una forma de orientar la captura y reducir la exposición del contenido en ese tramo.

El taller de la PDN sobre la beta 0.9 presentó un formulario de denuncia, la incorporación de pruebas y un folio de seguimiento. Eso permite proponer un punto de integración a partir de un flujo publicado. Los contratos técnicos y permisos del entorno de pruebas quedan por confirmar con la SESNA y el equipo del S5. [Presentación del Sistema 5 por la PDN](https://www.plataformadigitalnacional.org/blog/taller-presentacion-y-funcionamiento-del-sistema-de-denuncias-publicas-de-faltas-administrativas-y-hechos-de-corrupcion-sistema-5-de-la-plataforma-digital-nacional/)

## Recorrido y accesibilidad

1. **Orientación.** Una pregunta por pantalla sobre situación, ámbito y si continúa. Las tarjetas ofrecen ejemplos y permiten elegir «No estoy seguro». Las respuestas orientan el relato. La autoridad debe determinar la competencia y la clasificación.
2. **Relato y evidencia.** La persona cuenta qué pasó con sus palabras y agrega un archivo ficticio. Puede regresar a las preguntas y conservar sus respuestas. Al elegir una imagen, la captura avisa si se quitaron metadatos y con qué nombre se enviará.
3. **Envío y comprobante.** Antes de enviar, la persona marca la casilla del aviso de privacidad. La demo descubre la clave pública, cifra y espera una confirmación. Si la autoridad aún no está lista, conserva la captura y explica cómo continuar. El comprobante sustituye al formulario: muestra el folio, el código de seguimiento, la huella de la llave con la que se cifró y un botón para enviar otra denuncia.
4. **Revisión.** La autoridad elige el expediente por folio, lee el relato como texto plano, puede descargar la evidencia y marcar el caso «En revisión».
5. **Seguimiento.** En **Consultar estado**, la persona ingresa folio y código y ve el estado general. Un código incorrecto recibe el mismo mensaje que un folio inexistente, así que la consulta no confirma si un caso existe.

La interfaz usa controles nativos, etiquetas visibles, foco visible, mensajes en español y dos columnas en pantallas anchas: el formulario a la izquierda y un panel con el resumen del envío y la prueba técnica a la derecha. En la autoridad, la bandeja y el tablero van lado a lado. El formulario ciudadano se puede recorrer por teclado. La evaluación con lectores de pantalla y personas con distintos niveles de experiencia digital queda como parte del piloto. Conviene observar si completan el recorrido sin ayuda, entienden qué hacer ante un error y pueden localizar el folio por sí mismas.

## Ejecutar en localhost

Desde la carpeta que contiene este README, con Python 3:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Abre [captura ciudadana](http://localhost:8765/) y [autoridad receptora](http://localhost:8765/autoridad.html) en dos pestañas del mismo navegador y perfil. Abre una sola pestaña de autoridad y espera el mensaje **Lista para recibir denuncias de prueba**. Usa la misma dirección en ambas pestañas. [Consulta de estado](http://localhost:8765/consulta.html) abre en una tercera pestaña cuando quieras probar el seguimiento. Usa Ctrl+C para detener el servidor. En otra terminal, ejecuta las pruebas con Node.js 24:

```powershell
node --test
```

## Guion de 90 segundos

| Tiempo | Acción |
| --- | --- |
| 0–15 s | Abre **Vista de la autoridad** en otra pestaña. Cuando esté lista, vuelve a la captura. |
| 15–40 s | Muestra las tarjetas de orientación y la opción «No estoy seguro». Pulsa **Usar un ejemplo ficticio** para llegar al relato y al archivo de prueba. |
| 40–60 s | Marca la casilla del aviso de privacidad y pulsa **Enviar denuncia**. Lee la confirmación, el folio, el código y la huella de la llave. El foco del teclado pasa al comprobante. |
| 60–75 s | Cambia a la autoridad. La denuncia ya aparece en su bandeja. Comprueba el folio, el relato, la evidencia recuperada y los conteos del tablero por ámbito. Pulsa **Marcar en revisión**. |
| 75–90 s | Abre **Consultar estado**, pega folio y código y muestra «En revisión». Cierra con la idea: seguimiento sin pedir identidad. |

Si intentas enviar antes de abrir la autoridad, la captura conserva el formulario y muestra cómo abrir la otra vista. También puedes enviar una segunda denuncia y elegir por folio cuál revisar en la bandeja. El código de seguimiento se muestra una sola vez en el comprobante: sirve para la consulta y no se puede recuperar después.

## Aporte del equipo

La maqueta del equipo aportó el formulario móvil por pasos, las opciones con ejemplos, la paleta índigo y el tablero de focos rojos. El tablero de la autoridad se alimenta de los expedientes ficticios que se abren correctamente y cuenta los casos por ámbito y los que, según la persona denunciante, siguen ocurriendo. Sus métricas son descriptivas. La estimación de incidencia y severidad, el seguimiento con contacto y la metodología para divulgar estadísticas requieren definición y validación institucional.

## Prueba técnica con archivos

Abre la sección plegable **Prueba técnica con archivos** en ambas vistas. En la autoridad, descarga la clave pública. En la captura, impórtala, coteja la huella, llena el formulario y pulsa **Descargar expediente cifrado**. En la pestaña original de autoridad, importa ese archivo y pulsa **Descifrar expediente**. Esta sección permite reproducir el intercambio manual y probar rechazos.

Para reproducir errores, prueba copias del expediente con un dígito del folio cambiado por otro hexadecimal, un carácter Base64 del inicio de `ciphertext` sustituido o el JSON truncado. También puedes abrir el expediente en una nueva pestaña de autoridad con otra clave. En la captura, selecciona un archivo ficticio de más de 1 MiB para comprobar el límite.

## Arquitectura de la demo

El servidor local sirve archivos estáticos. En el flujo automático, ambas pestañas deben usar el mismo navegador, perfil y origen.

```text
Captura ciudadana                          Autoridad receptora
                    solicita clave  ──────►
                    ◄──────  clave pública
cifra relato, respuestas y evidencia
                    expediente cifrado ────► valida y descifra
                    ◄──────  confirmación   registra en bandeja temporal
muestra el folio
```

| Archivo | Responsabilidad |
| --- | --- |
| `index.html`, `autoridad.html`, `consulta.html`, `styles.css` | Captura por pasos, bandeja receptora, tablero por ámbito y consulta de estado |
| `app.mjs` | Validación de captura, estados de interfaz, comprobante, seguimiento y revisión |
| `consulta.mjs` | Formulario de consulta y presentación del estado |
| `metadata.mjs` | Limpieza de metadatos y renombrado de la evidencia |
| `storage.mjs` | Persistencia en IndexedDB de la llave y de los paquetes cifrados |
| `channel.mjs` | Descubrimiento de la autoridad, envío local, espera de confirmación y consulta de estado |
| `crypto.mjs` | Generación y validación de claves, cifrado, formato, apertura y verificador del código |
| `crypto.test.mjs`, `metadata.test.mjs` | Pruebas automatizadas de la criptografía y de la limpieza de metadatos |

Cada envío crea una clave AES para el expediente y la protege con la clave pública receptora. La autoridad confirma después de validar y descifrar. Ante una confirmación perdida, la demo reintenta el mismo expediente y la bandeja evita duplicados por folio. La confirmación local indica que la pestaña receptora pudo abrirlo. En un piloto institucional, el comprobante debe corresponder a un registro persistido y recuperable.

## Formato del prototipo

El JSON de clave pública contiene `version: 1` y `spki` (DER SPKI en Base64). La huella es el SHA-256 hexadecimal de los bytes SPKI. El expediente JSON v1 tiene un límite de 2 MiB y exactamente estos campos:

| Campo | Representación |
| --- | --- |
| `version` | Entero `1` |
| `folio` | 16 bytes aleatorios en hexadecimal minúsculo |
| `keyId` | Huella SHA-256 de la clave receptora, en hexadecimal minúsculo |
| `nonce` | 12 bytes aleatorios en Base64 |
| `wrappedKey` | Clave AES de 256 bits del expediente, protegida con RSA-OAEP de 3072 bits y SHA-256, en Base64 |
| `ciphertext` | Contenido AES-GCM seguido de la etiqueta de 128 bits, en Base64 |

El AAD es el UTF-8 de `JSON.stringify([version, folio, keyId])`. El contenido cifrado es un solo JSON UTF-8 con `answers` (situación, ámbito y continuidad), `story`, `name`, `attachment` (bytes en Base64, hasta 1 MiB antes de codificar) y `code` (el código de seguimiento de 10 caracteres). El archivo descargado se llama `parmex-<folio>.json`.

## Seguimiento por folio y código

Al confirmar la recepción, la captura muestra un folio de 32 hex y un código de 10 caracteres de un alfabeto sin `I`, `O`, `0` ni `1`. El código viaja **dentro** del sobre cifrado: no aparece en el paquete descargable, ni en la bandeja, ni en los mensajes del canal.

La autoridad no guarda el código. Al abrir el expediente deriva `PBKDF2-SHA256(código, sal = folio, 210 000 iteraciones)` y conserva solo ese verificador de 32 bytes junto con el estado del caso. En la consulta recalcula el verificador y lo compara en tiempo constante. Un folio inexistente y un código incorrecto producen exactamente el mismo mensaje, de modo que la consulta no confirma la existencia de un caso.

Argon2id sería preferible en producción, pero WebCrypto no lo incluye y añadirlo exige una dependencia WASM. PBKDF2 con 210 000 iteraciones es nativo, funciona en cualquier navegador actual y basta para un código de 50 bits en esta demo.

La consulta devuelve solo `Recibida` o `En revisión`. La autoridad cambia el estado desde el expediente; la persona lo ve al volver a consultar. La respuesta nunca incluye el relato, la evidencia ni los datos de la persona.

## Limpieza de metadatos

Antes de cifrar, la captura revisa el adjunto por su firma binaria, no por la extensión. Si es una imagen, quita los metadatos sin recomprimir y renombra el archivo a `evidencia-1.<ext>` para que el nombre tampoco identifique.

| Formato | Qué se quita | Cómo |
| --- | --- | --- |
| JPEG | APP1 (EXIF y XMP), APP13 (IPTC), APP12 y comentarios `COM`; con ellos se van GPS, fecha, cámara y miniaturas | Se recorren los segmentos y se conservan solo los que no son metadatos. Los píxeles no se recomprimen |
| PNG | `tEXt`, `zTXt`, `iTXt`, `tIME` y `eXIf` | Se quitan los chunks completos; cada chunk conserva su propio CRC |
| WebP | chunks `EXIF` y `XMP ` | Se quitan y se recalcula el tamaño del contenedor RIFF |

La interfaz avisa antes de enviar: «Metadatos eliminados», «La imagen no contenía metadatos» o, para PDF, Office y otros formatos, «Este formato no permite limpiar metadatos en el navegador». El comprobante repite el resultado junto con el nombre con el que viajó el archivo.

La limpieza es real y verificable: con un JPEG de prueba con GPS, el archivo pasó de 1276 a 1054 bytes, la etiqueta GPS desapareció por completo y los píxeles decodificados quedaron idénticos. Un PDF, un DOCX o un ZIP pueden contener datos ocultos que el navegador no puede revisar; para esos casos la ruta de producción es un servicio con ExifTool y validación del lado del servidor.

## Persistencia de la demo

La bandeja y la llave sobreviven a una recarga. En IndexedDB se guardan dos cosas: el par de llaves, como objeto `CryptoKey` que sigue siendo no exportable, y cada paquete cifrado tal como llegó. Al abrir la pestaña, la demo recupera la llave, vuelve a descifrar cada paquete y reconstruye la bandeja y el verificador del código.

Nunca se guarda texto plano ni el código de seguimiento. Si un paquete no se puede abrir —por ejemplo, porque quedó cifrado para otra llave— se omite en lugar de romper la bandeja.

Dos controles acompañan la demostración: **Cargar expedientes de ejemplo** cuando la bandeja está vacía, y **Vaciar la bandeja** para empezar limpio sin perder la llave.

El costo es de seguridad y conviene decirlo: cualquiera con acceso a este perfil del navegador y a esta dirección podría abrir los expedientes guardados. Es una decisión de demo; en producción la llave viviría en el servidor institucional.

## Alcance de la protección

La extracción de una copia del expediente cifrado deja visibles el folio, la huella, la versión y el tamaño aproximado del contenido. El relato, las respuestas y el adjunto requieren la clave privada receptora para abrirse. AES-GCM verifica la integridad del contenido y los campos autenticados. Cualquiera que tenga la clave pública puede crear un expediente, por lo que este mecanismo no acredita identidad ni procedencia.

El envío automático usa BroadcastChannel entre pestañas del mismo origen y perfil. El canal intercambia la clave pública, el expediente cifrado, la confirmación después de descifrarlo y la consulta de estado por folio y código. La bandeja persiste en IndexedDB: los paquetes cifrados y la llave privada sobreviven a una recarga y se vuelven a descifrar al abrir la pestaña. El canal local sirve para demostrar el flujo y confía en los scripts del mismo origen. En producción, la recepción, la confirmación y la consulta corresponderían al servicio institucional.

La protección depende del código entregado al navegador, del dispositivo de captura, de que la clave pública corresponda a la autoridad y del control del dispositivo receptor y sus descargas. Un dispositivo o código comprometido puede leer datos mientras están en claro. La llave privada de la demo es no exportable y se guarda en IndexedDB para sobrevivir a una recarga; cualquiera con acceso a este perfil y a esta dirección podría abrir los expedientes guardados. La limpieza cubre imágenes JPEG, PNG y WebP; no cubre PDF, Office ni archivos comprimidos, y la interfaz lo advierte antes de enviar.

## Relación e integración con S5

PARMEX aborda la confidencialidad en captura y recepción, aporta una forma de orientar el relato y permite consultar el estado con folio y código sin pedir identidad. El eje obligatorio de la convocatoria abarca también anonimato pleno, trámite y canalización institucional. La demo cubre captura, entrega local y seguimiento de expedientes ficticios; la protección integral del proceso sigue siendo trabajo de integración. [Bases oficiales, cláusula quinta](https://dataton2026.plataformadigitalnacional.org/bases/)

El punto propuesto de cifrado es el navegador de la persona denunciante, inmediatamente antes de construir y enviar la solicitud de registro del S5. La clave privada se custodiaría en infraestructura institucional bajo control de la autoridad receptora, con acceso restringido para descifrar el expediente dentro de su entorno de gestión. La clave pública requeriría publicación y verificación por un mecanismo institucional, con reglas para rotación, revocación y disponibilidad de claves para expedientes previos.

Con el equipo responsable queda por confirmar el punto exacto de envío, endpoint, permisos, esquema y límites de adjuntos, autenticidad y custodia de claves, y cómo canalizar a la autoridad correcta antes de cifrar o cuando cambie la competencia. El JSON de esta demo es un formato propio. El comprobante local muestra el folio y el código. En S5, el servicio de seguimiento tendría que asociar el folio institucional con el código secreto, validarlos juntos y devolver solo un estado general sin exponer identidad ni contenido. La demo ya implementa esa validación conjunta con PBKDF2; en producción deben acordarse la generación y entrega del código, el vínculo con el folio, los límites de intentos y la interfaz de consulta.

## Ruta para un piloto institucional

El primer objetivo propuesto es completar una denuncia ficticia en el entorno de pruebas del S5, emitir un comprobante tras el registro y recuperar la evidencia exacta desde un puesto receptor autorizado.

| Paso | Qué debe acordarse | Resultado verificable |
| --- | --- | --- |
| 1. Identificar el punto de integración | Localizar el formulario, el servicio de registro y la bandeja en el entorno de pruebas. Confirmar permisos, formatos, tamaño y tipos de evidencia. | Un expediente ficticio recorre el entorno de pruebas con un contrato documentado. |
| 2. Definir la canalización | Acordar qué datos mínimos necesita el S5 antes del cifrado y qué sucede si la competencia es incierta. Para una reasignación, definir quién puede transferir acceso al expediente y cómo queda auditado. | Un caso con competencia clara y uno con «No estoy seguro» llegan a una ruta autorizada. |
| 3. Autenticar y custodiar claves | Acordar cómo se publica y verifica la clave pública, dónde se custodia la privada, quién puede usarla y cómo se resuelven rotación, revocación y recuperación. | El puesto autorizado abre los casos asignados, incluidos los cifrados con una clave anterior que deba seguir disponible. |
| 4. Registrar y confirmar | Sustituir el canal entre pestañas por el servicio institucional. Acordar el identificador para reintentos y el momento en que el S5 emite el folio. | Una interrupción seguida de un reintento permite recuperar el mismo registro sin duplicar la denuncia. |
| 5. Revisar y dar seguimiento | Abrir expedientes con control de acceso. Acordar la validación conjunta de folio y código secreto, los intentos permitidos y el estado general que puede ver la ciudadanía. | El folio y el código válidos muestran el estado autorizado. Un código incorrecto no permite conocer el estado ni confirmar la existencia del caso. |

Para el piloto también hace falta definir qué pueden registrar los sistemas de auditoría sin copiar relato, adjuntos, códigos secretos ni claves a logs. Hay que probar el tratamiento de metadatos y evidencias en los dispositivos de captura y recepción, junto con la retención y el acceso a las copias descifradas.

### Del tablero interno a estadísticas publicables

El tablero actual describe los expedientes ficticios abiertos en la bandeja. Una distribución por ámbito cuenta denuncias recibidas y puede reflejar diferencias de acceso o de propensión a denunciar. Para estimar incidencia o severidad, el equipo tendría que definir el indicador, su denominador, el periodo y el uso previsto. Para publicar agregados, debe evaluar la posibilidad de identificar casos por grupos pequeños o cruces entre tablas y acordar reglas de divulgación. Un umbral de tamaño de grupo, por sí solo, no establece privacidad diferencial.

## Evidencia de funcionamiento

- **Veintiuna pruebas automatizadas con Node.js 24.** Doce cubren la huella y la clave privada no exportable, la recuperación exacta, el contenido del JSON, una clave incorrecta, alteraciones del cifrado y de los datos autenticados, validación del formato y tamaño, aleatoriedad entre expedientes, el alfabeto y la unicidad del código, el verificador PBKDF2 y la comparación en tiempo constante. Nueve cubren la limpieza de metadatos: detección por firma, segmentos de JPEG, chunks de PNG y WebP, archivos truncados, formatos no soportados y renombrado.
- **Prueba en Chrome con dos pestañas y localhost.** Se verificó el formulario por pasos, la conservación de respuestas, el comprobante con foco, el folio y el código, la recepción sin intercambio manual y la descarga exacta de la evidencia: 16 comprobaciones de regresión, 14 de persistencia y 10 de la limpieza con archivos reales.
- **Comprobación del seguimiento.** Con un código correcto la consulta muestra el estado; con un código incorrecto y con un folio inexistente el mensaje es el mismo; al marcar «En revisión» la consulta lo refleja; sin la pestaña de autoridad, la consulta explica qué hacer.
- **Comprobación de los metadatos.** Un JPEG con GPS y fecha se envió desde la captura: la interfaz avisó de la limpieza, la autoridad recibió `evidencia-1.jpg` y el archivo descargado ya no contenía EXIF ni GPS. Un PDF recibió el aviso de que no se puede limpiar y viajó como `evidencia-1.pdf`. El archivo de prueba está en `pruebas/evidencia-con-gps.jpg`.
- **Comprobación de la persistencia.** Catorce comprobaciones: enviar, recargar la pestaña de autoridad y encontrar el expediente, el relato y la consulta funcionando con el verificador recalculado; el estado «En revisión» sobrevive a otra recarga; vaciar deja la bandeja limpia; cargar ejemplos genera dos casos que también sobreviven.
- **Comprobación del tablero.** Con dos denuncias ficticias del mismo ámbito y una marcada como aún en curso, se verificó que mostrara dos recibidas, dos en ese ámbito y una en curso.
- **Demostración animada.** `PARMEX_demo.gif` recorre en veinte segundos el recorrido completo: la persona describe el caso, adjunta evidencia, acepta el aviso, envía, recibe el comprobante, la autoridad marca el caso en revisión y la consulta muestra «En revisión». Cada cuadro lleva una franja con la etapa.
- **Prueba manual reproducible.** La sección técnica permite ensayar paquetes malformados, alterados, incompatibles, demasiado grandes o destinados a otra clave.

## Créditos

La propuesta visual y de orientación parte de la maqueta del equipo PARMEX. Se usó Codex como apoyo para desarrollar y verificar el prototipo y redactar esta documentación. El manual de usuario de la demostración está en `PARMEX_Manual_de_Usuario.docx` y se regenera con `crear_manual.py`.
