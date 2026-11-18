import { localChannel, discover, deliver } from './channel.mjs';
import { sanitizeAttachment } from './metadata.mjs';
import {
  saveRecipient, loadRecipient, savePackage, updateState, listPackages, clearPackages
} from './storage.mjs';

const byId = id => document.getElementById(id);

function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readJson(file, max, sizeMessage) {
  if (file.size > max) throw new Error(sizeMessage);
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('El archivo debe ser un JSON codificado en UTF-8.');
  }
}

async function start() {
  if (!globalThis.crypto?.subtle) {
    byId('fatal').textContent = 'Abre esta página desde http://localhost para habilitar Web Crypto.';
    return;
  }
  const {
    QUESTIONS, MAX_ATTACHMENT, MAX_PACKAGE, MAX_PUBLIC_KEY,
    createRecipient, readPublicKey, seal, openPackage,
    createTrackingCode, hashCode, sameSecret
  } = await import('./crypto.mjs');

  function initCitizen() {
    const keyFile = byId('public-file');
    const fields = byId('capture-fields');
    const submit = byId('seal');
    const manual = byId('manual-seal');
    const help = byId('open-authority');
    const channel = localChannel();
    let pending;
    let pendingCode;
    let lastReceipt;
    let busy = false;
    const story = byId('story');
    const attachment = byId('attachment');
    const fileChoice = byId('file-choice');
    const receipt = byId('receipt');
    const error = byId('capture-error');
    const status = byId('capture-status');
    const keyStatus = byId('key-status');
    let recipient;
    let exampleFile;
    let prepared;
    const descriptions = {
      'Solicitud de un pago indebido': 'Te pidieron dinero, una comisión o un beneficio sin autorización.',
      'Uso indebido de recursos públicos': 'Se usaron indebidamente bienes, presupuesto, personal o servicios públicos.',
      'Irregularidad en una contratación': 'Viste un problema en una compra, obra o contrato público.',
      'Favoritismo o conflicto de interés': 'Se dio un trato preferente por una relación personal o de negocios.',
      'Otra situación': 'Lo que pasó no coincide con las opciones anteriores.',
      'Municipal o alcaldía': 'Por ejemplo, un ayuntamiento o una alcaldía.',
      'Estatal': 'Por ejemplo, una dependencia del estado.',
      'Federal': 'Por ejemplo, una secretaría o entidad federal.',
      'Otro organismo': 'Por ejemplo, un organismo autónomo.',
      'Sí': 'La situación continúa.',
      'No': 'La situación ya terminó.'
    };
    const questionSteps = QUESTIONS.map(({ name, label, options }) => {
      const group = document.createElement('fieldset');
      group.className = 'question-step';
      const legend = document.createElement('legend');
      legend.tabIndex = -1;
      legend.textContent = label;
      group.append(legend);
      const inputs = options.map(option => {
        const card = document.createElement('label');
        card.className = 'choice';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = name;
        radio.value = option;
        const copy = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = option;
        copy.append(title);
        if (descriptions[option]) {
          const description = document.createElement('span');
          description.className = 'hint';
          description.textContent = descriptions[option];
          copy.append(description);
        }
        card.append(radio, copy);
        group.append(card);
        return radio;
      });
      byId('questions').append(group);
      return { group, legend, inputs };
    });

    const detail = byId('details-step');
    const back = byId('back');
    const next = byId('next');
    const lastStep = questionSteps.length;
    let step = 0;

    function goTo(index, focus = true) {
      step = index;
      questionSteps.forEach(({ group }, position) => { group.hidden = index !== position; });
      detail.hidden = index !== lastStep;
      back.hidden = index === 0;
      next.hidden = index === lastStep;
      submit.hidden = index !== lastStep;
      byId('step-count').textContent = 'Paso ' + (index + 1) + ' de ' + (lastStep + 1);
      byId('step-progress').value = index + 1;
      if (focus) (questionSteps[index]?.legend ?? byId('details-title')).focus();
    }

    function selected(index) {
      return questionSteps[index].inputs.find(radio => radio.checked)?.value;
    }

    next.addEventListener('click', () => {
      if (!selected(step)) {
        error.textContent = 'Elige una respuesta para continuar. Puedes marcar «No estoy seguro».';
        questionSteps[step].inputs[0].focus();
        return;
      }
      error.textContent = '';
      goTo(step + 1);
    });
    back.addEventListener('click', () => {
      error.textContent = '';
      goTo(step - 1);
    });
    goTo(0, false);

    keyFile.addEventListener('change', async () => {
      const file = keyFile.files[0];
      recipient = undefined;
      manual.disabled = true;
      byId('key-result').hidden = true;
      byId('key-error').textContent = '';
      keyStatus.textContent = '';
      if (!file) return;
      keyFile.disabled = true;
      keyStatus.textContent = 'Validando la clave pública…';
      try {
        const json = await readJson(file, MAX_PUBLIC_KEY, 'El archivo de clave pública supera el límite de 2 KiB.');
        recipient = await readPublicKey(json);
        byId('public-fingerprint').textContent = recipient.keyId;
        byId('key-result').hidden = false;
        keyStatus.textContent = 'Clave pública importada.';
        manual.disabled = false;
      } catch (problem) {
        keyStatus.textContent = '';
        byId('key-error').textContent = problem.message;
        keyFile.value = '';
      } finally {
        keyFile.disabled = false;
      }
    });

    const note = byId('attachment-note');
    let reviewToken = 0;

    async function reviewAttachment(file) {
      const token = ++reviewToken;
      prepared = undefined;
      if (!file) {
        note.textContent = '';
        return undefined;
      }
      note.textContent = 'Revisando el archivo…';
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = sanitizeAttachment({ name: file.name, bytes });
        if (token !== reviewToken) return undefined;
        prepared = { file, ...result };
        note.textContent = result.note + ' Se enviará como ' + result.name + '.';
        return prepared;
      } catch {
        if (token === reviewToken) note.textContent = 'No se pudo revisar el archivo. Se enviará tal cual; revisa que no incluya tus datos.';
        return undefined;
      }
    }

    byId('example').addEventListener('click', () => {
      const answers = ['Solicitud de un pago indebido', 'Municipal o alcaldía', 'No estoy seguro'];
      questionSteps.forEach(({ inputs }, index) => {
        inputs.find(radio => radio.value === answers[index]).checked = true;
      });
      story.value = 'En el municipio ficticio de Valle Inventado, en una ventanilla de permisos me pidieron un pago adicional sin recibo. Conservé una nota de demostración para describir lo ocurrido.';
      exampleFile = new File(
        ['EVIDENCIA FICTICIA\nMunicipio de Valle Inventado\nNota de demostración: solicitud de pago sin recibo.\n'],
        'nota-ficticia.txt', { type: 'text/plain' }
      );
      attachment.value = '';
      fileChoice.textContent = 'Adjunto del ejemplo: ' + exampleFile.name;
      error.textContent = '';
      reviewAttachment(exampleFile);
      goTo(lastStep);
    });

    attachment.addEventListener('change', () => {
      exampleFile = undefined;
      fileChoice.textContent = '';
      error.textContent = '';
      const file = attachment.files[0];
      if (!file) {
        reviewAttachment(undefined);
        return;
      }
      if (file.size > MAX_ATTACHMENT) {
        error.textContent = 'El adjunto debe ocupar como máximo 1 MiB. Selecciona otro archivo.';
        attachment.value = '';
        reviewAttachment(undefined);
        return;
      }
      reviewAttachment(file);
    });

    const form = byId('capture');
    function forgetPending() {
      pending = undefined;
      pendingCode = undefined;
    }
    form.addEventListener('input', forgetPending);
    byId('example').addEventListener('click', forgetPending);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const useFiles = event.submitter === manual;
      receipt.hidden = true;
      help.hidden = true;
      error.textContent = '';
      status.textContent = '';
      const unanswered = questionSteps.findIndex((_, index) => !selected(index));
      if (unanswered !== -1) {
        goTo(unanswered);
        error.textContent = 'Responde esta pregunta antes de enviar.';
        return;
      }
      if (!story.value.trim()) {
        goTo(lastStep, false);
        error.textContent = 'Escribe un relato breve de lo que pasó.';
        story.focus();
        return;
      }
      goTo(lastStep, false);
      const file = attachment.files[0] ?? exampleFile;
      if (!file) {
        error.textContent = 'Selecciona un archivo de evidencia ficticio o usa el ejemplo.';
        attachment.focus();
        return;
      }
      if (!byId('consent').checked) {
        error.textContent = 'Marca la casilla del aviso de privacidad para continuar.';
        byId('consent').focus();
        return;
      }
      busy = true;
      fields.disabled = true;
      manual.disabled = true;
      keyFile.disabled = true;
      let complete = false;
      let attachmentNote = '';
      try {
        if (file.size > MAX_ATTACHMENT) throw new Error('El adjunto debe ocupar como máximo 1 MiB.');
        if (!useFiles && !channel) {
          throw new Error('Este navegador no admite el envío de prueba entre pestañas. Abre PARMEX en un navegador actualizado.');
        }
        status.textContent = useFiles ? 'Protegiendo el expediente…' : 'Conectando con la autoridad de la demo…';
        if (!useFiles) help.hidden = false;
        const ready = prepared?.file === file ? prepared : await reviewAttachment(file);
        const destination = useFiles ? recipient : await readPublicKey(await discover(channel));
        help.hidden = true;
        if (!destination) throw new Error('Carga la clave pública para la prueba con archivos.');
        let packet = useFiles ? undefined : pending;
        if (packet && packet.keyId !== destination.keyId) {
          forgetPending();
          packet = undefined;
        }
        if (!packet) {
          const answers = Object.fromEntries(QUESTIONS.map(({ name }, index) => [name, selected(index)]));
          const bytes = ready?.bytes ?? new Uint8Array(await file.arrayBuffer());
          const name = ready?.name ?? file.name;
          pendingCode = createTrackingCode();
          packet = await seal({ answers, story: story.value, name, bytes, code: pendingCode }, destination);
        }
        attachmentNote = ready ? ready.note + ' Archivo: ' + ready.name + '.' : '';
        if (useFiles) {
          download('parmex-' + packet.folio + '.json', JSON.stringify(packet));
        } else {
          pending = packet;
          status.textContent = 'Enviando la denuncia y esperando confirmación…';
          await deliver(channel, packet);
          form.reset();
          goTo(0, false);
          exampleFile = undefined;
          fileChoice.textContent = '';
          note.textContent = '';
          prepared = undefined;
        }
        lastReceipt = { folio: packet.folio, code: pendingCode, keyId: destination.keyId };
        forgetPending();
        pendingCode = undefined;
        byId('receipt-folio').textContent = lastReceipt.folio;
        byId('receipt-code').textContent = lastReceipt.code.slice(0, 5) + '-' + lastReceipt.code.slice(5);
        byId('receipt-key').textContent = lastReceipt.keyId.slice(0, 16) + '…';
        byId('copy-status').textContent = '';
        byId('receipt-title').textContent = useFiles ? 'Expediente de prueba descargado' : 'Denuncia de prueba recibida';
        byId('receipt-message').textContent = useFiles
          ? 'Abre el archivo desde la prueba técnica de la autoridad.'
          : 'Guarda el folio y el código: sin ellos no se puede consultar el estado.';
        byId('receipt-metadata').textContent = attachmentNote;
        receipt.hidden = false;
        form.hidden = true;
        byId('capture-title').hidden = true;
        byId('capture-intro').hidden = true;
        status.textContent = '';
        complete = true;
      } catch (problem) {
        error.textContent = problem instanceof DOMException
          ? 'No se pudo leer el archivo o proteger la denuncia. Inténtalo de nuevo.'
          : problem.message;
        status.textContent = '';
      } finally {
        busy = false;
        fields.disabled = false;
        keyFile.disabled = false;
        manual.disabled = !recipient;
        if (complete) byId('receipt-title').focus();
        else if (!help.hidden) help.focus();
        else (useFiles ? manual : submit).focus();
      }
    });

    byId('copy-receipt').addEventListener('click', async () => {
      if (!lastReceipt) return;
      const note = byId('copy-status');
      try {
        await navigator.clipboard.writeText('Folio: ' + lastReceipt.folio + '\nCódigo: ' + lastReceipt.code);
        note.textContent = 'Copiado. Guárdalo en un lugar seguro.';
      } catch {
        note.textContent = 'No se pudo copiar. Anota el folio y el código a mano.';
      }
    });

    byId('new-report').addEventListener('click', () => {
      receipt.hidden = true;
      form.hidden = false;
      byId('capture-title').hidden = false;
      byId('capture-intro').hidden = false;
      form.reset();
      error.textContent = '';
      status.textContent = '';
      byId('receipt-metadata').textContent = '';
      byId('copy-status').textContent = '';
      exampleFile = undefined;
      prepared = undefined;
      fileChoice.textContent = '';
      note.textContent = '';
      goTo(0, false);
      byId('example').focus();
    });

    fields.disabled = false;
    keyFile.disabled = false;
  }

  function initAuthority() {
    const generate = byId('generate');
    const fields = byId('review-fields');
    const error = byId('review-error');
    const status = byId('review-status');
    const opened = byId('opened');
    const answers = byId('opened-answers');
    const reports = byId('reports');
    const channel = localChannel();
    const inbox = new Map();
    // El código de seguimiento no se guarda: solo su verificador PBKDF2 y el estado.
    const states = new Map();
    let recipient;

    function show(report) {
      byId('opened-folio').textContent = report.folio;
      const entry = states.get(report.folio);
      byId('opened-state').textContent = entry?.state ?? 'Recibida';
      byId('mark-review').textContent = entry?.state === 'Recibida' ? 'Marcar en revisión' : 'Ya está en revisión';
      byId('mark-review').disabled = !entry || entry.state !== 'Recibida';
      answers.replaceChildren();
      for (const question of QUESTIONS) {
        const term = document.createElement('dt');
        term.textContent = question.label;
        const description = document.createElement('dd');
        description.textContent = report.answers[question.name];
        answers.append(term, description);
      }
      byId('opened-story').textContent = report.story;
      byId('opened-name').textContent = report.name;
      opened.hidden = false;
    }

    const scopes = QUESTIONS.find(question => question.name === 'ambito').options;
    const scopeRows = scopes.map(scope => {
      const row = document.createElement('div');
      row.className = 'scope';
      const label = document.createElement('strong');
      label.textContent = scope;
      const count = document.createElement('span');
      const bar = document.createElement('meter');
      bar.setAttribute('aria-hidden', 'true');
      row.append(label, count, bar);
      byId('scope-breakdown').append(row);
      return { scope, count, bar };
    });

    function updateDashboard() {
      const counts = new Map(scopes.map(scope => [scope, 0]));
      let ongoing = 0;
      for (const { answers: report } of inbox.values()) {
        counts.set(report.ambito, counts.get(report.ambito) + 1);
        if (report.continua === 'Sí') ongoing += 1;
      }
      byId('total-reports').textContent = inbox.size;
      byId('ongoing-reports').textContent = ongoing;
      for (const { scope, count, bar } of scopeRows) {
        const total = counts.get(scope);
        count.textContent = total === 1 ? '1 caso' : total + ' casos';
        bar.max = Math.max(inbox.size, 1);
        bar.value = total;
      }
    }
    updateDashboard();

    async function add(report, json, { state = 'Recibida', recibidoEn = Date.now(), persist = true } = {}) {
      if (inbox.has(report.folio)) return;
      const { code, ...content } = report;
      const hash = await hashCode(code, report.folio);
      inbox.set(report.folio, content);
      states.set(report.folio, { hash, state });
      if (persist && json) {
        try {
          await savePackage({ folio: report.folio, json, state, recibidoEn });
        } catch {
          // Si el navegador no permite guardar, la demo sigue funcionando en memoria.
        }
      }
      updateDashboard();
      reports.add(new Option(content.folio, content.folio));
      byId('inbox').hidden = false;
      // La denuncia recién recibida queda seleccionada: el aviso y el detalle coinciden.
      reports.value = content.folio;
      show(content);
      updateActions();
      status.textContent = 'Nueva denuncia de prueba recibida. Folio: ' + content.folio;
    }

    function updateActions() {
      byId('demo-actions').hidden = !recipient;
      byId('seed-demo').hidden = inbox.size > 0;
      byId('clear-demo').hidden = inbox.size === 0;
    }

    async function restoreInbox() {
      if (!recipient) return 0;
      const stored = await listPackages();
      for (const item of stored) {
        try {
          const report = await openPackage(item.json, recipient);
          await add(report, item.json, { state: item.state, recibidoEn: item.recibidoEn, persist: false });
        } catch {
          // Un paquete ilegible no debe impedir abrir la bandeja.
        }
      }
      return inbox.size;
    }

    async function seedDemo() {
      if (!recipient) return;
      status.textContent = 'Cargando expedientes de ejemplo…';
      const destination = await readPublicKey(recipient.publicFile);
      const examples = [
        {
          answers: { situacion: 'Solicitud de un pago indebido', ambito: 'Municipal o alcaldía', continua: 'Sí' },
          story: 'En el municipio ficticio de Valle Inventado, en la ventanilla de licencias se pidió un pago adicional sin recibo. El hecho sigue ocurriendo esta semana.'
        },
        {
          answers: { situacion: 'Irregularidad en una contratación', ambito: 'Estatal', continua: 'No' },
          story: 'En una dependencia estatal ficticia se adjudicó un contrato de limpieza sin convocatoria. El contrato ya se pagó.'
        }
      ];
      for (const example of examples) {
        const bytes = new TextEncoder().encode('EVIDENCIA FICTICIA\n' + example.story);
        const packet = await seal({ ...example, name: 'nota-ficticia.txt', bytes, code: createTrackingCode() }, destination);
        const json = JSON.stringify(packet);
        await add(await openPackage(json, recipient), json);
      }
      status.textContent = 'Expedientes de ejemplo cargados: ' + inbox.size + '.';
    }

    async function clearDemo() {
      try {
        await clearPackages();
      } catch {
        // Si no se pudo borrar el almacenamiento, al menos se limpia la vista.
      }
      inbox.clear();
      states.clear();
      reports.replaceChildren();
      byId('inbox').hidden = true;
      opened.hidden = true;
      updateDashboard();
      updateActions();
      status.textContent = 'Bandeja vacía. La llave se conserva para seguir recibiendo denuncias.';
    }

    async function replyStatus({ request, folio, code }) {
      let ok = false;
      let state = '';
      const entry = typeof folio === 'string' ? states.get(folio) : undefined;
      if (entry && typeof code === 'string') {
        try {
          ok = sameSecret(entry.hash, await hashCode(code, folio));
          if (ok) state = entry.state;
        } catch {
          ok = false;
        }
      }
      channel.postMessage({ type: 'status-result', request, ok, state });
    }

    async function prepare() {
      generate.hidden = true;
      byId('recipient-error').textContent = '';
      byId('recipient-status').textContent = 'Preparando la recepción…';
      try {
        let saved = null;
        try {
          saved = await loadRecipient();
        } catch {
          saved = null;
        }
        recipient = saved ?? await createRecipient();
        if (!saved) {
          try {
            await saveRecipient(recipient);
          } catch {
            // Sin persistencia la demo sigue funcionando mientras la pestaña esté abierta.
          }
        }
        byId('recipient-fingerprint').textContent = recipient.keyId;
        byId('recipient-result').hidden = false;
        fields.disabled = false;
        let restored = 0;
        try {
          restored = await restoreInbox();
        } catch {
          restored = 0;
        }
        byId('recipient-status').textContent = channel
          ? (restored
            ? 'Lista para recibir denuncias de prueba. Expedientes recuperados de este navegador: ' + restored + '.'
            : 'Lista para recibir denuncias de prueba.')
          : 'Disponible la prueba técnica con archivos. El envío entre pestañas requiere un navegador actualizado.';
        updateActions();
      } catch {
        recipient = undefined;
        byId('recipient-status').textContent = '';
        byId('recipient-error').textContent = 'No se pudo preparar la recepción.';
        generate.hidden = false;
      }
    }

    channel?.addEventListener('message', async ({ data }) => {
      if (!recipient || typeof data?.request !== 'string') return;
      if (data.type === 'discover') {
        channel.postMessage({ type: 'key', request: data.request, publicFile: recipient.publicFile });
        return;
      }
      if (data.type === 'status') {
        await replyStatus(data);
        return;
      }
      if (data.type !== 'report' || data.keyId !== recipient.keyId) return;
      try {
        const report = await openPackage(data.json, recipient);
        await add(report, data.json);
        channel.postMessage({ type: 'received', request: data.request, keyId: recipient.keyId, folio: report.folio });
      } catch (problem) {
        error.textContent = problem.message;
      }
    });

    byId('mark-review').addEventListener('click', async () => {
      const entry = states.get(reports.value);
      if (!entry || entry.state !== 'Recibida') return;
      entry.state = 'En revisión';
      try {
        await updateState(reports.value, entry.state);
      } catch {
        // El cambio de estado se conserva mientras la pestaña siga abierta.
      }
      show(inbox.get(reports.value));
      status.textContent = 'Estado actualizado a «En revisión». La persona puede consultarlo con su folio y su código.';
    });

    byId('seed-demo').addEventListener('click', seedDemo);
    byId('clear-demo').addEventListener('click', clearDemo);

    generate.addEventListener('click', prepare);
    reports.addEventListener('change', () => show(inbox.get(reports.value)));
    byId('download-public').addEventListener('click', () => {
      download('parmex-clave-publica.json', recipient.publicFile);
    });

    byId('review').addEventListener('submit', async event => {
      event.preventDefault();
      const file = byId('package-file').files[0];
      if (!recipient || !file) return;
      error.textContent = '';
      fields.disabled = true;
      status.textContent = 'Validando y descifrando el expediente…';
      try {
        const json = await readJson(file, MAX_PACKAGE, 'El expediente supera el límite de 2 MiB.');
        const report = await openPackage(json, recipient);
        await add(report, json);
        reports.value = report.folio;
        show(inbox.get(report.folio));
        status.textContent = 'Expediente recuperado. Folio: ' + report.folio;
        byId('download-evidence').focus();
      } catch (problem) {
        status.textContent = '';
        error.textContent = problem instanceof DOMException ? 'No se pudo leer el expediente.' : problem.message;
      } finally {
        fields.disabled = false;
      }
    });

    byId('download-evidence').addEventListener('click', () => {
      const report = inbox.get(reports.value);
      download(report.name, report.bytes, 'application/octet-stream');
    });
    prepare();
  }

  if (document.body.dataset.role === 'citizen') initCitizen();
  else initAuthority();
}

start().catch(() => {
  byId('fatal').textContent = 'No se pudo iniciar PARMEX. Verifica el servidor local y recarga la página.';
});
