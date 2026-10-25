import React, { useCallback, useEffect, useRef, useState } from 'react';
import ScriptEditor from './ScriptEditor';
import Prompter from './Prompter';
import { TP_KEYS, createScriptItem, loadLibrary, loadSettings, saveJSON } from './storage';
import './teleprompter.css';

// Ajusta <head> solo mientras /tp está montado y deja todo como estaba al salir:
// título, noindex, viewport con zona segura del iPhone y manifest propio para instalar /tp como app.
function useTeleprompterHead() {
  useEffect(() => {
    const restores = [];
    const setAttr = (selector, create, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement(create.tag);
        Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
        restores.push(() => el.remove());
      } else {
        const prev = el.getAttribute(attr);
        restores.push(() => el.setAttribute(attr, prev));
      }
      el.setAttribute(attr, value);
    };

    const prevTitle = document.title;
    document.title = 'Teleprompter · Capa Cero 3D';
    restores.push(() => { document.title = prevTitle; });

    setAttr('meta[name="robots"]', { tag: 'meta', attrs: { name: 'robots' } }, 'content', 'noindex, nofollow');
    setAttr('meta[name="viewport"]', { tag: 'meta', attrs: { name: 'viewport' } }, 'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover');
    setAttr('link[rel="manifest"]', { tag: 'link', attrs: { rel: 'manifest' } }, 'href', '/tp.webmanifest');
    setAttr('meta[name="apple-mobile-web-app-title"]', { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title' } }, 'content', 'Teleprompter');

    document.documentElement.classList.add('tp-active');
    document.body.classList.add('tp-active');
    restores.push(() => {
      document.documentElement.classList.remove('tp-active');
      document.body.classList.remove('tp-active');
    });

    return () => restores.reverse().forEach(fn => fn());
  }, []);
}

// Estado de instalación como app (PWA)
function useInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  useEffect(() => {
    const onPrompt = e => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const prompt = deferred
    ? async () => {
        deferred.prompt();
        await deferred.userChoice.catch(() => {});
        setDeferred(null);
      }
    : null;
  return { installed, prompt };
}

export default function TeleprompterEntry() {
  useTeleprompterHead();
  const install = useInstall();
  const [mode, setMode] = useState('edit');
  const [lib, setLib] = useState(loadLibrary);
  const [settings, setSettings] = useState(loadSettings);

  const update = useCallback(partial => setSettings(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    saveJSON(TP_KEYS.settings, settings);
  }, [settings]);

  const script = lib.items.find(i => i.id === lib.currentId) || lib.items[0];

  // El guion abierto se edita dentro de la biblioteca
  const setScript = useCallback(
    next =>
      setLib(l => ({
        ...l,
        items: l.items.map(i => (i.id === l.currentId ? { ...i, ...next, updatedAt: Date.now() } : i)),
      })),
    []
  );

  // Guardado de la biblioteca con un pequeño retardo para no escribir en cada tecla
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveJSON(TP_KEYS.library, lib.items);
      saveJSON(TP_KEYS.current, lib.currentId);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [lib]);

  const library = {
    items: lib.items,
    currentId: lib.currentId,
    open: id => setLib(l => ({ ...l, currentId: id })),
    create: () =>
      setLib(l => {
        const item = createScriptItem({ name: `Guion ${l.items.length + 1}`, text: '', format: 'md' });
        return { items: [...l.items, item], currentId: item.id };
      }),
    rename: id => {
      const item = lib.items.find(i => i.id === id);
      const name = window.prompt('Nombre del guion', item?.name || '');
      if (name !== null && name.trim()) setLib(l => ({ ...l, items: l.items.map(i => (i.id === id ? { ...i, name: name.trim() } : i)) }));
    },
    duplicate: id =>
      setLib(l => {
        const src = l.items.find(i => i.id === id);
        if (!src) return l;
        const item = createScriptItem({ name: `${src.name} (copia)`, text: src.text, format: src.format });
        return { items: [...l.items, item], currentId: item.id };
      }),
    remove: id => {
      const item = lib.items.find(i => i.id === id);
      if (!window.confirm(`¿Borrar «${item?.name || 'este guion'}»? No se puede recuperar.`)) return;
      setLib(l => {
        let items = l.items.filter(i => i.id !== id);
        if (!items.length) items = [createScriptItem({ name: 'Guion 1', text: '', format: 'md' })];
        return { items, currentId: l.currentId === id ? items[0].id : l.currentId };
      });
    },
  };

  if (mode === 'read') {
    return (
      <div className="tp-root">
        <Prompter script={script} settings={settings} update={update} onExit={() => setMode('edit')} />
      </div>
    );
  }

  return (
    <div className="tp-root">
      <ScriptEditor
        script={script}
        setScript={setScript}
        settings={settings}
        update={update}
        install={install}
        library={library}
        onStart={() => {
          saveJSON(TP_KEYS.library, lib.items);
          saveJSON(TP_KEYS.current, lib.currentId);
          setMode('read');
        }}
      />
    </div>
  );
}
