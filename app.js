const pp = document.getElementById('photopea');
const psdInput = document.getElementById('psdInput');
const refreshLayers = document.getElementById('refreshLayers');
const savePsd = document.getElementById('savePsd');
const exportPng = document.getElementById('exportPng');
const textFields = document.getElementById('textFields');
const textCount = document.getElementById('textCount');
const imageLayer = document.getElementById('imageLayer');
const imageInput = document.getElementById('imageInput');
const replaceImage = document.getElementById('replaceImage');
const imageInfo = document.getElementById('imageInfo');
const status = document.getElementById('status');
const documentName = document.getElementById('documentName');
const editorStatus = document.getElementById('editorStatus');

let ppReady = false;
let currentPsd = null;
let selectedImageFile = null;
let lastLayers = [];

function setStatus(message, ok = false) {
  status.textContent = message;
  status.style.border = ok ? '1px solid #315c42' : '1px solid transparent';
}

function sendScript(script) {
  if (!ppReady) throw new Error('El editor todavía no está listo.');
  pp.contentWindow.postMessage(script, '*');
}

function escJs(value) {
  return JSON.stringify(String(value));
}

function requestLayers() {
  const script = `
    (function(){
      var doc = app.activeDocument;
      function walk(parent, path, out){
        for(var i=0;i<parent.layers.length;i++){
          var l=parent.layers[i];
          var item={name:l.name, path:path.concat([l.name]), type:(l.typename||''), kind:(l.kind||'')};
          try { if(l.kind===LayerKind.TEXT && l.textItem) item.text=l.textItem.contents; } catch(e) {}
          out.push(item);
          if(l.typename==='LayerSet') walk(l, path.concat([l.name]), out);
        }
      }
      var out=[]; walk(doc, [], out);
      app.echoToOE(JSON.stringify({type:'layers',name:doc.name,layers:out}));
    })();`;
  sendScript(script);
  editorStatus.textContent = 'Leyendo capas…';
}

function renderLayers(data) {
  lastLayers = data.layers || [];
  const text = lastLayers.filter(x => typeof x.text === 'string');
  textFields.innerHTML = '';
  textCount.textContent = text.length;

  if (!text.length) {
    textFields.className = 'fields empty';
    textFields.textContent = 'No hay capas de texto detectadas.';
  } else {
    textFields.className = 'fields';
    text.forEach((layer, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = layer.path.join(' / ');
      label.title = layer.path.join(' / ');
      const area = document.createElement('textarea');
      area.value = layer.text;
      area.dataset.layer = layer.name;
      area.dataset.path = JSON.stringify(layer.path);
      const btn = document.createElement('button');
      btn.className = 'button primary full';
      btn.textContent = 'Aplicar texto';
      btn.addEventListener('click', () => applyText(layer, area.value, btn));
      wrap.append(label, area, btn);
      textFields.appendChild(wrap);
    });
  }

  imageLayer.innerHTML = '<option value="">Selecciona una capa</option>';
  lastLayers.filter(x => x.type !== 'LayerSet').forEach((layer) => {
    const option = document.createElement('option');
    option.value = JSON.stringify(layer.path);
    option.textContent = layer.path.join(' / ');
    imageLayer.appendChild(option);
  });
  imageLayer.disabled = lastLayers.length === 0;
  imageInput.disabled = lastLayers.length === 0;
  refreshLayers.disabled = false;
  savePsd.disabled = false;
  exportPng.disabled = false;
  setStatus(`Plantilla cargada: ${data.name || 'PSD'} · ${lastLayers.length} capas detectadas.`, true);
  editorStatus.textContent = 'Listo';
}

function findLayerScript(path, callbackCode) {
  return `
    (function(){
      var doc=app.activeDocument;
      var target=null;
      function walk(parent){
        for(var i=0;i<parent.layers.length;i++){
          var l=parent.layers[i];
          if(l.name===${escJs(path[path.length-1])}){
            var p=l.parent;
            var names=[];
            while(p && p!==doc){ names.unshift(p.name); p=p.parent; }
            names.push(l.name);
            if(JSON.stringify(names)===${escJs(JSON.stringify(path))}) target=l;
          }
          if(l.typename==='LayerSet') walk(l);
        }
      }
      walk(doc);
      if(!target){ app.echoToOE(JSON.stringify({type:'error',message:'No se encontró la capa solicitada.'})); return; }
      ${callbackCode}
    })();`;
}

function applyText(layer, value, button) {
  button.disabled = true;
  button.textContent = 'Aplicando…';
  const script = findLayerScript(layer.path, `
    if(!target.textItem){ app.echoToOE(JSON.stringify({type:'error',message:'La capa ya no es una capa de texto.'})); return; }
    target.textItem.contents=${escJs(value)};
    app.echoToOE(JSON.stringify({type:'ok',message:'Texto actualizado.'}));
  `);
  sendScript(script);
  setTimeout(() => { button.disabled = false; button.textContent = 'Aplicar texto'; }, 600);
}

function saveAs(format) {
  sendScript(`app.activeDocument.saveToOE(${escJs(format)});`);
  editorStatus.textContent = format.startsWith('psd') ? 'Preparando PSD…' : 'Preparando PNG…';
}

