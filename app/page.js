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
    cnpj: "",
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

function formatCnpj(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
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
  const pendingApproval =
    order.orcamento && !order.orcamento_aprovado && order.status !== "cancelado";

  let msg = `Olá ${order.cliente || ""}! Sobre o seu ${order.aparelho || "aparelho"} (OS #${order.numero}): status atual é "${s.label}".`;

  if (pendingApproval && trackUrl) {
    msg += ` O orçamento ficou em R$ ${order.orcamento}. Pra aprovar ou recusar o serviço, é só tocar aqui: ${trackUrl}`;
  } else if (trackUrl) {
    msg += ` Acompanhe por aqui: ${trackUrl}`;
  }

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
}

function exportCsv(orders) {
  const headers = ["numero", "cliente", "telefone", "cpf", "cnpj", "aparelho", "imei", "defeito", "status", "orcamento", "tecnico", "criado_em"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [o.numero, o.cliente, o.telefone, o.cpf, o.cnpj, o.aparelho, o.imei, o.defeito, statusInfo(o.status).label, o.orcamento, o.tecnico, o.created_at]
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
      <img src="data:image/png;base64,${LOGO_BASE64}" style="max-width:180px; height:auto; margin:0 auto 8px; image-rendering:pixelated; image-rendering:-moz-crisp-edges; image-rendering:crisp-edges;" />
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
  if (order.cnpj) lines.push(`CNPJ: ${order.cnpj}`);
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
  lines.push("RECIBO DE PRESTACAO DE SERVICO");
  lines.push(eq);
  const now = order.data_pagamento ? new Date(order.data_pagamento) : new Date();
  const { data: dataStr, hora: horaStr } = formatDateBR(now);
  lines.push(`Cupom No: ${order.numero}  Data: ${dataStr} ${horaStr}`);
  lines.push(`Cliente: ${order.cliente || "Cliente Avulso"}`);
  if (order.cpf) lines.push(`CPF: ${order.cpf}`);
  if (order.cnpj) lines.push(`CNPJ: ${order.cnpj}`);
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
        `<tr><td class="qtd">1</td><td>${it.descricao || "Serviço"}</td><td class="right">R$ ${it.preco || "-"}</td></tr>`
    )
    .join("");
  win.document.write(`
    <html>
    <head>
      <title>OS #${order.numero} - Recibo</title>
      <meta charset="utf-8" />
      <style>
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          margin: 0;
          font-weight: normal;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .eq { border-top: 1px dashed #333; margin: 8px 0; }
        .titulo {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 0.5px;
          border-top: 1px dashed #333;
          border-bottom: 1px dashed #333;
          padding: 6px 0;
          margin: 10px 0;
        }
        .cliente-info { font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 8px 0; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; }
        td { padding: 3px 0; }
        td.qtd, th.qtd { text-align: center; width: 30px; }
        .right { text-align: right; }
        .totals { font-size: 15px; margin-top: 6px; }
        .totals .row { display: flex; justify-content: space-between; }
        .totals .total { font-weight: bold; font-size: 17px; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
        .garantia { font-size: 13px; margin-top: 14px; line-height: 1.5; text-align: center; }
        .rodape { text-align: center; font-size: 11px; color: #666; margin-top: 14px; }
        ${paperCss(size)}
      </style>
    </head>
    <body>
      ${storeHeaderHtml()}

      <div class="titulo">RECIBO DE PRESTAÇÃO DE SERVIÇO</div>

      <div class="eq"></div>
      <div class="cliente-info">
        <div>Cupom No: ${order.numero}&nbsp;&nbsp;Data: ${dataStr} ${horaStr}</div>
        <div>Cliente: ${order.cliente || "Cliente Avulso"}</div>
        ${order.cpf ? `<div>CPF: ${order.cpf}</div>` : ""}
        ${order.cnpj ? `<div>CNPJ: ${order.cnpj}</div>` : ""}
        ${order.tecnico ? `<div>Operador: ${order.tecnico}</div>` : ""}
        ${order.aparelho ? `<div>Aparelho: ${order.aparelho}</div>` : ""}
      </div>
      <div class="eq"></div>

      <table>
        <tr><th class="qtd">Qtd</th><th>Descrição</th><th class="right">Valor</th></tr>
        ${itensRows}
      </table>

      <div class="totals">
        <div class="row"><span>Subtotal</span><span>R$ ${total}</span></div>
        <div class="row total"><span>TOTAL</span><span>R$ ${total}</span></div>
        <div class="row" style="margin-top:4px;"><span>Forma de pagamento</span><span>${PAGAMENTO_LABELS[order.forma_pagamento] || "-"}</span></div>
      </div>

      <div class="garantia">
        Garantia de ${order.garantia_dias || "90"} dias contra defeitos de fabricação, contados a partir da data de retirada.
        Não cobre mau uso, quedas, umidade ou violação do produto.
      </div>

      <div class="rodape">Obrigado pela preferência!</div>
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
          font-weight: normal;
        }
        h1 { font-size: 21px; margin: 0 0 2px; }
        .store { font-size: 14px; color: #000; margin-bottom: 18px; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #000; margin-bottom: 3px; font-weight: 600; }
        .row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 3px; }
        .item { font-size: 15px; }
        .terms { font-size: 13px; color: #000; margin: 18px 0; line-height: 1.5; }
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
        ${order.cnpj ? `<div>CNPJ: ${order.cnpj}</div>` : ""}
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
          font-weight: normal;
        }
        h1 { font-size: 21px; margin: 0 0 2px; }
        .muted { color: #000; font-size: 15px; margin-bottom: 18px; }
        .section { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #000; margin-bottom: 3px; font-weight: 600; }
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
        ${order.cnpj ? `<div>CNPJ: ${order.cnpj}</div>` : ""}
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
  const [pushStatus, setPushStatus] = useState("checking"); // checking | off | on | unsupported
  const [metaFaturamento, setMetaFaturamento] = useState("");
  const [metaInput, setMetaInput] = useState("");
  const initialStatusRef = useRef(null);
  const originRef = useRef("");

  useEffect(() => {
    originRef.current = window.location.origin;
    checkPushStatus();
  }, []);

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function checkPushStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? "on" : "off");
    } catch (e) {
      setPushStatus("unsupported");
    }
  }

  async function enablePush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setPushStatus("on");
    } catch (e) {
      setPushStatus("off");
    }
  }

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
      (qDigits && (o.cnpj || "").replace(/\D/g, "").includes(qDigits)) ||
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
                      updated = { ...updated, cliente: match.cliente || "", cpf: match.cpf || "", cnpj: match.cnpj || "" };
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
            <input
              placeholder="CNPJ (opcional, se for empresa)"
              inputMode="numeric"
              value={current.cnpj}
              onChange={(e) => setCurrent({ ...current, cnpj: formatCnpj(e.target.value) })}
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
            {pushStatus === "off" && (
              <button
                onClick={enablePush}
                className="text-amber-400 text-xs px-2 border border-amber-800 rounded-lg py-1"
              >
                🔔 Ativar avisos
              </button>
            )}
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
