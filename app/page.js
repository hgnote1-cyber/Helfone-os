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
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          margin: 0;
          font-weight: bold;
          text-shadow: 0.4px 0 0 currentColor, -0.4px 0 0 currentColor, 0 0.4px 0 currentColor, 0 -0.4px 0 currentColor;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .eq { border-top: 1px dashed #333; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 8px 0; }
        td { padding: 3px 0; }
        .right { text-align: right; }
        .totals { font-size: 15px; margin-top: 6px; }
        .totals .row { display: flex; justify-content: space-between; }
        .garantia { font-size: 13px; margin-top: 14px; line-height: 1.5; text-align: center; }
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
      body { width: 76mm; font-size: 14px; padding: 0; }
      h1 { font-size: 16px; }
      .store, .muted { font-size: 12px; }
      .label { font-size: 11px; }
      .row, .item { font-size: 14px; }
      .terms { font-size: 12px; }
      .sign-line { margin-top: 24px !important; font-size: 13px; }
    `;
  }
  if (size === "58mm") {
    return `
      @page { size: 58mm auto; margin: 2mm; }
      body { width: 54mm; font-size: 13px; padding: 0; }
      h1 { font-size: 14px; }
      .store, .muted { font-size: 11px; }
      .label { font-size: 10px; }
      .row, .item { font-size: 15px; }
      .terms { font-size: 11px; }
      .sign-line { margin-top: 18px !important; font-size: 12px; }
    `;
  }
  return `
    @page { size: A4; margin: 15mm; }
    body { max-width: 480px; padding: 24px; font-size: 15px; }
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
        h1 { font-size: 21px; margin: 0 0 2px; }
        .store { font-size: 14px; color: #000; margin-bottom: 18px; font-weight: bold; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #000; margin-bottom: 3px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 3px; }
        .item { font-size: 15px; }
        .terms { font-size: 13px; color: #000; margin: 18px 0; line-height: 1.5; font-weight: bold; }
        .sign { margin-top: 40px; }
        .sign-line { border-top: 1px solid #111; width: 100%; margin-top: 40px; padding-top: 4px; font-size: 14px; text-align: center; }
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
        h1 { font-size: 21px; margin: 0 0 2px; }
        .muted { color: #000; font-size: 15px; margin-bottom: 18px; font-weight: bold; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #000; margin-bottom: 3px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 3px; }
        .item { font-size: 15px; }
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
