"""Genera la propuesta corregida de PARMEX en DOCX."""

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

FUENTE = "Segoe UI"
TINTA = RGBColor(0x1E, 0x1E, 0x3F)
GRIS = RGBColor(0x5B, 0x64, 0x7B)
INDIGO = RGBColor(0x31, 0x2E, 0x81)
INDIGO_CLARO = RGBColor(0x43, 0x38, 0xCA)
FONDO_TABLA = "EEF1FB"


def set_cell_background(cell, color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tc_pr.append(shd)


def set_cell_padding(cell, top=70, bottom=70, left=110, right=110):
    tc_pr = cell._tc.get_or_add_tcPr()
    marcas = OxmlElement("w:tcMar")
    for lado, valor in (("top", top), ("bottom", bottom), ("start", left), ("end", right)):
        nodo = OxmlElement(f"w:{lado}")
        nodo.set(qn("w:w"), str(valor))
        nodo.set(qn("w:type"), "dxa")
        marcas.append(nodo)
    tc_pr.append(marcas)


def rule(paragraph, color="4338CA", size=12):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "6")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


def tabla(cabeceras, filas, anchos):
    table = document.add_table(rows=1, cols=len(cabeceras))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = False
    for index, texto in enumerate(cabeceras):
        cell = table.rows[0].cells[index]
        cell.width = Cm(anchos[index])
        set_cell_background(cell, FONDO_TABLA)
        set_cell_padding(cell)
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(texto)
        run.font.bold = True
        run.font.size = Pt(9)
        run.font.name = FUENTE
    for fila in filas:
        cells = table.add_row().cells
        for index, texto in enumerate(fila):
            cells[index].width = Cm(anchos[index])
            set_cell_padding(cells[index])
            paragraph = cells[index].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            run = paragraph.add_run(texto)
            run.font.size = Pt(9)
            run.font.name = FUENTE
            run.font.color.rgb = TINTA
    return table


document = Document()
document.core_properties.title = "PARMEX · Propuesta"
document.core_properties.subject = "Datatón Anticorrupción 2026"
document.core_properties.author = "Equipo PARMEX"

section = document.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.3)
section.bottom_margin = Cm(2.1)
section.left_margin = Cm(2.5)
section.right_margin = Cm(2.5)

normal = document.styles["Normal"]
normal.font.name = FUENTE
normal.font.size = Pt(10.5)
normal.font.color.rgb = TINTA
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.16

for name, size, color, before, after in (
    ("Heading 1", 15, TINTA, 18, 8),
    ("Heading 2", 11.5, INDIGO, 12, 4),
):
    style = document.styles[name]
    style.font.name = FUENTE
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = color
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

# --- Portada corta ---------------------------------------------------------
marca = document.add_paragraph()
marca.paragraph_format.space_before = Pt(10)
marca.paragraph_format.space_after = Pt(2)
run = marca.add_run("PARMEX")
run.font.name = FUENTE
run.font.size = Pt(30)
run.font.bold = True
run.font.color.rgb = INDIGO

linea = document.add_paragraph()
rule(linea)
linea.paragraph_format.space_after = Pt(10)

titulo = document.add_paragraph()
run = titulo.add_run("Portal de Denuncia Anónima e Inteligencia Cívica")
run.font.name = FUENTE
run.font.size = Pt(17)
run.font.color.rgb = TINTA

sub = document.add_paragraph()
run = sub.add_run("Propuesta para el Datatón Anticorrupción 2026 · Sistema 5 de la Plataforma Digital Nacional")
run.font.name = FUENTE
run.font.size = Pt(10.5)
run.font.color.rgb = GRIS
sub.paragraph_format.space_after = Pt(4)

version = document.add_paragraph()
run = version.add_run("Versión 2 · 12 de noviembre de 2026")
run.font.name = FUENTE
run.font.size = Pt(9)
run.font.color.rgb = GRIS

# --- Objetivo --------------------------------------------------------------
document.add_heading("Objetivo del proyecto", level=1)
document.add_paragraph(
    "Desarrollar un portal de denuncia anónima e inteligencia cívica que facilite a la ciudadanía reportar faltas "
    "administrativas y hechos de corrupción, y que se proponga como interfaz complementaria del Sistema 5 (S5) de la "
    "Plataforma Digital Nacional."
)
document.add_paragraph(
    "La prueba de concepto ya funciona en local: cifra el expediente en el navegador, lo entrega a una autoridad "
    "simulada y permite consultar el estado con un folio y un código. La integración con el S5 es una propuesta que "
    "requiere autorización, documentación técnica y acceso institucional."
)

# --- Problema --------------------------------------------------------------
document.add_heading("Problema que resuelve", level=1)
document.add_paragraph(
    "Ataca dos obstáculos concretos del combate a la corrupción: la falta de denuncias por miedo a represalias y la "
    "dificultad de las autoridades para trabajar con reportes poco estructurados."
)
document.add_paragraph(
    "El temor no desaparece por pedir una denuncia: un relato, una fotografía o un PDF pueden identificar a quien "
    "reporta por su contenido, el nombre del archivo o sus metadatos. Y un reporte sin estructura obliga a la autoridad "
    "a reconstruir lo esencial antes de poder canalizarlo."
)

# --- Innovaciones ----------------------------------------------------------
document.add_heading("Innovaciones clave", level=1)

