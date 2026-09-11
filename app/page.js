"use client";

import { useState, useEffect, useRef } from "react";

const STATUS = [
  { id: "avaliacao", label: "Aguardando avaliação", dot: "bg-zinc-400", border: "border-l-zinc-400", text: "text-zinc-300" },
  { id: "peca", label: "Aguardando peça", dot: "bg-sky-500", border: "border-l-sky-500", text: "text-sky-400" },
  { id: "conserto", label: "Em conserto", dot: "bg-amber-500", border: "border-l-amber-500", text: "text-amber-400" },
  { id: "pronto", label: "Pronto", dot: "bg-emerald-500", border: "border-l-emerald-500", text: "text-emerald-400" },
  { id: "entregue", label: "Entregue", dot: "bg-zinc-600", border: "border-l-zinc-700", text: "text-zinc-500" },
];

const DEFAULT_CHECKLIST = [
  "Liga normalmente",
  "Tela sem trincos",
  "Bateria ok",
  "Botões funcionando",
  "Carcaça sem avarias",
  "Conector de carga ok",
  "Câmera ok",
  "Acessórios entregues (carregador, capa)",
].map((label, i) => ({ id: `d${i}`, label, checked: false }));

const MAX_PHOTOS = 6;

function statusInfo(id) {
  return STATUS.find((s) => s.id === id) || STATUS[0];
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyOrder() {
  return {
    id: "",
    numero: 0,
    cliente: "",
    telefone: "",
    aparelho: "",
    defeito: "",
    senha: "",
    orcamento: "",
    tecnico: "",
    status: "avaliacao",
    obs: "",
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, id: uid() })),
    entry_photos: [],
    exit_photos: [],
  };
}

function compressImage(file, maxDim = 900, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoPicker({ label, photos, onAdd, onRemove, uploading }) {
  const inputRef = useRef(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_PHOTOS - photos.length;
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        const dataUrl = await compressImage(file);
        onAdd(dataUrl);
      } catch (err) {}
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <span className="text-xs text-zinc-600">{photos.length}/{MAX_PHOTOS}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-950/80 text-zinc-200 text-xs leading-5"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border border-dashed border-zinc-700 text-zinc-500 text-xs flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            {uploading ? "Enviando…" : "Foto"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </section>
  );
}

