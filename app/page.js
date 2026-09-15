"use client";

import { useState, useEffect, useRef } from "react";

const STATUS = [
  { id: "avaliacao", label: "Aguardando avaliação", dot: "bg-zinc-400", border: "border-l-zinc-400", text: "text-zinc-300" },
  { id: "peca", label: "Aguardando peça", dot: "bg-sky-500", border: "border-l-sky-500", text: "text-sky-400" },
  { id: "conserto", label: "Em conserto", dot: "bg-amber-500", border: "border-l-amber-500", text: "text-amber-400" },
  { id: "pronto", label: "Pronto", dot: "bg-emerald-500", border: "border-l-emerald-500", text: "text-emerald-400" },
  { id: "entregue", label: "Entregue", dot: "bg-zinc-600", border: "border-l-zinc-700", text: "text-zinc-500" },
  { id: "cancelado", label: "Cancelado", dot: "bg-red-500", border: "border-l-red-500", text: "text-red-400" },
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
    servico: "",
    itens_servico: [],
    orcamento_aprovado: false,
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

const LOGO_BASE64 =
  "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";

function storeHeaderHtml() {
  return `
    <div style="text-align:center; margin-bottom:10px;">
      <img src="data:image/png;base64,${LOGO_BASE64}" style="max-width:180px; height:auto; margin:0 auto 8px;" />
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

function formatDateBR(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return { data: `${d}/${m}/${y}`, hora: `${h}:${min}` };
}

function itensComTotal(order) {
  const itens = (order.itens_servico || []).filter((it) => it.descricao || it.preco);
  if (itens.length > 0) {
    const total = itens.reduce((sum, it) => sum + (parseFloat(String(it.preco).replace(",", ".")) || 0), 0);
    return { itens, total: total.toFixed(2).replace(".", ",") };
  }
  return {
    itens: [{ descricao: order.servico || order.aparelho || "Serviço", preco: order.valor_pago || "0" }],
    total: order.valor_pago || "-",
  };
}

function buildPaymentReceiptText(order) {
  const eq = "================================";
  const lines = [];
  lines.push(...storeHeaderLines());
  const now = order.data_pagamento ? new Date(order.data_pagamento) : new Date();
  const { data: dataStr, hora: horaStr } = formatDateBR(now);
  lines.push(`Cupom No: ${order.numero}  Data: ${dataStr} ${horaStr}`);
  lines.push(`Cliente: ${order.cliente || "Cliente Avulso"}`);
  if (order.tecnico) lines.push(`Operador: ${order.tecnico}`);
  lines.push(eq);
  lines.push("DESCRICAO           QTD  SUBTOT");
  lines.push("--------------------------------");
  const { itens, total } = itensComTotal(order);
  itens.forEach((it) => {
    const desc = (it.descricao || "Servico").slice(0, 18).padEnd(18, " ");
    lines.push(`${desc} 1   R$${it.preco || "-"}`);
  });
  if (order.aparelho) lines.push(`(${order.aparelho})`);
  lines.push("--------------------------------");
  lines.push(`SUBTOTAL: R$ ${total}`);
  lines.push(`TOTAL: R$ ${total}`);
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
  const { data: dataStr, hora: horaStr } = formatDateBR(now);
  const { itens, total } = itensComTotal(order);
  const itensRows = itens
    .map(
      (it) =>
        `<tr><td>${it.descricao || "Serviço"}</td><td class="right">1</td><td class="right">R$ ${it.preco || "-"}</td></tr>`
    )
    .join("");
  win.document.write(`
    <html>
    <head>
      <title>OS #${order.numero} - Cupom de pagamento</title>
      <meta charset="utf-8" />
      <style>
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: "Courier New", monospace;
          color: #000;
          margin: 0;
          font-weight: bold;
          text-shadow: 0.4px 0 0 currentColor, -0.4px 0 0 currentColor, 0 0.4px 0 currentColor, 0 -0.4px 0 currentColor;
        }
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

      <div>Cupom No: ${order.numero}&nbsp;&nbsp;Data: ${dataStr} ${horaStr}</div>
      <div>Cliente: ${order.cliente || "Cliente Avulso"}</div>
      ${order.tecnico ? `<div>Operador: ${order.tecnico}</div>` : ""}
      ${order.aparelho ? `<div>Aparelho: ${order.aparelho}</div>` : ""}
      <div class="eq"></div>

      <table>
        <tr class="bold"><td>Descrição</td><td class="right">Qtd</td><td class="right">Subtotal</td></tr>
        ${itensRows}
      </table>

      <div class="eq"></div>
      <div class="totals">
        <div class="row"><span>SUBTOTAL:</span><span>R$ ${total}</span></div>
        <div class="row bold"><span>TOTAL:</span><span>R$ ${total}</span></div>
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
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          margin: 0;
          font-weight: bold;
          text-shadow: 0.3px 0 0 currentColor, -0.3px 0 0 currentColor, 0 0.3px 0 currentColor, 0 -0.3px 0 currentColor;
        }
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
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          margin: 0;
          font-weight: bold;
          text-shadow: 0.3px 0 0 currentColor, -0.3px 0 0 currentColor, 0 0.3px 0 currentColor, 0 -0.3px 0 currentColor;
        }
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
  const [autofillNotice, setAutofillNotice] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [metaFaturamento, setMetaFaturamento] = useState("");
  const [metaInput, setMetaInput] = useState("");
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

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setMetaFaturamento(data.meta_faturamento || "");
      setMetaInput(data.meta_faturamento || "");
    } catch (e) {}
  }

  async function saveMeta() {
    setMetaFaturamento(metaInput);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_faturamento: metaInput }),
      });
    } catch (e) {}
  }

  useEffect(() => {
    load();
    loadSettings();
  }, []);

  function openNew() {
    const fresh = emptyOrder();
    setCurrent(fresh);
    initialStatusRef.current = fresh.status;
    setError("");
    setNewItemLabel("");
    setAutofillNotice("");
    setView("form");
  }

  function openEdit(order) {
    setCurrent({ ...order });
    initialStatusRef.current = order.status;
    setError("");
    setNewItemLabel("");
    setAutofillNotice("");
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
    if (statusChanged && current.status === "cancelado") {
      const confirmed = window.confirm("Confirma o cancelamento desta OS?");
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
    if (statusId === "cancelado") {
      const confirmed = window.confirm(`Confirma o cancelamento da OS #${order.numero}?`);
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

  function sumItens(itens) {
    return itens
      .reduce((sum, it) => sum + (parseFloat(String(it.preco).replace(",", ".")) || 0), 0)
      .toFixed(2)
      .replace(".", ",");
  }

  function addServiceItem() {
    const itens = [...(current.itens_servico || []), { id: uid(), descricao: "", preco: "" }];
    setCurrent({ ...current, itens_servico: itens });
  }

  function updateServiceItem(id, field, value) {
    const itens = (current.itens_servico || []).map((it) =>
      it.id === id ? { ...it, [field]: value } : it
    );
    setCurrent({ ...current, itens_servico: itens, valor_pago: sumItens(itens) });
  }

  function removeServiceItem(id) {
    const itens = (current.itens_servico || []).filter((it) => it.id !== id);
    setCurrent({ ...current, itens_servico: itens, valor_pago: sumItens(itens) });
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

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function lastStatusChangeDate(order) {
    const hist = order.status_history || [];
    if (hist.length > 0) return hist[hist.length - 1].at;
    return order.created_at;
  }

  function computeDashboard(list) {
    const now = new Date();
    const inThisMonth = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const monthOrders = list.filter((o) => inThisMonth(o.created_at));
    const statusCounts = STATUS.reduce((acc, s) => {
      acc[s.id] = monthOrders.filter((o) => o.status === s.id).length;
      return acc;
    }, {});
    const faturamento = list
      .filter((o) => inThisMonth(o.data_pagamento))
      .reduce((sum, o) => sum + (parseFloat(String(o.valor_pago).replace(",", ".")) || 0), 0);
    const tally = {};
    list.forEach((o) => {
      const itens =
        (o.itens_servico || []).length > 0
          ? o.itens_servico
          : o.servico
          ? [{ descricao: o.servico }]
          : [];
      itens.forEach((it) => {
        const key = (it.descricao || "").trim();
        if (!key) return;
        tally[key] = (tally[key] || 0) + 1;
      });
    });
    const topServicos = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { totalMes: monthOrders.length, statusCounts, faturamento, topServicos };
  }

  const stalledOrders = (orders || []).filter(
    (o) => o.status !== "entregue" && daysSince(lastStatusChangeDate(o)) >= 5
  );

  const filtered = (orders || []).filter((o) => {
    const matchesFilter = filter === "todos" || o.status === filter;
    const hiddenByArchive =
      filter === "todos" && hideDelivered && (o.status === "entregue" || o.status === "cancelado");
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
              onChange={(e) => {
                const value = e.target.value;
                let updated = { ...current, telefone: value };
                if (!current.id) {
                  const digits = value.replace(/\D/g, "");
                  if (digits.length >= 10 && !current.cliente) {
                    const match = (orders || []).find(
                      (o) => (o.telefone || "").replace(/\D/g, "") === digits
                    );
                    if (match) {
                      updated = { ...updated, cliente: match.cliente || "", cpf: match.cpf || "" };
                      setAutofillNotice(match.cliente || "");
                    }
                  }
                }
                setCurrent(updated);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            {autofillNotice && (
              <p className="text-xs text-emerald-400">Cliente reconhecido: {autofillNotice}</p>
            )}
            <input
              placeholder="CPF (opcional)"
              inputMode="numeric"
              value={current.cpf}
              onChange={(e) => setCurrent({ ...current, cpf: formatCpf(e.target.value) })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            {(() => {
              const digits = (current.telefone || "").replace(/\D/g, "");
              const historico = digits.length >= 8
                ? (orders || []).filter(
                    (o) => o.id !== current.id && (o.telefone || "").replace(/\D/g, "") === digits
                  )
                : [];
              if (historico.length === 0) return null;
              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 space-y-1.5">
                  <p className="text-xs text-zinc-500">
                    Histórico do cliente ({historico.length} {historico.length === 1 ? "OS anterior" : "OS anteriores"})
                  </p>
                  {historico.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex justify-between text-xs text-zinc-400">
                      <span>
                        OS #{o.numero} · {o.aparelho}
                      </span>
                      <span className="text-zinc-600">{statusInfo(o.status).label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
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
            <input
              placeholder="Serviço realizado (ex: Troca de tela, Troca de bateria)"
              value={current.servico}
              onChange={(e) => setCurrent({ ...current, servico: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
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
            <label className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={current.orcamento_aprovado}
                onChange={(e) => setCurrent({ ...current, orcamento_aprovado: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
              <span className="text-sm text-zinc-300">Cliente aprovou o orçamento</span>
            </label>
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

              <div className="space-y-1.5">
                {(current.itens_servico || []).map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <input
                      placeholder="Serviço (ex: Troca de tela)"
                      value={item.descricao}
                      onChange={(e) => updateServiceItem(item.id, "descricao", e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      placeholder="Preço"
                      inputMode="decimal"
                      value={item.preco}
                      onChange={(e) => updateServiceItem(item.id, "preco", e.target.value)}
                      className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => removeServiceItem(item.id)}
                      className="shrink-0 text-zinc-600 text-sm px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addServiceItem}
                className="w-full border border-zinc-700 text-zinc-300 text-sm py-2 rounded-lg"
              >
                + Adicionar serviço
              </button>

              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Valor total (R$)"
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
            Mostrar entregues/canceladas
          </label>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDashboard(true)} className="text-xs text-zinc-500 underline">
              Painel
            </button>
            <button onClick={() => exportCsv(filtered)} className="text-xs text-zinc-500 underline">
              Exportar CSV
            </button>
          </div>
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

        {stalledOrders.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-800 rounded-lg px-3 py-2 mb-3 text-xs text-amber-300">
            ⏰ {stalledOrders.length} {stalledOrders.length === 1 ? "ordem parada" : "ordens paradas"} há
            5 dias ou mais sem mudar de status.
          </div>
        )}

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
                {o.orcamento_aprovado && (
                  <p className="text-xs text-emerald-400">✓ Orçamento aprovado</p>
                )}
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
                  {o.status !== "entregue" && daysSince(lastStatusChangeDate(o)) >= 5 && (
                    <span className="text-amber-400">
                      ⏰ Parada há {daysSince(lastStatusChangeDate(o))}d
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

      {showDashboard && (
        <div
          onClick={() => setShowDashboard(false)}
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border-t border-zinc-800 rounded-t-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Painel do mês</p>
              <button onClick={() => setShowDashboard(false)} className="text-zinc-500 text-sm">
                Fechar
              </button>
            </div>
            {(() => {
              const d = computeDashboard(orders || []);
              return (
                <>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">OS abertas este mês</p>
                    <p className="text-2xl font-medium">{d.totalMes}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Faturamento recebido este mês</p>
                    <p className="text-2xl font-medium text-emerald-400">
                      R$ {d.faturamento.toFixed(2).replace(".", ",")}
                    </p>
                    {metaFaturamento && parseFloat(metaFaturamento.replace(",", ".")) > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (d.faturamento / parseFloat(metaFaturamento.replace(",", "."))) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Meta: R$ {metaFaturamento}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <input
                        placeholder="Definir meta do mês (R$)"
                        inputMode="decimal"
                        value={metaInput}
                        onChange={(e) => setMetaInput(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={saveMeta}
                        className="text-xs bg-zinc-700 text-zinc-100 px-3 rounded-lg"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Por status (este mês)</p>
                    {STATUS.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        <span className="text-zinc-400">{d.statusCounts[s.id] || 0}</span>
                      </div>
                    ))}
                  </div>
                  {d.topServicos.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Serviços mais feitos (todo o período)
                      </p>
                      {d.topServicos.map(([nome, count]) => (
                        <div key={nome} className="flex justify-between text-sm">
                          <span>{nome}</span>
                          <span className="text-zinc-400">{count}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
