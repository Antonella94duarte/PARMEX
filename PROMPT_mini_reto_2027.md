# Prompt para el nuevo chat — mini reto de la mentoría CGR

Copia el bloque de abajo en un chat nuevo, con el workspace `D:\Anto\PARMEX` abierto.

---

```text
Soy Antonella, integrante del equipo PARMEX. Venimos del Datatón Anticorrupción
2026, donde presentamos una prueba de concepto de denuncia anónima. Ahora tengo
que planificar el mini reto de la Mentoría de Integridad e Innovación
Anticorrupción de la CGR de Paraguay (2027) y quiero que me ayudes a diseñarlo.

Antes de proponer nada, lee en este workspace: README.md,
PLAN_CIERRE_PARMEX_12NOV.md y PARMEX_Propuesta_v2.docx (o el PDF).

## Lo que ya existe (no lo inventes, está construido)
Prototipo funcional, sin backend, que corre en el navegador:
- Formulario guiado de tres preguntas, relato y evidencia.
- Cifrado en el origen: AES-256-GCM por expediente, clave envuelta con
  RSA-OAEP de 3072 bits. Web Crypto, cero dependencias.
- Folio + código de seguimiento: la autoridad guarda solo un verificador
  PBKDF2; la consulta devuelve "Recibida" o "En revisión" y no revela si un
  caso existe.
- Limpieza de metadatos en imágenes (JPEG, PNG, WebP) sin recomprimir, con
  aviso explícito para PDF y Office.
- Persistencia local en IndexedDB: sobrevive a recargar la pestaña.
- Vista de autoridad con bandeja, cambio de estado y tablero descriptivo.
- Documentos: propuesta v2, justificación, marco jurídico mexicano, manual de
  usuario y un GIF de demostración.

## El mini reto (lo que dice la convocatoria)
- Forma parte de la mentoría de la CGR de Paraguay, no del Datatón.
- Se trabaja en duplas.
- Hay que diseñar una propuesta, construir un prototipo y presentarla ante un
  jurado con un pitch.
- La dupla ganadora desarrolla el proyecto en la CGR junto con la Dirección
  General de Tecnologías de la Comunicación, y presenta la experiencia en la
  Semana Regional de Integridad Empresarial en México (2027).

## Lo que no sé: trátalo como supuesto explícito
- Duración del pitch y criterios de evaluación.
- Si el prototipo debe ser funcional o puede ser una maqueta.
- Si la dupla es la misma del Datatón o se recompone.
- Fechas exactas de la mentoría y del mini reto.

## Advertencia importante
PARMEX está anclado al Sistema 5 de México y a la LGRA y el Código Penal
Federal mexicanos. Para Paraguay eso no aplica: hay que rehacer el anclaje
institucional (CGR, normativa paraguaya de acceso a la información pública y de
contrataciones, canales de denuncia ya existentes). No cites normas paraguayas
sin marcarlas como "por verificar": prefiero una lista de normas a investigar
antes que una cita inventada.

## Lo que quiero que produzcas
1. Un plan del mini reto con fases, hitos y fechas relativas (semana 0 = hoy),
   pensado para dos personas con tiempo parcial.
2. El alcance del prototipo: qué se reutiliza tal cual, qué se adapta al
   contexto paraguayo y qué se descarta. Criterio: "demo que corre en vivo"
   por encima de "producto completo".
3. Un guion de pitch (estructura, tiempos, qué se muestra en pantalla y
   cuándo) y un guion de demo de 90 segundos.
4. La lista de documentos a producir y quién los escribe dentro de la dupla.
5. Los riesgos y las diez preguntas más probables del jurado, con una respuesta
   breve para cada una.

## Reglas
- Prioriza lo verificable: si no se puede demostrar en vivo, no va al pitch.
- Nada de prometer backend, base de datos o integración institucional que no
  existan.
- Español claro, sin jerga innecesaria.
- Empieza con un resumen de cinco líneas y luego el plan. Si algo es ambiguo,
  dilo antes de asumirlo.
```

---

## Dos notas para cuando lo uses

**La fecha del mini reto no es la del Datatón.** La entrega del 17 de noviembre
es del Datatón; la mentoría y su mini reto son de 2027. No mezcles los dos
calendarios en el plan que te devuelva el chat.

**El prototipo ya existe.** El riesgo del mini reto no es construir: es
re-anclar un proyecto mexicano al contexto paraguayo sin que parezca un injerto.
Si el chat empieza proponiendo "hagamos una app desde cero", corrígelo.
