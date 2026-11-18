let historyItems = [];
function renderHistory() {
  const query = document.getElementById("search-history").value.trim().toLowerCase();
  const airline = document.getElementById("filter-airline").value;
  const cancellation = document.getElementById("filter-cancel").value;
  const date = document.getElementById("filter-date").value;
  const items = historyItems.filter((item) => {
    const haystack = `${item.flight.airline} ${item.flight.origin} ${item.flight.destination}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!airline || item.flight.airline === airline) && (!cancellation || item.cancellation.risk_level === cancellation) && (!date || item.created_at.slice(0,10) === date);
  });
  document.getElementById("history-body").innerHTML = items.map((item) => `<tr><td>${item.id}</td><td>${new Date(item.created_at).toLocaleString("id-ID")}</td><td>${item.flight.airline}</td><td>${item.flight.origin} → ${item.flight.destination}</td><td><span class="badge ${riskClass(item.cancellation.risk_level)}">${item.cancellation.probability_percent.toFixed(1)}% · ${translateRisk(item.cancellation.risk_level)}</span></td><td class="no-print"><button class="secondary-button" data-view="${item.id}">Detail</button> <button class="danger-button" data-delete="${item.id}">Hapus</button></td></tr>`).join("");
  document.getElementById("history-empty").hidden = items.length > 0;
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { sessionStorage.setItem("flight-risk-latest", JSON.stringify(historyItems.find((item) => item.id === button.dataset.view))); location.href = "/result.html"; }));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => { if (confirm("Hapus riwayat prediksi ini?")) { historyItems = historyItems.filter((item) => item.id !== button.dataset.delete); saveHistory(historyItems); renderHistory(); } }));
}
function exportHistory() {
  if (!historyItems.length) return showToast("Belum ada riwayat untuk diekspor.", "error");
  const rows = [["ID Prediksi","Tanggal Prediksi","Maskapai","Asal","Tujuan","Peluang Pembatalan","Tingkat Risiko"], ...historyItems.map((item) => [item.id,new Date(item.created_at).toLocaleString("id-ID"),item.flight.airline,item.flight.origin,item.flight.destination,item.cancellation.probability_percent,translateRisk(item.cancellation.risk_level)])];
  const table = `<table>${rows.map((row) => `<tr>${row.map((value) => `<td>${String(value).replaceAll("&","&amp;").replaceAll("<","&lt;")}</td>`).join("")}</tr>`).join("")}</table>`;
  const blob = new Blob([`<html><meta charset="utf-8">${table}</html>`], {type:"application/vnd.ms-excel"});
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "riwayat-prediksi-pembatalan.xls"; link.click(); URL.revokeObjectURL(url);
}
document.addEventListener("DOMContentLoaded", () => { historyItems = getHistory(); const airlines=[...new Set(historyItems.map((item)=>item.flight.airline))].sort(); document.getElementById("filter-airline").insertAdjacentHTML("beforeend",airlines.map((airline)=>`<option>${airline}</option>`).join("")); ["search-history","filter-airline","filter-cancel","filter-date"].forEach((id) => { const element=document.getElementById(id); element.addEventListener("input", renderHistory); element.addEventListener("change", renderHistory); }); document.getElementById("clear-history").addEventListener("click", () => { if (historyItems.length && confirm("Hapus seluruh riwayat prediksi?")) { historyItems=[]; saveHistory(historyItems); renderHistory(); } }); document.getElementById("export-history").addEventListener("click", exportHistory); document.getElementById("print-history").addEventListener("click",()=>window.print()); renderHistory(); });
