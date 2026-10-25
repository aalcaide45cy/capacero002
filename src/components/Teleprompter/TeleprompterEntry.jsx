import React, { useCallback, useEffect, useRef, useState } from 'react';
import ScriptEditor from './ScriptEditor';
import Prompter from './Prompter';
import { TP_KEYS, loadScript, loadSettings, saveJSON } from './storage';
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
      'width=device-width, initial-scale=1.0, viewport-fit=cover');
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
  const [script, setScript] = useState(loadScript);
  const [settings, setSettings] = useState(loadSettings);

  const update = useCallback(partial => setSettings(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    saveJSON(TP_KEYS.settings, settings);
  }, [settings]);

  // Guardado del guion con un pequeño retardo para no escribir en cada tecla
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveJSON(TP_KEYS.script, script), 400);
    return () => clearTimeout(saveTimer.current);
  }, [script]);

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
        onStart={() => {
          saveJSON(TP_KEYS.script, script);
          setMode('read');
        }}
      />
    </div>
  );
}
