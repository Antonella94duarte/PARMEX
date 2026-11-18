import { localChannel, consultCode } from './channel.mjs';
import { normalizeCode, normalizeFolio } from './crypto.mjs';

const byId = id => document.getElementById(id);
const channel = localChannel();

const form = byId('query');
const folioInput = byId('folio');
const codeInput = byId('codigo');
const button = byId('consult');
const status = byId('query-status');
const error = byId('query-error');
const answer = byId('answer');
let busy = false;

function reset() {
  answer.hidden = true;
  error.textContent = '';
  status.textContent = '';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  reset();
  const folio = normalizeFolio(folioInput.value);
  const code = normalizeCode(codeInput.value);
  if (folio.length !== 32) {
    error.textContent = 'El folio debe tener 32 caracteres hexadecimales. Cópialo de tu comprobante.';
    folioInput.focus();
    return;
  }
  if (code.length !== 10) {
    error.textContent = 'El código de seguimiento debe tener 10 caracteres. Puedes escribirlo con o sin el guion.';
    codeInput.focus();
    return;
  }
  busy = true;
  button.disabled = true;
  status.textContent = 'Consultando con la autoridad de la demo…';
  try {
    const result = await consultCode(channel, { folio, code });
    if (!result.ok) {
      error.textContent = 'El folio y el código no coinciden con una denuncia recibida en esta demo. Revisa los datos.';
      codeInput.focus();
      return;
    }
    byId('answer-folio').textContent = folio;
    byId('answer-state').textContent = result.state || 'Recibida';
    answer.hidden = false;
    byId('answer-title').focus();
  } catch (problem) {
    error.textContent = problem.message;
  } finally {
    busy = false;
    button.disabled = false;
    status.textContent = '';
  }
});

if (!channel) {
  byId('fatal').textContent = 'Este navegador no admite la consulta entre pestañas. Abre PARMEX en un navegador actualizado.';
}
