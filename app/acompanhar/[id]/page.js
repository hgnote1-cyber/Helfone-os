"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const STATUS_LABELS = {
  avaliacao: "Aguardando avaliação",
  peca: "Aguardando peça",
  conserto: "Em conserto",
  pronto: "Pronto para retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function AcompanharPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  function load() {
    fetch(`/api/track/${params.id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Não consegui carregar essa ordem."));
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleAction(action) {
    if (action === "reject") {
      const confirmed = window.confirm(
        "Tem certeza que quer recusar o orçamento? Isso vai cancelar essa ordem de serviço."
      );
      if (!confirmed) return;
    }
    setActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/track/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) {
        setActionError(d.error || "Não consegui registrar sua resposta.");
      } else {
        load();
      }
    } catch (e) {
      setActionError("Falha de conexão. Tente de novo.");
    } finally {
      setActing(false);
    }
  }

  const showDecision =
    data && data.orcamento && !data.orcamento_aprovado && data.status !== "cancelado";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-lg font-medium">Helfone</h1>
          <p className="text-xs text-zinc-500">Acompanhamento de OS</p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        {!error && !data && (
          <p className="text-sm text-zinc-500 text-center">Carregando…</p>
        )}

        {data && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-zinc-500">OS #{data.numero}</p>
              <p className="text-base font-medium">
                {data.primeiro_nome ? `Olá, ${data.primeiro_nome}!` : "Olá!"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Aparelho</p>
              <p className="text-sm">{data.aparelho}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Status atual</p>
              <p className="text-base font-medium text-amber-400">
                {STATUS_LABELS[data.status] || data.status}
              </p>
            </div>

            {data.orcamento && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Orçamento previsto</p>
                <p className="text-xl font-medium">R$ {data.orcamento}</p>
              </div>
            )}

            {data.orcamento_aprovado && (
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2 text-sm text-emerald-400 text-center">
                ✓ Orçamento aprovado
              </div>
            )}

            {data.status === "cancelado" && (
              <div className="bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-400 text-center">
                Ordem cancelada
              </div>
            )}

            {showDecision && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">
                  Confirma se pode seguir com o reparo por esse valor?
                </p>
                {actionError && (
                  <p className="text-xs text-red-400">{actionError}</p>
                )}
                <button
                  onClick={() => handleAction("approve")}
                  disabled={acting}
                  className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
                >
                  {acting ? "Enviando…" : "Aprovar orçamento"}
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={acting}
                  className="w-full border border-red-800 text-red-400 text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
                >
                  Recusar orçamento
                </button>
              </div>
            )}

            {data.status_history?.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Linha do tempo</p>
                <div className="space-y-1.5">
                  {data.status_history.map((h, i) => (
                    <div key={i} className="text-xs text-zinc-400 flex justify-between">
                      <span>{STATUS_LABELS[h.status] || h.status}</span>
                      <span className="text-zinc-600">
                        {h.at ? new Date(h.at).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