psdInput.addEventListener('change', async () => {
  const file = psdInput.files[0];
  if (!file) return;
  currentPsd = file;
  documentName.textContent = file.name;
  setStatus('Enviando PSD al editor…');
  editorStatus.textContent = 'Cargando PSD…';
  try {
    const buffer = await file.arrayBuffer();
    if (!ppReady) {
      // If Photopea is not ready, wait for the next "done" event.
      window.__pendingPsd = buffer;
      return;
    }
    pp.contentWindow.postMessage(buffer, '*');
  } catch (err) {
    setStatus('No se pudo leer el PSD: ' + err.message);
  }
});

imageInput.addEventListener('change', () => {
  selectedImageFile = imageInput.files[0] || null;
  imageInfo.textContent = selectedImageFile ? `${selectedImageFile.name} · ${(selectedImageFile.size / 1024 / 1024).toFixed(2)} MB` : '';
  replaceImage.disabled = !selectedImageFile || !imageLayer.value;
});
imageLayer.addEventListener('change', () => {
  replaceImage.disabled = !selectedImageFile || !imageLayer.value;
});

replaceImage.addEventListener('click', async () => {
  if (!selectedImageFile || !imageLayer.value) return;
  const path = JSON.parse(imageLayer.value);
  replaceImage.disabled = true;
  replaceImage.textContent = 'Cargando imagen…';
  try {
    const buffer = await selectedImageFile.arrayBuffer();
    // Register the pending operation BEFORE sending the file, so even a very fast
    // Photopea response cannot arrive before the state is ready.
    window.__pendingImageReplacement = { path, fileName: selectedImageFile.name };
    // Keep the PSD as documents[0], then open the image as a new document.
    pp.contentWindow.postMessage(buffer, '*');
    setStatus('Imagen enviada. Esperando a que Photopea la abra…');
  } catch (err) {
    setStatus('No se pudo leer la imagen: ' + err.message);
    replaceImage.disabled = false;
    replaceImage.textContent = 'Reemplazar imagen';
  }
});

refreshLayers.addEventListener('click', requestLayers);
savePsd.addEventListener('click', () => saveAs('psd:true'));
exportPng.addEventListener('click', () => saveAs('png'));

window.addEventListener('message', (event) => {
  if (event.source !== pp.contentWindow) return;
  if (event.data === 'done') {
    ppReady = true;
    editorStatus.textContent = 'Editor listo';
    if (window.__pendingPsd) {
      pp.contentWindow.postMessage(window.__pendingPsd, '*');
      window.__pendingPsd = null;
      setStatus('PSD cargado. Detectando capas…');
      return;
    }
    // If an image was just opened, Photopea sends done after it is ready.
    if (window.__pendingImageReplacement) {
      const { path } = window.__pendingImageReplacement;
      window.__pendingImageReplacement = null;
      const script = `
        (function(){
          var docs=app.documents;
          var main=docs[0];
          var img=docs[docs.length-1];
          if(docs.length<2){app.echoToOE(JSON.stringify({type:'error',message:'No se encontró el documento de imagen.'}));return;}
          var target=null;
          function find(parent){
            for(var i=0;i<parent.layers.length;i++){
              var l=parent.layers[i];
              if(l.name===${escJs(path[path.length-1])}){
                var p=l.parent,n=[]; while(p&&p!==main){n.unshift(p.name);p=p.parent;} n.push(l.name);
                if(JSON.stringify(n)===${escJs(JSON.stringify(path))}) target=l;
              }
              if(l.typename==='LayerSet') find(l);
            }
          }
          find(main);
          if(!target){app.echoToOE(JSON.stringify({type:'error',message:'No se encontró la capa destino.'}));return;}
          var src=img.layers[0];
          var old=[target.bounds[0],target.bounds[1],target.bounds[2],target.bounds[3]];
          var newLayer=src.duplicate(main);
          var nw=newLayer.bounds[2]-newLayer.bounds[0], nh=newLayer.bounds[3]-newLayer.bounds[1];
          var tw=old[2]-old[0], th=old[3]-old[1];
          if(nw>0&&nh>0){
            var scale=Math.max(tw/nw,th/nh)*100;
            newLayer.resize(scale,scale,AnchorPosition.MIDDLECENTER);
          }
          newLayer.translate((old[0]+old[2])/2-((newLayer.bounds[0]+newLayer.bounds[2])/2),(old[1]+old[3])/2-((newLayer.bounds[1]+newLayer.bounds[3])/2));
          newLayer.name=target.name;
          target.remove();
          if(img!==main) img.close(SaveOptions.DONOTSAVECHANGES);
          app.activeDocument=main;
          app.echoToOE(JSON.stringify({type:'ok',message:'Imagen reemplazada.'}));
        })();`;
      pp.contentWindow.postMessage(script, '*');
      replaceImage.textContent = 'Reemplazar imagen';
      setTimeout(() => { replaceImage.disabled = !selectedImageFile || !imageLayer.value; requestLayers(); }, 700);
      return;
    }
    if (currentPsd) requestLayers();
    return;
  }

  if (typeof event.data === 'string') {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'layers') renderLayers(msg);
      if (msg.type === 'ok') setStatus(msg.message || 'Listo.', true);
      if (msg.type === 'error') setStatus(msg.message || 'Ocurrió un error.');
    } catch (_) {}
    return;
  }

  if (event.data instanceof ArrayBuffer) {
    const blob = new Blob([event.data], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentName.textContent.replace(/\.psd$/i, '') + (editorStatus.textContent.includes('PNG') ? '.png' : '.psd');
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    editorStatus.textContent = 'Descarga lista';
  }
});

pp.addEventListener('load', () => {
  editorStatus.textContent = 'Conectando con Photopea…';
});
