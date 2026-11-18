"""Genera el manual de usuario de PARMEX en DOCX."""

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

FUENTE = "Segoe UI"
INDIGO = RGBColor(0x31, 0x2E, 0x81)
INDIGO_CLARO = RGBColor(0x43, 0x38, 0xCA)
TINTA = RGBColor(0x1E, 0x1E, 0x3F)
GRIS = RGBColor(0x5B, 0x64, 0x7B)
GRIS_CLARO = RGBColor(0x94, 0x9C, 0xB0)
FONDO_TABLA = "EEF1FB"
FONDO_AVISO = "F4F1DE"


def set_cell_background(cell, color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tc_pr.append(shd)


def set_cell_padding(cell, top=60, bottom=60, left=110, right=110):
    tc_pr = cell._tc.get_or_add_tcPr()
    marcas = OxmlElement("w:tcMar")
    for lado, valor in (("top", top), ("bottom", bottom), ("start", left), ("end", right)):
        nodo = OxmlElement(f"w:{lado}")
        nodo.set(qn("w:w"), str(valor))
        nodo.set(qn("w:type"), "dxa")
        marcas.append(nodo)
    tc_pr.append(marcas)


def rule(paragraph, color="D6DBF5", size=6):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "6")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


def add_field(paragraph, instruction, placeholder="1"):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    run._r.append(begin)
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {instruction} "
    run2 = paragraph.add_run()
    run2._r.append(instr)
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    run3 = paragraph.add_run()
    run3._r.append(separate)
    text = OxmlElement("w:t")
    text.text = placeholder
    run4 = paragraph.add_run()
    run4._r.append(text)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run5 = paragraph.add_run()
    run5._r.append(end)


def shade_paragraph(paragraph, color):
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    p_pr.append(shd)


document = Document()

# --- Propiedades -----------------------------------------------------------
document.core_properties.title = "PARMEX · Manual de usuario"
document.core_properties.subject = "Demostración del Sistema de Denuncias Públicas (S5)"
document.core_properties.author = "Equipo PARMEX"
document.core_properties.keywords = "denuncia, cifrado, metadatos, S5, Datatón"

# --- Página ----------------------------------------------------------------
section = document.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.4)
section.bottom_margin = Cm(2.2)
section.left_margin = Cm(2.6)
section.right_margin = Cm(2.6)
section.header_distance = Cm(1.2)
section.footer_distance = Cm(1.1)

# --- Estilos ---------------------------------------------------------------
styles = document.styles
normal = styles["Normal"]
normal.font.name = FUENTE
normal.font.size = Pt(10.5)
normal.font.color.rgb = TINTA
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.18

for name, size, color, before, after in (
    ("Heading 1", 18, TINTA, 22, 10),
    ("Heading 2", 13, INDIGO, 16, 6),
    ("Heading 3", 11, INDIGO_CLARO, 12, 4),
):
    style = styles[name]
    style.font.name = FUENTE
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = color
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

for name in ("List Bullet", "List Number"):
    style = styles[name]
    style.font.name = FUENTE
    style.font.size = Pt(10.5)
    style.paragraph_format.space_after = Pt(3)

caption = styles.add_style("Figura", 1)
caption.font.name = FUENTE
caption.font.size = Pt(8.5)
caption.font.italic = True
caption.font.color.rgb = GRIS
caption.paragraph_format.space_after = Pt(14)
caption.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

small = styles.add_style("Nota", 1)
small.font.name = FUENTE
small.font.size = Pt(9.5)
small.font.color.rgb = GRIS
small.paragraph_format.space_after = Pt(10)

# --- Encabezado y pie ------------------------------------------------------
header = section.header
header_paragraph = header.paragraphs[0]
header_paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
header_run = header_paragraph.add_run("PARMEX · Manual de usuario")
header_run.font.name = FUENTE
header_run.font.size = Pt(8)
header_run.font.color.rgb = GRIS_CLARO

