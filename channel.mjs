// Solo comunica pestañas del mismo origen y perfil. El expediente viaja cifrado.
export function localChannel() {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel('parmex-demo-v1') : null;
}

export function discover(channel) {
  return new Promise((resolve, reject) => {
    const request = crypto.randomUUID();
    const keys = new Set();
    function receive({ data }) {
      if (data?.type === 'key' && data.request === request && typeof data.publicFile === 'string') {
        keys.add(data.publicFile);
      }
    }
    channel.addEventListener('message', receive);
    channel.postMessage({ type: 'discover', request });
    setTimeout(() => {
      channel.removeEventListener('message', receive);
      if (keys.size === 1) resolve(keys.values().next().value);
      else if (keys.size > 1) reject(new Error('Hay varias pestañas de autoridad abiertas. Deja solo una y vuelve a intentarlo.'));
      else reject(new Error('La autoridad de la demo aún no está lista. Abre su vista, espera a que diga «Lista para recibir» y vuelve a intentarlo.'));
    }, 650);
  });
}

export function consultCode(channel, { folio, code }) {
  return new Promise((resolve, reject) => {
    if (!channel) {
      reject(new Error('Este navegador no admite la consulta entre pestañas. Abre PARMEX en un navegador actualizado.'));
      return;
    }
    const request = crypto.randomUUID();
    const timeout = setTimeout(() => {
      finish();
      reject(new Error('La autoridad de la demo no respondió. Abre su vista, espera a que diga «Lista para recibir» y vuelve a intentarlo.'));
    }, 5000);
    function finish() {
      clearTimeout(timeout);
      channel.removeEventListener('message', receive);
    }
    function receive({ data }) {
      if (data?.type !== 'status-result' || data.request !== request) return;
      finish();
      resolve({ ok: data.ok === true, state: typeof data.state === 'string' ? data.state : '' });
    }
    channel.addEventListener('message', receive);
    channel.postMessage({ type: 'status', request, folio, code });
  });
}

export function deliver(channel, packet) {
  return new Promise((resolve, reject) => {
    const request = crypto.randomUUID();
    const json = JSON.stringify(packet);
    const send = () => channel.postMessage({ type: 'report', request, keyId: packet.keyId, json });
    const retry = setTimeout(send, 2500);
    const timeout = setTimeout(() => {
      finish();
      reject(new Error('No llegó la confirmación. Comprueba que la pestaña de autoridad sigue abierta y vuelve a intentarlo.'));
    }, 6500);
    function finish() {
      clearTimeout(retry);
      clearTimeout(timeout);
      channel.removeEventListener('message', receive);
    }
    function receive({ data }) {
      if (data?.type !== 'received' || data.request !== request || data.keyId !== packet.keyId
        || data.folio !== packet.folio) return;
      finish();
      resolve();
    }
    channel.addEventListener('message', receive);
    send();
  });
}
