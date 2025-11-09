import "./styles.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const STORAGE_KEY = "kimecube.devspace.v1";

const initialFS: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DevSpace App</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Привет, DevSpace!</h1>
    <p>Измени файлы слева и жми ▶️ Run.</p>
    <script src="app.js"></script>
  </body>
</html>`,
  "style.css": `:root{--bg:#0b0e16;--fg:#e6e6e6;--muted:#8e8e93;--accent:#0a84ff}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,Segoe UI,Roboto}
h1{font-weight:700}
p{color:var(--muted)}`,
  "app.js": `console.log('DevSpace ready');
const p=document.createElement('p');
p.textContent='JS подключен ✅';
document.body.appendChild(p);`,
};

function loadFS(): Record<string, string> {
  if (typeof window === "undefined") {
    return initialFS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialFS;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    return { ...initialFS, ...parsed };
  } catch {
    return initialFS;
  }
}

function saveFS(fs: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
}

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function Editor({ value, onChange }: EditorProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="editor-textarea"
      spellCheck={false}
    />
  );
}

function MobileDevSpace() {
  const [fs, setFs] = useState<Record<string, string>>(loadFS);
  const [openFiles, setOpenFiles] = useState<string[]>(["index.html"]);
  const [active, setActive] = useState<string>("index.html");
  const [iframeKey, setIframeKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    saveFS(fs);
  }, [fs]);

  const srcDoc = useMemo(() => {
    const html = fs["index.html"] ?? "";
    const css = fs["style.css"] ?? "";
    const js = fs["app.js"] ?? "";

    return html
      .replace(
        /<link[^>]*href=["']style.css["'][^>]*>/i,
        () => `<style>${css}</style>`
      )
      .replace(
        /<script[^>]*src=["']app.js["'][^>]*><\/script>/i,
        () => `<script>\n${js}\n<\/script>`
      );
  }, [fs, iframeKey]);

  const addFile = () => {
    const base = window.prompt("Имя файла (пример: script2.js)", "script2.js");
    if (!base) {
      return;
    }

    if (fs[base]) {
      window.alert("Такой файл уже существует");
      return;
    }

    const next = { ...fs, [base]: "" };
    setFs(next);
    setOpenFiles((prev) => Array.from(new Set([...prev, base])));
    setActive(base);
  };

  const deleteFile = (name: string) => {
    if (!window.confirm(`Удалить ${name}?`)) {
      return;
    }

    const { [name]: _removed, ...rest } = fs;
    setFs(rest);
    setOpenFiles((prev) => prev.filter((file) => file !== name));

    if (active === name) {
      const nextActive = Object.keys(rest)[0] ?? "index.html";
      setActive(nextActive);
    }
  };

  const renameFile = (oldName: string) => {
    const newName = window.prompt("Новое имя", oldName);
    if (!newName || newName === oldName) {
      return;
    }

    if (fs[newName]) {
      window.alert("Имя занято");
      return;
    }

    const next = { ...fs };
    next[newName] = next[oldName];
    delete next[oldName];

    setFs(next);
    setOpenFiles((prev) =>
      prev.map((file) => (file === oldName ? newName : file))
    );

    if (active === oldName) {
      setActive(newName);
    }
  };

  const run = () => setIframeKey((key) => key + 1);

  const reset = () => {
    if (!window.confirm("Сбросить проект к шаблону?")) {
      return;
    }

    setFs(initialFS);
    setOpenFiles(["index.html"]);
    setActive("index.html");
    setIframeKey((key) => key + 1);
  };

  return (
    <div className="devspace">
      <div className="topbar">
        <button
          type="button"
          onClick={() => setSidebarOpen((previous) => !previous)}
          className="icon-button"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <h1 className="topbar__title">KimeCube DevSpace</h1>
        <div className="topbar__actions">
          <button type="button" onClick={run} className="primary-button">
            ▶️ Run
          </button>
          <button type="button" onClick={reset} className="secondary-button">
            Reset
          </button>
        </div>
      </div>

      <div className="content">
        <div className="panel panel--editor">
          <div className="panel__header">
            <span className="panel__title">Файлы проекта</span>
            <div className="panel__header-actions">
              <button
                type="button"
                onClick={addFile}
                className="icon-button"
              >
                ＋
              </button>
            </div>
          </div>

          <div
            className="file-grid"
            style={{ maxHeight: sidebarOpen ? 256 : 0 }}
          >
            <div className="file-grid__inner">
              {Object.keys(fs).map((name) => {
                const isActive = active === name;

                return (
                  <div
                    key={name}
                    className={`file-card${isActive ? " file-card--active" : ""}`}
                    onClick={() => {
                      setActive(name);
                      setOpenFiles((prev) =>
                        Array.from(new Set([name, ...prev]))
                      );
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActive(name);
                        setOpenFiles((prev) =>
                          Array.from(new Set([name, ...prev]))
                        );
                      }
                    }}
                  >
                    <span className="file-card__name" title={name}>
                      {name}
                    </span>
                    <div className="file-card__actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          renameFile(name);
                        }}
                        className="pill-button"
                      >
                        rename
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteFile(name);
                        }}
                        className="pill-button"
                      >
                        del
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tabs" role="tablist">
            {openFiles.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActive(name)}
                className={`tab${active === name ? " tab--active" : ""}`}
                role="tab"
                aria-selected={active === name}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="editor-wrapper">
            <Editor
              value={fs[active] ?? ""}
              onChange={(value) =>
                setFs((previous) => ({ ...previous, [active]: value }))
              }
            />
          </div>

          <div className="muted-text">
            Автосохранение включено · Локально (offline‑first)
          </div>
        </div>

        <div className="panel panel--preview">
          <div className="panel__header">
            <span className="panel__title">Предпросмотр</span>
            <div className="panel__header-actions">
              <button type="button" onClick={run} className="primary-button">
                Перезапустить
              </button>
            </div>
          </div>

          <div className="preview-frame">
            <iframe
              key={iframeKey}
              title="preview"
              sandbox="allow-scripts allow-same-origin"
              className="preview-frame__iframe"
              srcDoc={srcDoc}
            />
          </div>

          <div className="muted-text">
            Поддержка multi‑file превью через inline packer. Для продвинутого
            режима можно подключить WebContainer/Service Worker bundling.
          </div>
        </div>
      </div>

      <div className="footer">
        <span>План:</span>
        <span className="tag">Git Sync</span>
        <span className="tag">PWA install</span>
        <span className="tag">Assets/Projects</span>
        <span className="tag">WebContainer</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<MobileDevSpace />);