footer = section.footer
footer_paragraph = footer.paragraphs[0]
footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer_run = footer_paragraph.add_run("Página ")
footer_run.font.name = FUENTE
footer_run.font.size = Pt(8)
footer_run.font.color.rgb = GRIS_CLARO
add_field(footer_paragraph, "PAGE")
middle = footer_paragraph.add_run(" de ")
middle.font.name = FUENTE
middle.font.size = Pt(8)
middle.font.color.rgb = GRIS_CLARO
add_field(footer_paragraph, "NUMPAGES", "1")
for run in footer_paragraph.runs:
    run.font.name = FUENTE
    run.font.size = Pt(8)
    run.font.color.rgb = GRIS_CLARO


def figura(ruta, texto, ancho=16):
    from PIL import Image

    ancho_px, alto_px = Image.open(ruta).size
    escala = min(16.0 / ancho_px, 12.4 / alto_px)
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.add_run().add_picture(ruta, width=Cm(ancho_px * escala))
    legend = document.add_paragraph(texto, style="Figura")
    return legend


def aviso(titulo, texto):
    paragraph = document.add_paragraph()
    shade_paragraph(paragraph, FONDO_AVISO)
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(8)
    paragraph.paragraph_format.left_indent = Cm(0.2)
    run = paragraph.add_run(titulo + " ")
    run.font.bold = True
    run.font.size = Pt(9.5)
    run.font.name = FUENTE
    run.font.color.rgb = RGBColor(0x52, 0x3C, 0x14)
    second = paragraph.add_run(texto)
    second.font.size = Pt(9.5)
    second.font.name = FUENTE
    second.font.color.rgb = RGBColor(0x52, 0x3C, 0x14)


def lista_numerada(items):
    for indice, texto in enumerate(items, start=1):
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.left_indent = Cm(0.8)
        paragraph.paragraph_format.first_line_indent = Cm(-0.8)
        paragraph.paragraph_format.space_after = Pt(3)
        numero = paragraph.add_run(f"{indice}.  ")
        numero.font.name = FUENTE
        numero.font.size = Pt(10.5)
        numero.font.bold = True
        numero.font.color.rgb = INDIGO
        cuerpo = paragraph.add_run(texto)
        cuerpo.font.name = FUENTE
        cuerpo.font.size = Pt(10.5)


def consola(lineas):
    paragraph = document.add_paragraph()
    shade_paragraph(paragraph, "1B1B2F")
    paragraph.paragraph_format.left_indent = Cm(0.2)
    paragraph.paragraph_format.space_before = Pt(4)
    paragraph.paragraph_format.space_after = Pt(10)
    for indice, linea in enumerate(lineas):
        if indice:
            paragraph.add_run().add_break()
        run = paragraph.add_run(linea)
        run.font.name = "Consolas"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0xC7, 0xD2, 0xFE) if indice == 0 else RGBColor(0xA7, 0xF3, 0xD0)
    return paragraph


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
        run.font.color.rgb = TINTA
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


# ===========================================================================
# PORTADA
# ===========================================================================
logo = document.add_paragraph()
logo.paragraph_format.space_before = Pt(90)
logo.paragraph_format.space_after = Pt(4)
logo_run = logo.add_run("PARMEX")
logo_run.font.name = FUENTE
logo_run.font.size = Pt(40)
logo_run.font.bold = True
logo_run.font.color.rgb = INDIGO

line = document.add_paragraph()
rule(line, color="4338CA", size=18)
line.paragraph_format.space_after = Pt(18)

title = document.add_paragraph()
title_run = title.add_run("Manual de usuario")
title_run.font.name = FUENTE
title_run.font.size = Pt(26)
title_run.font.color.rgb = TINTA

subtitle = document.add_paragraph()
subtitle_run = subtitle.add_run(
    "Portal de Denuncia Anónima e Inteligencia Cívica\n"
    "Demostración del Sistema de Denuncias Públicas (S5) para el Datatón Anticorrupción 2026"
)
subtitle_run.font.name = FUENTE
subtitle_run.font.size = Pt(12)
subtitle_run.font.color.rgb = GRIS
subtitle.paragraph_format.space_after = Pt(40)

meta = document.add_paragraph()
meta_run = meta.add_run("Versión 1.0\n12 de noviembre de 2026")
meta_run.font.name = FUENTE
meta_run.font.size = Pt(10)
meta_run.font.color.rgb = GRIS

