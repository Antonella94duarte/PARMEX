"""Actualiza las frases de la justificación que quedaron desfasadas."""

import shutil
from pathlib import Path

import docx

ORIGEN = Path(r"D:\Anto\PARMEX\PARMEX_Justificacion_Dataton_2026.docx")
RESPALDO = Path(r"D:\Anto\PARMEX\respaldo")
RESPALDO.mkdir(exist_ok=True)
shutil.copy2(ORIGEN, RESPALDO / "PARMEX_Justificacion_Dataton_2026_original.docx")

CAMBIOS = [
    (
        "El seguimiento institucional por folio forma parte de la integración propuesta con el S5.",
        "El seguimiento por folio y código ya funciona en la demo; conectar ese folio con el servicio del S5 "
        "forma parte de la integración propuesta."
    ),
    (
        "La limpieza de metadatos y la revisión de datos que puedan identificar a la persona en su relato "
        "quedan pendientes de validación.",
        "La limpieza de metadatos de imágenes JPEG, PNG y WebP se aplica antes de cifrar; los PDF y los documentos "
        "de Office no se pueden limpiar en el navegador y la interfaz lo advierte. La revisión de datos que puedan "
        "identificar a la persona en su propio relato sigue dependiendo de ella."
    ),
    (
        "El folio acredita la recepción dentro de la demo. El seguimiento institucional requiere conectar ese folio "
        "con el servicio del S5.",
        "El folio y el código acreditan la recepción dentro de la demo y permiten consultar el estado sin pedir "
        "identidad. El seguimiento institucional requiere conectar ese folio con el servicio del S5."
    )
]

documento = docx.Document(ORIGEN)
aplicados = []

for antiguo, nuevo in CAMBIOS:
    hecho = False
    for parrafo in documento.paragraphs:
        if antiguo not in parrafo.text:
            continue
        for run in parrafo.runs:
            if antiguo in run.text:
                run.text = run.text.replace(antiguo, nuevo)
                hecho = True
                break
        if not hecho and antiguo in parrafo.text:
            parrafo.text = parrafo.text.replace(antiguo, nuevo)
            hecho = True
        if hecho:
            aplicados.append((antiguo[:45], len(parrafo.runs)))
            break

documento.save(ORIGEN)
print("cambios aplicados:", len(aplicados), "de", len(CAMBIOS))
for texto, runs in aplicados:
    print("  ·", texto, "| runs resultantes:", runs)
print("respaldo en:", RESPALDO / "PARMEX_Justificacion_Dataton_2026_original.docx")
