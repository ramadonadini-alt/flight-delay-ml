function cancellationData(item) {
  const result = item.cancellation || item.prediction?.cancellation || item.result?.cancellation || {};
  const directPercent = result.probability_percent ?? result.percent ?? item.cancellation_probability_percent;
  const probabilityPercent = directPercent !== undefined && directPercent !== null
    ? Number(directPercent)
    : Number(result.probability ?? item.cancellation_probability ?? 0) * 100;
  const riskLevel = result.risk_level || result.risk || (probabilityPercent >= 60 ? "High Risk" : probabilityPercent >= 30 ? "Medium Risk" : "Low Risk");
  return { probabilityPercent: Number.isFinite(probabilityPercent) ? probabilityPercent : 0, riskLevel };
}

function flightData(item) {
  return item.flight || item.request || item.input || {};
}

function renderActivity(items) {
  const host = document.getElementById("trend-chart")?.parentElement;
  if (!host) return;
  if (!items.length) {
    host.innerHTML = '<div class="empty-state">Belum ada aktivitas prediksi.<br><a class="secondary-button" href="/prediction.html" style="margin-top:14px">Buat prediksi pertama</a></div>';
    return;
  }

  const byDate = new Map();
  items.forEach((item) => {
    const date = item.created_at ? new Date(item.created_at) : null;
    if (!date || Number.isNaN(date.valueOf())) return;
    const label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
    byDate.set(label, (byDate.get(label) || 0) + 1);
  });
  const activity = [...byDate.entries()].slice(0, 5);
  host.innerHTML = `<div class="metrics-message"><strong>${items.length} prediksi tersimpan</strong><br>Aktivitas terbaru dari riwayat browser Anda.</div><div class="summary-list">${activity.map(([date, count]) => `<div class="summary-item"><span>${date}</span><strong>${count} prediksi</strong></div>`).join("")}</div>`;
}

function renderDistribution(items) {
  const host = document.getElementById("cancel-chart")?.parentElement;
  if (!host) return;
  const levels = ["Low Risk", "Medium Risk", "High Risk"];
  const rows = levels.map((level) => ({ level, count: items.filter((item) => cancellationData(item).riskLevel === level).length }));
  host.innerHTML = `<div class="metrics-message">Pembagian tingkat risiko dari seluruh riwayat prediksi.</div><div class="summary-list">${rows.map(({ level, count }) => `<div class="summary-item"><span><span class="badge ${riskClass(level)}">${translateRisk(level)}</span></span><strong>${count} prediksi</strong></div>`).join("")}</div>`;
}

function drawDashboard() {
  const items = getHistory();
  const records = items.map(cancellationData);
  const cancellations = records.filter((record) => record.riskLevel === "High Risk");
  const average = records.length ? records.reduce((total, record) => total + record.probabilityPercent, 0) / records.length : null;

  document.querySelector('[data-stat="total"]').textContent = items.length;
  document.querySelector('[data-stat="cancel-high"]').textContent = cancellations.length;
  document.querySelector('[data-stat="avg"]').textContent = average === null ? "—" : `${average.toFixed(1)}%`;

  const recent = items.slice(0, 5);
  const body = document.getElementById("recent-body");
  const empty = document.getElementById("recent-empty");
  body.innerHTML = recent.map((item) => {
    const flight = flightData(item);
    const cancellation = cancellationData(item);
    const createdAt = item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "Tidak diketahui";
    return `<tr><td>${createdAt}</td><td>${flight.airline || "—"}</td><td>${flight.origin && flight.destination ? `${flight.origin} → ${flight.destination}` : "—"}</td><td><span class="badge ${riskClass(cancellation.riskLevel)}">${cancellation.probabilityPercent.toFixed(1)}% · ${translateRisk(cancellation.riskLevel)}</span></td></tr>`;
  }).join("");
  empty.hidden = recent.length > 0;

  renderActivity(items);
  renderDistribution(items);
}

document.addEventListener("DOMContentLoaded", drawDashboard);
