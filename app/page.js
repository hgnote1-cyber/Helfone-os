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
    cpf: "",
    aparelho: "",
    imei: "",
    defeito: "",
    senha: "",
    orcamento: "",
    forma_pagamento: "",
    valor_pago: "",
    garantia_dias: "90",
    data_pagamento: "",
    tecnico: "",
    status: "avaliacao",
    obs: "",
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, id: uid() })),
    entry_photos: [],
    exit_photos: [],
    status_history: [],
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

function formatCpf(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

function normalizePhoneBR(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  if (digits.startsWith("55") && digits.length > 11) {
    return digits;
  }
  return `55${digits}`;
}

function whatsappLink(order, origin) {
  const s = statusInfo(order.status);
  const withCountry = normalizePhoneBR(order.telefone);
  if (!withCountry) return null;
  const trackUrl = origin && order.id ? `${origin}/acompanhar/${order.id}` : "";
  const msg = `Olá ${order.cliente || ""}! Sobre o seu ${order.aparelho || "aparelho"} (OS #${order.numero}): status atual é "${s.label}".${
    trackUrl ? ` Acompanhe por aqui: ${trackUrl}` : ""
  }`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
}

function exportCsv(orders) {
  const headers = ["numero", "cliente", "telefone", "cpf", "aparelho", "imei", "defeito", "status", "orcamento", "tecnico", "criado_em"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [o.numero, o.cliente, o.telefone, o.cpf, o.aparelho, o.imei, o.defeito, statusInfo(o.status).label, o.orcamento, o.tecnico, o.created_at]
      .map(escape)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ordens-helfone-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STORE = {
  nome: "HELFONE ASSISTENCIA",
  cnpj: "27.474.624/0001-05",
  endereco: "Rua Dona Antonia de Queiroz, 439 - Consolação",
  cidade: "São Paulo",
  telefone: "(11) 98839-0194",
  instagram: "@helfone1",
};

function storeHeaderLines() {
  const eq = "================================";
  return [
    eq,
    STORE.nome,
    `CNPJ: ${STORE.cnpj}`,
    STORE.endereco,
    STORE.cidade,
    `Tel/Whats: ${STORE.telefone}`,
    `Insta: ${STORE.instagram}`,
    eq,
  ];
}

function storeHeaderHtml() {
  return `
    <div style="text-align:center; margin-bottom:14px;">
      <div style="font-weight:bold; font-size:15px;">${STORE.nome}</div>
      <div>CNPJ: ${STORE.cnpj}</div>
      <div>${STORE.endereco}</div>
      <div>${STORE.cidade}</div>
      <div>Tel/Whats: ${STORE.telefone} | Insta: ${STORE.instagram}</div>
    </div>
    <div style="border-top:1px dashed #999; margin-bottom:10px;"></div>
  `;
}

function buildReceiptText(order, variant) {
  const sep = "--------------------------------";
  const lines = [];
  lines.push(...storeHeaderLines());
  lines.push(`OS #${order.numero}`);
  if (variant === "interno") {
    lines.push(`Status: ${statusInfo(order.status).label}`);
  }
  lines.push(sep);
  lines.push("CLIENTE");
  lines.push(order.cliente || "");
  if (order.telefone) lines.push(order.telefone);
  if (order.cpf) lines.push(`CPF: ${order.cpf}`);
  lines.push(sep);
  lines.push("APARELHO");
  lines.push(order.aparelho || "");
  if (order.imei) lines.push(`IMEI: ${order.imei}`);
  lines.push(order.defeito || "");
  lines.push(sep);
  lines.push("CHECKLIST");
  (order.checklist || []).forEach((c) => {
    lines.push(`[${c.checked ? "x" : " "}] ${c.label}`);
  });
  lines.push(sep);
  lines.push(`Orcamento: R$ ${order.orcamento || "-"}`);
  if (variant === "interno") {
    lines.push(`Tecnico: ${order.tecnico || "-"}`);
    lines.push(sep);
    lines.push("OBS:");
    lines.push(order.obs || "-");
  } else {
    lines.push(sep);
    lines.push("Declaro estar de acordo com os");
    lines.push("dados e orcamento acima.");
    lines.push("");
    lines.push("Assinatura:");
    lines.push("______________________");
  }
  return lines.join("\n");
}

const PAGAMENTO_LABELS = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Cartão débito",
  credito: "Cartão crédito",
};

function buildPaymentReceiptText(order) {
  const eq = "================================";
  const lines = [];
  lines.push(...storeHeaderLines());
  const now = order.data_pagamento ? new Date(order.data_pagamento) : new Date();
  const dataStr = now.toISOString().slice(0, 10);
  const horaStr = now.toTimeString().slice(0, 8);
  lines.push(`Cupom No: ${String(order.numero).padStart(6, "0")}  Data: ${dataStr} ${horaStr}`);
  lines.push(`Cliente: ${order.cliente || "Cliente Avulso"}`);
  if (order.tecnico) lines.push(`Operador: ${order.tecnico}`);
  lines.push(eq);
  lines.push("CODIGO  DESCRICAO           QTD  SUBTOT");
  lines.push("--------------------------------");
  const desc = (order.aparelho || "Servico").slice(0, 18).padEnd(18, " ");
  lines.push(`OS#${order.numero}  ${desc} 1   R$${order.valor_pago || "-"}`);
  lines.push("--------------------------------");
  lines.push(`SUBTOTAL: R$ ${order.valor_pago || "-"}`);
  lines.push(`TOTAL: R$ ${order.valor_pago || "-"}`);
  lines.push(`FORMA PAGTO: ${PAGAMENTO_LABELS[order.forma_pagamento] || "-"}`);
  lines.push(eq);
  lines.push("Obrigado pela preferencia!");
  lines.push(`Garantia de ${order.garantia_dias || "90"} dias contra defeitos de`);
  lines.push("fabricacao. Nao cobre mau uso, quedas,");
  lines.push("umidade ou violacao do produto.");
  lines.push(eq);
  return lines.join("\n");
}

function printThermalDirect(order, variant) {
  const text =
    variant === "pagamento" ? buildPaymentReceiptText(order) : buildReceiptText(order, variant);
  const b64 = btoa(unescape(encodeURIComponent(text)));
  window.location.href = `rawbt:base64,${b64}`;
}

function printPaymentReceipt(order, size = "a4") {
  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups pra este site e tente de novo.");
    return;
  }
  const now = order.data_pagamento ? new Date(order.data_pagamento) : new Date();
  const dataStr = now.toISOString().slice(0, 10);
  const horaStr = now.toTimeString().slice(0, 8);
  win.document.write(`
    <html>
    <head>
      <title>OS #${order.numero} - Cupom de pagamento</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: "Courier New", monospace; color: #111; margin: 0; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .eq { border-top: 1px dashed #333; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .totals { font-size: 13px; margin-top: 6px; }
        .totals .row { display: flex; justify-content: space-between; }
        .garantia { font-size: 11px; margin-top: 14px; line-height: 1.5; text-align: center; }
        ${paperCss(size)}
      </style>
    </head>
    <body>
      ${storeHeaderHtml()}

      <div>Cupom No: ${String(order.numero).padStart(6, "0")}&nbsp;&nbsp;Data: ${dataStr} ${horaStr}</div>
      <div>Cliente: ${order.cliente || "Cliente Avulso"}</div>
      ${order.tecnico ? `<div>Operador: ${order.tecnico}</div>` : ""}
      <div class="eq"></div>

      <table>
        <tr class="bold"><td>Descrição</td><td class="right">Qtd</td><td class="right">Subtotal</td></tr>
        <tr><td>${order.aparelho || "Serviço"} (OS #${order.numero})</td><td class="right">1</td><td class="right">R$ ${order.valor_pago || "-"}</td></tr>
      </table>

      <div class="eq"></div>
      <div class="totals">
        <div class="row"><span>SUBTOTAL:</span><span>R$ ${order.valor_pago || "-"}</span></div>
        <div class="row bold"><span>TOTAL:</span><span>R$ ${order.valor_pago || "-"}</span></div>
        <div class="row"><span>FORMA PAGTO:</span><span>${PAGAMENTO_LABELS[order.forma_pagamento] || "-"}</span></div>
      </div>
      <div class="eq"></div>

      <div class="garantia">
        Obrigado pela preferência!<br/>
        Garantia de ${order.garantia_dias || "90"} dias contra defeitos de fabricação.
        Não cobre mau uso, quedas, umidade ou violação do produto.
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function paperCss(size) {
  if (size === "80mm") {
    return `
      @page { size: 80mm auto; margin: 2mm; }
      body { width: 76mm; font-size: 11px; padding: 0; }
      h1 { font-size: 13px; }
      .store, .muted { font-size: 9px; }
      .label { font-size: 8px; }
      .row, .item { font-size: 11px; }
      .terms { font-size: 9px; }
      .sign-line { margin-top: 22px !important; font-size: 10px; }
    `;
  }
  if (size === "58mm") {
    return `
      @page { size: 58mm auto; margin: 2mm; }
      body { width: 54mm; font-size: 10px; padding: 0; }
      h1 { font-size: 11px; }
      .store, .muted { font-size: 8px; }
      .label { font-size: 7px; }
      .row, .item { font-size: 10px; }
      .terms { font-size: 8px; }
      .sign-line { margin-top: 16px !important; font-size: 9px; }
    `;
  }
  return `
    @page { size: A4; margin: 15mm; }
    body { max-width: 480px; padding: 24px; }
  `;
}

function printCustomerReceipt(order, size = "a4") {
  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups pra este site e tente de novo.");
    return;
  }
  const checklistHtml = (order.checklist || [])
    .map((c) => `<div class="item">[${c.checked ? "x" : " "}] ${c.label}</div>`)
    .join("");
  const dataEntrada = order.created_at
    ? new Date(order.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  win.document.write(`
    <html>
    <head>
      <title>OS #${order.numero} - Via do cliente</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .store { font-size: 12px; color: #666; margin-bottom: 18px; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 3px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
        .item { font-size: 13px; }
        .terms { font-size: 11px; color: #555; margin: 18px 0; line-height: 1.5; }
        .sign { margin-top: 40px; }
        .sign-line { border-top: 1px solid #111; width: 100%; margin-top: 40px; padding-top: 4px; font-size: 12px; text-align: center; }
        ${paperCss(size)}
      </style>
    </head>
    <body>
      <h1>Helfone - Assistência Técnica e Acessórios</h1>
      <div class="store">Rua Dona Antonia de Queiroz, 439 - Consolação, São Paulo &middot; OS #${order.numero} &middot; ${dataEntrada}</div>

      <div class="section">
        <div class="label">Cliente</div>
        <div>${order.cliente || ""}</div>
        <div>${order.telefone || ""}</div>
        ${order.cpf ? `<div>CPF: ${order.cpf}</div>` : ""}
      </div>

      <div class="section">
        <div class="label">Aparelho</div>
        <div>${order.aparelho || ""}</div>
        ${order.imei ? `<div>IMEI: ${order.imei}</div>` : ""}
      </div>

      <div class="section">
        <div class="label">Defeito relatado</div>
        <div>${(order.defeito || "-").replace(/\n/g, "<br/>")}</div>
      </div>

      <div class="section">
        <div class="label">Condição na entrada (checklist)</div>
        ${checklistHtml || "-"}
      </div>

      <div class="section" style="border-bottom:none;">
        <div class="row"><span>Orçamento previsto</span><span>R$ ${order.orcamento || "a definir"}</span></div>
      </div>

      <div class="terms">
        Declaro estar de acordo com a descrição do aparelho e do defeito relatado acima,
        bem como com o orçamento previsto informado pela loja.
      </div>

      <div class="sign">
        <div class="sign-line">Assinatura do cliente</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function printOrder(order, size = "a4") {
  const s = statusInfo(order.status);
  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups pra este site e tente de novo.");
    return;
  }
  const checklistHtml = (order.checklist || [])
    .map((c) => `<div class="item">[${c.checked ? "x" : " "}] ${c.label}</div>`)
    .join("");
  win.document.write(`
    <html>
    <head>
      <title>OS #${order.numero}</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .muted { color: #666; font-size: 13px; margin-bottom: 18px; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 3px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
        .item { font-size: 13px; }
        ${paperCss(size)}
      </style>
    </head>
    <body>
      <h1>Helfone - Ordem de Serviço #${order.numero}</h1>
      <div class="muted">Status: ${s.label}</div>

      <div class="section">
        <div class="label">Cliente</div>
        <div>${order.cliente || ""}</div>
        <div>${order.telefone || ""}</div>
        ${order.cpf ? `<div>CPF: ${order.cpf}</div>` : ""}
      </div>

      <div class="section">
        <div class="label">Aparelho</div>
        <div>${order.aparelho || ""}</div>
        ${order.imei ? `<div>IMEI: ${order.imei}</div>` : ""}
        <div>${(order.defeito || "").replace(/\n/g, "<br/>")}</div>
      </div>

      <div class="section">
        <div class="label">Checklist</div>
        ${checklistHtml || "-"}
      </div>

      <div class="section">
        <div class="row"><span>Orçamento</span><span>R$ ${order.orcamento || "-"}</span></div>
        <div class="row"><span>Técnico</span><span>${order.tecnico || "-"}</span></div>
      </div>

      <div class="section" style="border-bottom:none;">
        <div class="label">Observações</div>
        <div>${(order.obs || "-").replace(/\n/g, "<br/>")}</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function PhotoPicker({ label, photos, onAdd, onRemove, onView, uploading }) {
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
          <div key={i} className="relative aspect-square">
            <div className="w-full h-full rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
              <img
                src={src}
                alt=""
                onClick={() => onView(src)}
                className="w-full h-full object-cover cursor-pointer"
              />
            </div>
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-8 h-8 rounded-full bg-red-600 text-white text-lg leading-8 shadow-lg border-2 border-zinc-950"
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
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [hideDelivered, setHideDelivered] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [printChoice, setPrintChoice] = useState(null);
  const initialStatusRef = useRef(null);
  const originRef = useRef("");

  useEffect(() => {
    originRef.current = window.location.origin;
  }, []);

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
    const fresh = emptyOrder();
    setCurrent(fresh);
    initialStatusRef.current = fresh.status;
    setError("");
    setNewItemLabel("");
    setView("form");
  }

  function openEdit(order) {
    setCurrent({ ...order });
    initialStatusRef.current = order.status;
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
    const statusChanged = current.status !== initialStatusRef.current;
    if (statusChanged && current.status === "entregue") {
      const confirmed = window.confirm("Confirma que essa OS foi entregue ao cliente?");
      if (!confirmed) return;
    }
    setError("");
    setSaving(true);
    try {
      const baseHistory = current.status_history || [];
      const status_history = statusChanged
        ? [...baseHistory, { status: current.status, at: new Date().toISOString() }]
        : baseHistory.length > 0
        ? baseHistory
        : [{ status: current.status, at: new Date().toISOString() }];
      const payload = { ...current, status_history };

      let res;
      if (current.id) {
        res = await fetch(`/api/orders/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "O servidor recusou o salvamento.");
        setSaving(false);
        return;
      }
      await load();
      setView("list");
      setCurrent(null);
    } catch (e) {
      setError("Não consegui salvar. Confira sua conexão e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!current?.id) return;
    const confirmed = window.confirm(`Excluir a OS #${current.numero} definitivamente? Isso não pode ser desfeito.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await fetch(`/api/orders/${current.id}`, { method: "DELETE" });
      await load();
      setView("list");
      setCurrent(null);
    } catch (e) {
      setError("Não consegui excluir. Tente de novo.");
    } finally {
      setDeleting(false);
    }
  }

  async function setStatusQuick(order, statusId) {
    if (statusId === order.status) return;
    if (statusId === "entregue") {
      const confirmed = window.confirm(`Confirma que a OS #${order.numero} foi entregue ao cliente?`);
      if (!confirmed) return;
    }
    const status_history = [...(order.status_history || []), { status: statusId, at: new Date().toISOString() }];
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, status: statusId, status_history }),
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
    const hiddenByArchive = filter === "todos" && hideDelivered && o.status === "entregue";
    const q = query.trim().toLowerCase();
    const qDigits = query.replace(/\D/g, "");
    const matchesQuery =
      !q ||
      o.cliente?.toLowerCase().includes(q) ||
      o.aparelho?.toLowerCase().includes(q) ||
      String(o.numero).includes(q) ||
      (qDigits && (o.telefone || "").replace(/\D/g, "").includes(qDigits)) ||
      (qDigits && (o.cpf || "").replace(/\D/g, "").includes(qDigits)) ||
      (qDigits && (o.imei || "").includes(qDigits));
    return matchesFilter && !hiddenByArchive && matchesQuery;
  });

  const counts = STATUS.reduce((acc, s) => {
    acc[s.id] = (orders || []).filter((o) => o.status === s.id).length;
    return acc;
  }, {});

  const waLink = current ? whatsappLink(current, originRef.current) : null;

  if (view === "form" && current) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-10">
        <div className="max-w-2xl mx-auto">
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

        {current.id && (
          <div className="px-4 pt-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setPrintChoice("interno")}
                className="flex-1 border border-zinc-700 text-zinc-300 text-sm py-2 rounded-lg"
              >
                Imprimir (interno)
              </button>
              <button
                onClick={() => setPrintChoice("cliente")}
                className="flex-1 border border-zinc-700 text-zinc-300 text-sm py-2 rounded-lg"
              >
                Via do cliente (assinar)
              </button>
            </div>
            <div className="flex gap-2">
              {waLink ? (
                <button
                  onClick={() => {
                    window.location.href = waLink;
                  }}
                  className="flex-1 text-center bg-emerald-600 text-white text-sm py-2 rounded-lg"
                >
                  Avisar por WhatsApp
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 border border-zinc-800 text-zinc-600 text-sm py-2 rounded-lg"
                  title="Preencha o telefone do cliente"
                >
                  Avisar por WhatsApp
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = `${originRef.current}/acompanhar/${current.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    alert("Link copiado! Envie pro cliente acompanhar o status.");
                  } catch (e) {
                    prompt("Copie o link abaixo:", url);
                  }
                }}
                className="flex-1 border border-zinc-700 text-zinc-300 text-sm py-2 rounded-lg"
              >
                Copiar link do cliente
              </button>
              <button
                onClick={deleteOrder}
                disabled={deleting}
                className="flex-1 border border-red-900 text-red-400 text-sm py-2 rounded-lg disabled:opacity-50"
              >
                {deleting ? "Excluindo…" : "Excluir OS"}
              </button>
            </div>
          </div>
        )}

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
              placeholder="Telefone (com DDD)"
              value={current.telefone}
              onChange={(e) => setCurrent({ ...current, telefone: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <input
              placeholder="CPF (opcional)"
              inputMode="numeric"
              value={current.cpf}
              onChange={(e) => setCurrent({ ...current, cpf: formatCpf(e.target.value) })}
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
            <input
              placeholder="IMEI (só para celulares)"
              inputMode="numeric"
              maxLength={17}
              value={current.imei}
              onChange={(e) => setCurrent({ ...current, imei: e.target.value.replace(/[^0-9]/g, "") })}
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
            onView={setViewingPhoto}
            onRemove={(i) =>
              setCurrent({ ...current, entry_photos: current.entry_photos.filter((_, idx) => idx !== i) })
            }
          />

          <PhotoPicker
            label="Fotos de saída"
            photos={current.exit_photos}
            uploading={uploadingExit}
            onAdd={addExitPhoto}
            onView={setViewingPhoto}
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
            {current.status_history?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 space-y-1">
                <p className="text-xs text-zinc-500">Histórico</p>
                {current.status_history.map((h, i) => (
                  <div key={i} className="flex justify-between text-xs text-zinc-400">
                    <span>{statusInfo(h.status).label}</span>
                    <span className="text-zinc-600">
                      {h.at ? new Date(h.at).toLocaleString("pt-BR") : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              placeholder="Observações internas"
              value={current.obs}
              onChange={(e) => setCurrent({ ...current, obs: e.target.value })}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </section>

          {current.id && (
            <section className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pagamento (retirada)</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Valor pago (R$)"
                  inputMode="decimal"
                  value={current.valor_pago}
                  onChange={(e) => setCurrent({ ...current, valor_pago: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <select
                  value={current.forma_pagamento}
                  onChange={(e) => setCurrent({ ...current, forma_pagamento: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="">Forma de pagamento</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="debito">Cartão débito</option>
                  <option value="credito">Cartão crédito</option>
                </select>
              </div>
              <input
                placeholder="Garantia (dias)"
                inputMode="numeric"
                value={current.garantia_dias}
                onChange={(e) => setCurrent({ ...current, garantia_dias: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={async () => {
                  if (!current.forma_pagamento || !current.valor_pago) {
                    setError("Preencha valor e forma de pagamento antes de emitir o cupom.");
                    return;
                  }
                  setError("");
                  const dataPagamento = current.data_pagamento || new Date().toISOString();
                  const updated = { ...current, data_pagamento: dataPagamento };
                  try {
                    await fetch(`/api/orders/${current.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updated),
                    });
                    setCurrent(updated);
                  } catch (e) {}
                  setPrintChoice("pagamento");
                }}
                className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg"
              >
                Emitir cupom de pagamento
              </button>
            </section>
          )}
        </div>

        {printChoice && (
          <div
            onClick={() => setPrintChoice(null)}
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border-t border-zinc-800 rounded-t-2xl p-4 space-y-2"
            >
              <p className="text-sm text-zinc-400 text-center mb-2">Imprimir em qual formato?</p>
              {[
                { id: "a4", label: "Folha A4" },
                { id: "80mm", label: "Térmica 80mm" },
                { id: "58mm", label: "Térmica 58mm" },
                { id: "rawbt", label: "Direto na térmica (RawBT, sem escolher)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.id === "rawbt") {
                      printThermalDirect(current, printChoice);
                    } else if (printChoice === "interno") {
                      printOrder(current, opt.id);
                    } else if (printChoice === "pagamento") {
                      printPaymentReceipt(current, opt.id);
                    } else {
                      printCustomerReceipt(current, opt.id);
                    }
                    setPrintChoice(null);
                  }}
                  className="w-full text-center bg-zinc-800 text-zinc-100 text-sm py-2.5 rounded-lg"
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setPrintChoice(null)}
                className="w-full text-center text-zinc-500 text-sm py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {viewingPhoto && (
          <div
            onClick={() => setViewingPhoto(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <img src={viewingPhoto} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 text-zinc-200 text-xl"
            >
              ×
            </button>
          </div>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 pt-4 pb-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-medium">Ordens de serviço</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openNew}
              className="bg-amber-500 text-zinc-950 text-sm font-medium px-3 py-1.5 rounded-lg"
            >
              + Nova OS
            </button>
            <button
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-zinc-600 text-xs px-2"
            >
              Sair
            </button>
          </div>
        </div>
        <input
          placeholder="Buscar por cliente, aparelho, telefone, CPF, IMEI ou número"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 mb-3"
        />
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={!hideDelivered}
              onChange={(e) => setHideDelivered(!e.target.checked)}
              className="accent-amber-500"
            />
            Mostrar entregues
          </label>
          <button onClick={() => exportCsv(filtered)} className="text-xs text-zinc-500 underline">
            Exportar CSV
          </button>
        </div>
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
    </div>
  );
}