document.add_heading("Asistente de orientación de tres preguntas", level=2)
document.add_paragraph(
    "Un asistente breve, con ejemplos y la opción «No estoy seguro», ayuda a describir la situación, el ámbito de "
    "gobierno y si el hecho continúa. Su función es orientar el relato y ordenar la información, no calificar la "
    "denuncia ni descartar casos: la competencia y la clasificación corresponden a la autoridad."
)

document.add_heading("Escudo criptográfico: cifrado en el origen", level=2)
document.add_paragraph(
    "El navegador cifra las respuestas, el relato y la evidencia antes de enviarlos. Cada expediente usa una clave "
    "AES-256-GCM que se envuelve con la llave pública RSA-OAEP de 3072 bits de la autoridad. El contenido viaja y se "
    "almacena cifrado; solo la llave privada de la autoridad puede abrirlo."
)

document.add_heading("Folio y código de seguimiento", level=2)
document.add_paragraph(
    "Al confirmarse la recepción, la persona recibe un folio aleatorio de 32 caracteres y un código de 10 caracteres "
    "que se muestra una sola vez. La autoridad no guarda el código: guarda un verificador PBKDF2-SHA256 derivado del "
    "código con el folio como sal. La consulta devuelve únicamente el estado del caso."
)
document.add_paragraph(
    "Nota técnica: Argon2 no cifra, es una función de derivación. La demo usa PBKDF2 porque la Web Crypto API no "
    "incluye Argon2; en producción se recomienda Argon2id con parámetros acordados con la autoridad."
)

document.add_heading("Higiene digital: limpieza de metadatos", level=2)
document.add_paragraph(
    "Antes de cifrar, el navegador revisa el adjunto por su firma binaria y, si es una imagen, elimina los metadatos "
    "sin recomprimir: en JPEG quita EXIF, XMP, IPTC, GPS y comentarios; en PNG y WebP, los bloques de texto y fecha. "
    "El archivo se renombra a «evidencia-1» para que su nombre tampoco identifique. En PDF y documentos de Office la "
    "limpieza no es posible en el navegador y la interfaz lo advierte antes de enviar."
)

document.add_heading("Focos rojos con agregación protegida", level=2)
document.add_paragraph(
    "El tablero cuenta las denuncias recibidas, los casos que siguen ocurriendo y su distribución por ámbito. Son "
    "conteos descriptivos de la bandeja, no estimaciones de incidencia ni acusaciones. Para publicar agregados se "
    "aplica supresión de celdas con umbral mínimo (n ≥ 5) y no se difunde ningún corte que permita identificar un caso."
)
document.add_paragraph(
    "Precisión técnica: el k-anonimato aplica a registros con cuasi-identificadores, no a conteos agregados. Para un "
    "tablero público, la herramienta correcta es el umbral de supresión, complementado con reglas de divulgación."
)

# --- Stack -----------------------------------------------------------------
document.add_heading("Stack tecnológico", level=1)
document.add_heading("Lo construido", level=2)
tabla(
    ["Capa", "Tecnología"],
    [
        ("Interfaz", "HTML, CSS y JavaScript sin dependencias"),
        ("Criptografía", "Web Crypto API: AES-256-GCM, RSA-OAEP 3072, PBKDF2-SHA256"),
        ("Persistencia local", "IndexedDB (llave no exportable y paquetes cifrados)"),
        ("Metadatos", "Limpieza binaria en el navegador, sin recomprimir"),
        ("Pruebas", "Node.js 24: 21 pruebas automatizadas"),
    ],
    [5, 11],
)

document.add_heading("Ruta de producción", level=2).paragraph_format.page_break_before = True
document.add_paragraph(
    "Nada de esto se construyó en la demo y no debería presentarse como hecho. Es lo que haría falta para un piloto "
    "institucional, y su definición corresponde a la SESNA y al equipo del S5."
)
tabla(
    ["Pieza", "Qué requiere"],
    [
        ("Servicio de registro", "Backend institucional con el punto de integración acordado con el S5"),
        ("Base de datos", "PostgreSQL con cifrado en reposo y control de acceso por roles"),
        ("Custodia de llaves", "HSM o KMS institucional, con rotación, revocación y respaldo"),
        ("Código de seguimiento", "Argon2id y límites de intentos en el servidor"),
        ("Metadatos", "ExifTool en servidor para PDF y documentos de Office"),
        ("Auditoría", "Registro de accesos sin copiar relato, adjuntos ni códigos"),
    ],
    [5, 11],
)

# --- Qué sigue -------------------------------------------------------------
document.add_heading("Qué sigue", level=1)
document.add_paragraph(
    "El primer objetivo es completar una denuncia ficticia en el entorno de pruebas del S5, emitir un comprobante tras "
    "el registro y recuperar la evidencia exacta desde un puesto receptor autorizado. Para eso hay que acordar el "
    "endpoint, los permisos, el formato de intercambio, la canalización a la autoridad competente y la custodia de "
    "llaves."
)
document.add_paragraph(
    "PARMEX no busca reemplazar el S5 ni sustituir las facultades de investigación de las autoridades: busca facilitar "
    "el acceso ciudadano al mecanismo de denuncia y proteger la información en el tramo que hoy queda expuesto."
)

document.save(r"D:\Anto\PARMEX\PARMEX_Propuesta_v2.docx")
print("propuesta creada")