aviso(
    "Demostración con datos ficticios.",
    "Este manual describe el prototipo que se presenta en el Datatón. No se debe usar para presentar denuncias reales: "
    "los expedientes se guardan cifrados en tu navegador y puedes borrarlos cuando quieras."
)

document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ===========================================================================
# CONTENIDO
# ===========================================================================
document.add_heading("Contenido", level=1)
contenido = [
    ("1. Qué es PARMEX", "Qué problema atiende y qué no es."),
    ("2. Antes de empezar", "Requisitos y cómo abrir la demostración."),
    ("3. La pantalla inicial", "Cómo se ve y qué hay en cada zona."),
    ("4. Enviar una denuncia", "Los cinco pasos del recorrido ciudadano."),
    ("5. Tu comprobante", "El folio y el código de seguimiento."),
    ("6. Consultar el estado", "Seguimiento sin dar tu identidad."),
    ("7. La vista de la autoridad", "Bandeja, expediente y tablero."),
    ("8. Prueba técnica con archivos", "El intercambio manual, paso a paso."),
    ("9. Qué protege y qué no", "Alcance honesto de la demostración."),
    ("10. Problemas frecuentes", "Qué hacer cuando algo no responde."),
    ("11. Glosario", "Los términos técnicos en palabras llanas."),
]
for titulo, descripcion in contenido:
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(titulo)
    run.font.bold = True
    run.font.size = Pt(10.5)
    run.font.name = FUENTE
    run.font.color.rgb = INDIGO
    second = paragraph.add_run("  ·  " + descripcion)
    second.font.size = Pt(9.5)
    second.font.name = FUENTE
    second.font.color.rgb = GRIS

# ===========================================================================
# 1. QUÉ ES
# ===========================================================================
document.add_heading("1. Qué es PARMEX", level=1)
document.add_paragraph(
    "PARMEX es una prueba de concepto para presentar una denuncia de corrupción o de falta administrativa "
    "sin exponer a quien la presenta. La persona llena un formulario breve, escribe su relato y adjunta evidencia; "
    "el navegador cifra todo antes de enviarlo y solo muestra el comprobante cuando la autoridad confirma que pudo abrirlo."
)
document.add_paragraph("La idea central no es el formulario, sino dónde ocurre el cifrado: en tu propio navegador, antes de que el expediente salga de tu equipo. El contenido viaja y se guarda cifrado; solo la autoridad, con su llave privada, puede leerlo.")

document.add_heading("Tres ideas que sostienen el prototipo", level=2)
for titulo, texto in (
    ("Cifrado en el origen.", "El relato, las respuestas y la evidencia se protegen antes del envío, no después de llegar al servidor."),
    ("Orientación sin tecnicismos.", "Tres preguntas con ejemplos ayudan a describir el caso sin conocer la clasificación administrativa. Siempre puedes responder «No estoy seguro»."),
    ("Seguimiento sin identidad.", "Un folio y un código permiten consultar el estado del caso sin dar nombre, correo ni teléfono."),
):
    paragraph = document.add_paragraph(style="List Bullet")
    run = paragraph.add_run(titulo + " ")
    run.font.bold = True
    paragraph.add_run(texto)

aviso(
    "Es una demostración, no un servicio.",
    "PARMEX se presenta en el Datatón Anticorrupción 2026 como prueba de concepto. No está conectado al Sistema 5 "
    "de la Plataforma Digital Nacional ni recibe denuncias reales."
)

# ===========================================================================
# 2. ANTES DE EMPEZAR
# ===========================================================================
document.add_heading("2. Antes de empezar", level=1)
document.add_paragraph("La demostración corre en tu computadora. No necesita internet, ni cuenta, ni instalar nada más que un servidor local para abrir los archivos.")

document.add_heading("Lo que necesitas", level=2)
for texto in (
    "Un navegador actualizado: Chrome, Edge, Firefox o Safari de los últimos dos años.",
    "Python 3 instalado, o cualquier servidor de archivos estáticos equivalente.",
    "Dos pestañas del mismo navegador y del mismo perfil: una para la captura y otra para la autoridad.",
    "Una tercera pestaña, opcional, para consultar el estado.",
):
    document.add_paragraph(texto, style="List Bullet")