export default function Home() {
  const [orders, setOrders] = useState(null);
  const [view, setView] = useState("list");
  const [current, setCurrent] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [uploadingEntry, setUploadingEntry] = useState(false);
  const [uploadingExit, setUploadingExit] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrders([]);
      setError("Não consegui carregar as ordens.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setCurrent(emptyOrder());
    setError("");
    setNewItemLabel("");
    setView("form");
  }

  function openEdit(order) {
    setCurrent({ ...order });
    setError("");
    setNewItemLabel("");
    setView("form");
  }

  async function saveOrder() {
    if (!current.cliente.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!current.aparelho.trim()) {
      setError("Informe o aparelho.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (current.id) {
        await fetch(`/api/orders/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(current),
        });
      } else {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(current),
        });
      }
      await load();
      setView("list");
      setCurrent(null);
    } catch (e) {
      setError("Não consegui salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatusQuick(order, statusId) {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, status: statusId }),
      });
      await load();
    } catch (e) {}
  }

  function toggleChecklistItem(itemId) {
    setCurrent({
      ...current,
      checklist: current.checklist.map((c) => (c.id === itemId ? { ...c, checked: !c.checked } : c)),
    });
  }

  function removeChecklistItem(itemId) {
    setCurrent({
      ...current,
      checklist: current.checklist.filter((c) => c.id !== itemId),
    });
  }

  function addChecklistItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    setCurrent({
      ...current,
      checklist: [...current.checklist, { id: uid(), label, checked: false }],
    });
    setNewItemLabel("");
  }

  async function uploadPhoto(dataUrl) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no upload");
    return data.url;
  }

  async function addEntryPhoto(dataUrl) {
    setUploadingEntry(true);
    try {
      const url = await uploadPhoto(dataUrl);
      setCurrent((c) => ({ ...c, entry_photos: [...c.entry_photos, url] }));
    } catch (e) {
      setError("Não consegui enviar a foto.");
    } finally {
      setUploadingEntry(false);
    }
  }

  async function addExitPhoto(dataUrl) {
    setUploadingExit(true);
    try {
      const url = await uploadPhoto(dataUrl);
      setCurrent((c) => ({ ...c, exit_photos: [...c.exit_photos, url] }));
    } catch (e) {
      setError("Não consegui enviar a foto.");
    } finally {
      setUploadingExit(false);
    }
  }

  const filtered = (orders || []).filter((o) => {
    const matchesFilter = filter === "todos" || o.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.cliente?.toLowerCase().includes(q) ||
      o.aparelho?.toLowerCase().includes(q) ||
      String(o.numero).includes(q);
    return matchesFilter && matchesQuery;
  });

  const counts = STATUS.reduce((acc, s) => {
    acc[s.id] = (orders || []).filter((o) => o.status === s.id).length;
    return acc;
  }, {});

  if (view === "form" && current) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-10">
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 z-10">
          <button
            onClick={() => {
              setView("list");
              setCurrent(null);
            }}
            className="text-zinc-400 text-sm"
          >
            Cancelar
          </button>
          <h1 className="text-base font-medium flex-1 text-center">
            {current.id ? `OS #${current.numero}` : "Nova OS"}
          </h1>
          <button
            onClick={saveOrder}
            disabled={saving}
            className="text-amber-400 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>

        <div className="p-4 space-y-5">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Cliente</p>
            <input
              placeholder="Nome do cliente"
              value={current.cliente}
              onChange={(e) => setCurrent({ ...current, cliente: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <input
              placeholder="Telefone"
              value={current.telefone}
              onChange={(e) => setCurrent({ ...current, telefone: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </section>

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Aparelho</p>
            <input
              placeholder="Ex: iPhone 12, Notebook Dell i5"
              value={current.aparelho}
              onChange={(e) => setCurrent({ ...current, aparelho: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <textarea
              placeholder="Defeito relatado pelo cliente"
              value={current.defeito}
              onChange={(e) => setCurrent({ ...current, defeito: e.target.value })}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
            />
            <input
              placeholder="Senha / padrão de desbloqueio (opcional)"
              value={current.senha}
              onChange={(e) => setCurrent({ ...current, senha: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Checklist de vistoria</p>
            <div className="space-y-1.5">
              {current.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5"
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${
                      item.checked
                        ? "bg-amber-500 border-amber-500 text-zinc-950"
                        : "border-zinc-600 text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <span
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`flex-1 text-sm ${item.checked ? "text-zinc-300" : "text-zinc-400"}`}
                  >
                    {item.label}
                  </span>
                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="shrink-0 text-zinc-600 text-sm px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Adicionar item ao checklist"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={addChecklistItem}
                className="shrink-0 border border-zinc-700 text-zinc-300 text-sm px-3 rounded-lg"
              >
                Adicionar
              </button>
            </div>
          </section>

          <PhotoPicker
            label="Fotos de entrada"
            photos={current.entry_photos}
            uploading={uploadingEntry}
            onAdd={addEntryPhoto}
            onRemove={(i) =>
              setCurrent({ ...current, entry_photos: current.entry_photos.filter((_, idx) => idx !== i) })
            }
          />

          <PhotoPicker
            label="Fotos de saída"
            photos={current.exit_photos}
            uploading={uploadingExit}
            onAdd={addExitPhoto}
            onRemove={(i) =>
              setCurrent({ ...current, exit_photos: current.exit_photos.filter((_, idx) => idx !== i) })
            }
          />

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Serviço</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Orçamento (R$)"
                inputMode="decimal"
                value={current.orcamento}
                onChange={(e) => setCurrent({ ...current, orcamento: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <input
                placeholder="Técnico responsável"
                value={current.tecnico}
                onChange={(e) => setCurrent({ ...current, tecnico: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Status</label>
              <select
                value={current.status}
                onChange={(e) => setCurrent({ ...current, status: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm"
              >
                {STATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Observações internas"
              value={current.obs}
              onChange={(e) => setCurrent({ ...current, obs: e.target.value })}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 pt-4 pb-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-medium">Ordens de serviço</h1>
          <button
            onClick={openNew}
            className="bg-amber-500 text-zinc-950 text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            + Nova OS
          </button>
        </div>
        <input
          placeholder="Buscar por cliente, aparelho ou número"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 mb-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setFilter("todos")}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
              filter === "todos"
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            Todos ({(orders || []).length})
          </button>
          {STATUS.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                filter === s.id
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label} ({counts[s.id] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        {orders === null && (
          <p className="text-sm text-zinc-500 py-10 text-center">Carregando ordens…</p>
        )}

        {orders !== null && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm text-zinc-400 mb-1">Nenhuma ordem encontrada.</p>
            <p className="text-xs text-zinc-600">
              {(orders || []).length === 0
                ? "Toque em + Nova OS para registrar o primeiro aparelho."
                : "Tente outro filtro ou termo de busca."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((o) => {
            const s = statusInfo(o.status);
            const checkedCount = (o.checklist || []).filter((c) => c.checked).length;
            const totalCount = (o.checklist || []).length;
            return (
              <div
                key={o.id}
                onClick={() => openEdit(o)}
                className={`bg-zinc-900 border border-zinc-800 border-l-4 ${s.border} rounded-lg px-3 py-3 cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-zinc-500">OS #{o.numero}</span>
                  <span className={`text-xs ${s.text}`}>{s.label}</span>
                </div>
                <p className="text-sm font-medium">{o.cliente}</p>
                <p className="text-xs text-zinc-500">{o.aparelho}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                  {o.orcamento && <span>Orçamento: R$ {o.orcamento}</span>}
                  {totalCount > 0 && (
                    <span>
                      Checklist: {checkedCount}/{totalCount}
                    </span>
                  )}
                  {(o.entry_photos?.length > 0 || o.exit_photos?.length > 0) && (
                    <span>
                      Fotos: {o.entry_photos?.length || 0} entrada, {o.exit_photos?.length || 0} saída
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 mt-2 overflow-x-auto">
                  {STATUS.map((st) => (
                    <button
                      key={st.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusQuick(o, st.id);
                      }}
                      className={`shrink-0 w-2.5 h-2.5 rounded-full ${st.dot} ${
                        o.status === st.id ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-zinc-100" : "opacity-40"
                      }`}
                      title={st.label}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