document.add_heading("Cómo abrirla", level=2)
document.add_paragraph(
    "La demostración no se abre con doble clic. Necesita un pequeño servidor que se inicia desde una terminal, "
    "una ventana de texto donde se escriben comandos. Son cuatro pasos y se hacen una sola vez."
)
lista_numerada([
    "Abre la carpeta del proyecto en el Explorador de archivos.",
    "Haz clic derecho sobre un espacio vacío de la carpeta, no sobre un archivo.",
    "Elige «Abrir en Terminal». En Windows 10 puede aparecer como «Abrir en PowerShell».",
    "Se abrirá una ventana con la ruta de la carpeta. Ahí se escribe el comando del paso siguiente.",
])
document.add_heading("Si no encuentras la opción", level=3)
for texto in (
    "En Windows 10 el menú suele decir «Abrir en PowerShell». El resultado es el mismo.",
    "Si el menú no la muestra, pulsa la tecla Windows, escribe PowerShell, ábrela y escribe cd seguido de la ruta de la carpeta entre comillas: cd \"D:\\Anto\\PARMEX\".",
    "En Mac o Linux, abre Terminal desde Launchpad o el menú de aplicaciones; escribe cd, un espacio, arrastra la carpeta a la ventana y pulsa Enter.",
):
    document.add_paragraph(texto, style="List Bullet")
figura("validacion/abrir-terminal.png", "Figura 1. Cómo abrir la terminal: clic derecho en una zona vacía de la carpeta y elegir «Abrir en Terminal».")
document.add_paragraph("En esa ventana escribe el siguiente comando y pulsa Enter:")
consola([
    "PS D:\\Anto\\PARMEX> python -m http.server 8765 --bind 127.0.0.1",
    "Serving HTTP on 127.0.0.1 port 8765 (http://127.0.0.1:8765/) ...",
])
document.add_paragraph(
    "La segunda línea confirma que el servidor está activo. Deja esa ventana abierta mientras uses la demostración: "
    "si la cierras, las páginas dejan de cargar. Para detenerlo, pulsa Ctrl+C."
)
document.add_paragraph("Después abre estas direcciones en el navegador:")
for texto in (
    "http://localhost:8765/  ·  captura ciudadana",
    "http://localhost:8765/autoridad.html  ·  vista de la autoridad",
    "http://localhost:8765/consulta.html  ·  consulta de estado",
):
    paragraph = document.add_paragraph(style="List Bullet")
    run = paragraph.add_run(texto)
    run.font.name = "Consolas"
    run.font.size = Pt(9)

aviso(
    "No abras los archivos con doble clic.",
    "Si abres index.html directamente desde el explorador de archivos, el navegador bloquea el cifrado y verás un aviso. "
    "Siempre usa la dirección http://localhost y la misma en todas las pestañas."
)

# ===========================================================================
# 3. PANTALLA INICIAL
# ===========================================================================
document.add_heading("3. La pantalla inicial", level=1)
document.add_paragraph(
    "La captura ciudadana se organiza en dos columnas en pantallas anchas: a la izquierda, la tarjeta donde ocurre "
    "todo; a la derecha, un panel titulado «¿Qué pasa cuando envías?» y la prueba técnica. Arriba están la barra con las "
    "vistas de la demo y el encabezado con el título. La etiqueta «Demostración con datos ficticios» recuerda en todo "
    "momento que no se trata de un servicio real. En el teléfono las columnas se apilan y el recorrido es el mismo."
)
figura("validacion/captura-escritorio.png", "Figura 2. Pantalla inicial de la captura ciudadana. El recorrido empieza con «Usar un ejemplo ficticio» o respondiendo la primera pregunta.")

document.add_paragraph("En la barra superior puedes cambiar entre tres vistas. La autoridad se abre en otra pestaña para poder ver el envío en vivo. La consulta de estado sirve para comprobar el seguimiento.")

# ===========================================================================
# 4. ENVIAR
# ===========================================================================
document.add_heading("4. Enviar una denuncia", level=1)
document.add_paragraph("El formulario avanza de una pregunta por pantalla. Puedes retroceder sin perder lo que escribiste. El indicador «Paso X de 4» muestra siempre dónde estás.")

document.add_heading("Paso 1. Orientación: ¿qué tipo de situación quieres reportar?", level=2)
document.add_paragraph(
    "Seis tarjetas describen situaciones frecuentes con un ejemplo breve. Si ninguna coincide, elige «Otra situación». "
    "Si no estás seguro, elige «No estoy seguro»: la autoridad decide la clasificación, no tú."
)
document.add_heading("Paso 2. Orientación: ¿en qué ámbito de gobierno ocurrió?", level=2)
document.add_paragraph("Municipal o alcaldía, Estatal, Federal, Otro organismo o «No estoy seguro». Esta respuesta alimenta el tablero de la autoridad.")
document.add_heading("Paso 3. Orientación: ¿el hecho sigue ocurriendo?", level=2)
document.add_paragraph("Sí, No o «No estoy seguro». La autoridad usa esta respuesta para distinguir casos en curso.")
document.add_heading("Paso 4. Relato y evidencia", level=2)
document.add_paragraph(
    "Escribe lo que pasó con tus palabras, hasta 12 000 caracteres. Adjunta un archivo de hasta 1 MiB: una foto, "
    "una captura de pantalla o un documento."
)
document.add_paragraph(
    "Al elegir una imagen, la aplicación la revisa antes de enviarla y quita los metadatos: la fecha, el modelo del "
    "teléfono, la ubicación GPS y las miniaturas ocultas. También cambia el nombre del archivo por «evidencia-1» para "
    "que el nombre original no te identifique. Verás un mensaje que lo confirma o, si el formato no se puede limpiar, "
    "una advertencia."
)
aviso(
    "Sobre el PDF y los documentos de Office.",
    "El navegador no puede revisar el interior de un PDF, un DOCX o un ZIP. La aplicación te avisa antes de enviarlo. "
    "Si tu evidencia es un documento, ábrelo y comprueba que no incluya tu nombre, correo ni dirección en el texto."
)
document.add_paragraph(
    "Al final del paso 4 está el aviso de privacidad y una casilla. Léelo y márcala: sin la casilla no se puede enviar. "
    "Es un recordatorio de que la demostración no sale de tu equipo y de que debes usar datos ficticios."
)

document.add_heading("Paso 5. Envío", level=2)
document.add_paragraph(
    "Al pulsar «Enviar denuncia», el navegador busca la llave pública de la autoridad, cifra el expediente y espera la "
    "confirmación. Si la pestaña de la autoridad no está abierta, el formulario se conserva y aparece un enlace para abrirla. "
    "No pierdes lo que escribiste."
)
document.add_paragraph("Cuando la autoridad confirma, el formulario desaparece y el comprobante ocupa su lugar. Desde ahí puedes volver con «Enviar otra denuncia».")

# ===========================================================================
# 5. COMPROBANTE
# ===========================================================================
document.add_heading("5. Tu comprobante: folio y código", level=1)
document.add_paragraph("Cuando la autoridad confirma que pudo abrir el expediente, aparece el comprobante. Contiene dos datos que debes guardar:")
for titulo, texto in (
    ("Folio.", "32 caracteres hexadecimales. Identifica el expediente en la bandeja de la autoridad."),
    ("Código de seguimiento.", "10 caracteres en dos bloques de cinco. Es tu llave para consultar el estado. No incluye las letras I, O ni los números 0 y 1, para que no se confundan al dictarlos."),
):
    paragraph = document.add_paragraph(style="List Bullet")
    run = paragraph.add_run(titulo + " ")
    run.font.bold = True
    paragraph.add_run(texto)

figura("validacion/comprobante-detalle.png", "Figura 3. El comprobante reúne el folio, el código, la huella de la llave y el resultado de la limpieza de metadatos.")

document.add_paragraph("El botón «Copiar folio y código» los lleva al portapapeles. También puedes anotarlos a mano o tomar una captura de pantalla.")
document.add_paragraph(
    "La línea «Cifrado para la llave» muestra los primeros caracteres de la huella SHA-256 de la llave pública de la "
    "autoridad. Sirve para comprobar que el expediente se cifró para quien debía. El botón «Enviar otra denuncia» "
    "devuelve el formulario al primer paso, en blanco."
)
aviso(
    "El código no se puede recuperar.",
    "La aplicación no guarda tu código en ningún lado y la autoridad solo conserva un verificador que no permite reconstruirlo. "
    "Si lo pierdes, no habrá forma de consultar el estado de ese caso."
)

# ===========================================================================
# 6. CONSULTA
# ===========================================================================
document.add_heading("6. Consultar el estado", level=1)
document.add_paragraph("En la vista «Consultar estado» puedes saber cómo va tu denuncia sin dar tu nombre ni tu correo.")
lista_numerada([
    "Escribe o pega el folio de 32 caracteres.",
    "Escribe el código de 10 caracteres. Puedes hacerlo con o sin el guion.",
    "Pulsa «Consultar estado».",
])
document.add_paragraph("La respuesta es un estado general: «Recibida» o «En revisión». Nunca muestra el relato, la evidencia ni tus datos.")

figura("validacion/consulta-estado.png", "Figura 4. La consulta devuelve solo el estado. Un folio inexistente y un código incorrecto producen el mismo mensaje.")

document.add_paragraph(
    "Si el código no coincide, el mensaje es el mismo que cuando el folio no existe. Esa decisión es deliberada: "
    "así la consulta no sirve para averiguar si una persona presentó una denuncia."
)
aviso(
    "La consulta necesita la pestaña de la autoridad.",
    "En esta demostración la respuesta la da la pestaña de la autoridad que está abierta en tu navegador. Si la cierras, "
    "la consulta avisa que no obtuvo respuesta. En un servicio real respondería el servidor institucional."
)
document.add_paragraph("La versión móvil ocupa una sola columna y mantiene los controles grandes y el mismo recorrido.", style="Nota")

# ===========================================================================
# 7. AUTORIDAD
# ===========================================================================
document.add_heading("7. La vista de la autoridad", level=1)
document.add_paragraph(
    "La pestaña de la autoridad genera su par de llaves la primera vez y muestra «Lista para recibir denuncias de prueba» "
    "cuando está preparada. Puedes cerrarla o recargarla sin miedo: la llave y los expedientes quedan guardados en este "
    "navegador y al volver se recuperan."
)
figura("validacion/bandeja-con-casos.png", "Figura 5. La bandeja muestra el expediente elegido por folio, el estado y el tablero de focos rojos con los conteos por ámbito.")

document.add_heading("Revisar un expediente", level=2)
lista_numerada([
    "Elige una denuncia en la lista «Elige una denuncia por folio». La más reciente queda seleccionada al llegar.",
    "Lee las tres respuestas, el relato y comprueba el nombre de la evidencia.",
    "Pulsa «Descargar adjunto recuperado» para obtener el archivo original.",
])

document.add_heading("Cambiar el estado", level=2)
document.add_paragraph("El botón «Marcar en revisión» actualiza el estado del caso. La persona lo verá la próxima vez que consulte con su folio y su código.")
figura("validacion/autoridad-en-revision.png", "Figura 6. Un caso marcado «En revisión». El botón queda deshabilitado y la persona verá el cambio en la consulta.")

document.add_heading("El tablero", level=2)
document.add_paragraph("El tablero cuenta las denuncias recibidas, cuántas siguen ocurriendo según la persona denunciante y cómo se distribuyen por ámbito. Son conteos descriptivos de la bandeja de prueba: no son estadísticas públicas ni estimaciones de incidencia.")

document.add_heading("La bandeja recuerda", level=2)
document.add_paragraph(
    "Los expedientes se guardan cifrados en el navegador. Si recargas la pestaña, al volver aparecen otra vez y la consulta "
    "de estado sigue funcionando con el mismo folio y el mismo código."
)
for titulo, texto in (
    ("Cargar expedientes de ejemplo.", "Cuando la bandeja está vacía, crea dos casos ficticios para mostrar el tablero sin tener que enviarlos."),
    ("Vaciar la bandeja.", "Borra los expedientes guardados y deja la demo como nueva, sin cambiar la llave."),
):
    paragraph = document.add_paragraph(style="List Bullet")
    run = paragraph.add_run(titulo + " ")
    run.font.bold = True
    paragraph.add_run(texto)
aviso(
    "La llave también queda guardada.",
    "En esta demostración la llave privada vive en el navegador para poder recuperar los expedientes. Cualquiera con acceso "
    "a este equipo y a esta dirección podría abrirlos. En un servicio real la llave estaría en el servidor de la autoridad."
)

# ===========================================================================
# 8. PRUEBA TÉCNICA
# ===========================================================================
document.add_heading("8. Prueba técnica con archivos", level=1)
document.add_paragraph(
    "Además del envío automático entre pestañas, la demo permite reproducir el intercambio a mano. Sirve para comprobar el "
    "cifrado sin depender del canal entre pestañas y para ensayar rechazos."
)
lista_numerada([
    "En la autoridad, abre «Prueba técnica con archivos» y pulsa «Descargar clave pública».",
    "En la captura, abre la misma sección, importa el archivo JSON y coteja la huella SHA-256 que aparece.",
    "Llena el formulario y pulsa «Descargar expediente cifrado».",
    "En la autoridad, importa ese archivo y pulsa «Descifrar expediente».",
])
document.add_paragraph(
    "Para probar los rechazos, altera un carácter del folio, cambia una letra del cifrado o trunca el JSON. El sistema "
    "debe negarse a abrir el expediente. También puedes intentar abrirlo con otra llave o adjuntar un archivo de más de 1 MiB."
)
tabla(
    ["Alteración", "Qué debe pasar"],
    [
        ("Un carácter del folio cambiado", "El expediente no se abre: el folio está autenticado junto con el contenido."),
        ("Una letra del cifrado cambiada", "El expediente no se abre: la etiqueta de integridad no valida."),
        ("El JSON truncado", "Aviso de formato inválido; no se intenta descifrar."),
        ("El expediente abierto con otra llave", "«No se pudo autenticar el expediente»."),
        ("Un adjunto de más de 1 MiB", "La captura lo rechaza antes de cifrar."),
    ],
    [7, 9],
)

# ===========================================================================
# 9. ALCANCE
# ===========================================================================
document.add_heading("9. Qué protege y qué no", level=1)
document.add_paragraph("Una demostración honesta también dice dónde termina. Esto es lo que cubre el prototipo y lo que queda para la integración institucional.")

tabla(
    ["Protege", "No protege"],
    [
        ("El relato, las respuestas y la evidencia viajan cifrados y no se pueden leer sin la llave privada.", "Un dispositivo o un navegador comprometido puede leer los datos mientras están en claro."),
        ("Los metadatos de las imágenes JPEG, PNG y WebP se eliminan antes de cifrar.", "Los metadatos de PDF, DOCX, XLSX y ZIP no se pueden limpiar en el navegador."),
        ("La autoridad guarda del código solo un verificador; no puede reconstruirlo.", "El mecanismo no acredita identidad ni procedencia: cualquiera con la llave pública puede crear un expediente."),
        ("La consulta de estado no revela si un caso existe.", "La llave y los expedientes quedan guardados en este navegador: cualquiera con acceso a este perfil podría abrirlos."),
    ],
    [8, 8],
)

document.add_heading("Límites de la demostración", level=2)
tabla(
    ["Elemento", "Límite"],
    [
        ("Adjunto", "1 MiB por archivo"),
        ("Relato", "12 000 caracteres"),
        ("Expediente cifrado", "2 MiB"),
        ("Clave pública", "2 KiB"),
        ("Cifrado", "RSA-OAEP con SHA-256 (3072 bits) y AES-256-GCM"),
        ("Estados posibles", "Recibida · En revisión"),
    ],
    [7, 9],
)

document.add_paragraph(
    "La confidencialidad depende también de que la llave pública sea realmente de la autoridad. En un piloto habría que "
    "publicarla y verificarla por un canal institucional, con reglas de rotación y revocación."
)

# ===========================================================================
# 10. PROBLEMAS FRECUENTES
# ===========================================================================
document.add_heading("10. Problemas frecuentes", level=1)
tabla(
    ["Lo que ves", "Por qué pasa", "Qué hacer"],
    [
        ("«Abre esta página desde http://localhost»", "El archivo se abrió con doble clic y el navegador bloquea el cifrado.", "Inicia el servidor local y entra por http://localhost:8765."),
        ("«La autoridad de la demo aún no está lista»", "La pestaña de la autoridad no está abierta o todavía está generando su llave.", "Abre autoridad.html, espera «Lista para recibir» y vuelve a intentarlo. El formulario conserva lo escrito."),
        ("«Hay varias pestañas de autoridad abiertas»", "Dos pestañas de autoridad responderían con llaves distintas.", "Deja una sola pestaña de autoridad."),
        ("La consulta no responde", "La pestaña de la autoridad está cerrada.", "Vuelve a abrirla y espera a que esté lista."),
        ("«El adjunto debe ocupar como máximo 1 MiB»", "El archivo es demasiado grande.", "Comprime la imagen o adjunta otro archivo."),
        ("«No se pudo autenticar el expediente»", "El archivo se alteró o se cifró con otra llave.", "Vuelve a descargarlo desde la captura original."),
        ("La bandeja aparece vacía", "Se usó «Vaciar la bandeja» o se borraron los datos del sitio.", "Vuelve a enviar una denuncia o pulsa «Cargar expedientes de ejemplo»."),
        ("No se puede copiar el código", "El navegador bloqueó el portapapeles.", "Anota el folio y el código a mano o toma una captura."),
    ],
    [5.4, 5.4, 5.2],
)

# ===========================================================================
# 11. GLOSARIO
# ===========================================================================
document.add_heading("11. Glosario", level=1)
glosario = [
    ("Cifrado", "Transformar la información para que solo quien tiene la llave pueda leerla."),
    ("Llave pública y privada", "Par de llaves: la pública cifra y puede compartirse; la privada descifra y se custodia."),
    ("AES-256-GCM", "Algoritmo que cifra el expediente y además detecta si alguien lo alteró."),
    ("RSA-OAEP", "Algoritmo que protege la llave del expediente con la llave pública de la autoridad."),
    ("Folio", "Identificador público de 32 caracteres hexadecimales."),
    ("Código de seguimiento", "Secreto de 10 caracteres que acompaña al folio en la consulta."),
    ("PBKDF2", "Función que deriva un verificador a partir del código. No se puede revertir."),
    ("Metadatos", "Datos ocultos en un archivo: fecha, dispositivo, ubicación, autor."),
    ("EXIF", "Formato de metadatos típico de las fotos; puede incluir GPS y modelo del teléfono."),
    ("Huella SHA-256", "Resumen único de una llave pública; sirve para comprobar que es la correcta."),
    ("S5", "Sistema de Denuncias Públicas de la Plataforma Digital Nacional."),
]
for termino, definicion in glosario:
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(termino + ". ")
    run.font.bold = True
    run.font.size = Pt(10)
    run.font.name = FUENTE
    run.font.color.rgb = INDIGO
    second = paragraph.add_run(definicion)
    second.font.size = Pt(10)
    second.font.name = FUENTE

# ===========================================================================
# 12. CRÉDITOS
# ===========================================================================
document.add_heading("12. Créditos y contacto", level=1)
document.add_paragraph(
    "PARMEX es un equipo de cinco personas organizado en dos células: Núcleo técnico, datos y criptografía, y "
    "Experiencia ciudadana y blindaje institucional. La propuesta visual y de orientación parte de la maqueta del equipo."
)
document.add_paragraph(
    "El prototipo se desarrolló con tecnologías web estándar y sin dependencias externas: HTML, CSS, JavaScript y la "
    "Web Crypto API del navegador. La documentación técnica, los criterios de seguridad y las pruebas están en el "
    "repositorio del proyecto."
)
document.add_paragraph("Para dudas sobre la demostración, escribe al equipo por el canal del Datatón.", style="Nota")

# Cada sección empieza en página nueva, salvo la primera que sigue al contenido.
encabezados = [p for p in document.paragraphs if p.style.name == "Heading 1"]
for parrafo in encabezados[2:]:
    parrafo.paragraph_format.page_break_before = True

document.save("PARMEX_Manual_de_Usuario.docx")
print("documento creado")
