function resultDescription(result) {
  if (result.risk_level === "High Risk") return "Model menempatkan kombinasi data ini pada risiko pembatalan tinggi. Pantau pemberitahuan maskapai dan siapkan opsi perjalanan cadangan.";
  if (result.risk_level === "Medium Risk") return "Model menempatkan kombinasi data ini pada risiko pembatalan menengah. Periksa status penerbangan kembali mendekati jadwal keberangkatan.";
  return "Model menempatkan kombinasi data ini pada risiko pembatalan rendah. Tetap cek informasi terbaru dari maskapai.";
}

function detailRow(label, value) { return `<div class="summary-item"><span>${label}</span><strong>${value}</strong></div>`; }

function renderResult(item) {
  const cancellation = item.cancellation;
  document.getElementById("result-content").hidden = false;
  document.getElementById("cancel-percent").textContent = `${cancellation.probability_percent.toFixed(1)}%`;
  document.getElementById("cancel-gauge").style.setProperty("--gauge", cancellation.probability_percent);
  document.getElementById("cancel-risk-badge").innerHTML = `<span class="badge ${riskClass(cancellation.risk_level)}">${translateRisk(cancellation.risk_level)}</span>`;
  document.getElementById("cancel-description").textContent = resultDescription(cancellation);
  const explanation = cancellation.explanation;
  const influencers = explanation?.score_influencers || [];
  const influencersHtml = influencers.length
    ? `<p class="explanation-caption">Untuk data ini, unsur yang paling berpengaruh pada skor internal model adalah:</p><ul class="explanation-list">${influencers.map((item) => `<li><strong>${item.feature}: ${item.value}</strong> ${item.direction} skor model.</li>`).join("")}</ul><p class="explanation-caption">${explanation.influencer_note}</p>`
    : "";
  document.getElementById("model-explanation").innerHTML = explanation
    ? `<strong>${explanation.message}</strong><br><br>${explanation.risk_rule}${influencersHtml}<p class="explanation-caption">Data yang dibaca model:</p><ul class="explanation-list">${explanation.factors_considered.map((factor) => `<li>${factor}</li>`).join("")}</ul>`
    : "Model membaca gabungan data pemesanan, penumpang, rute, dan tiket untuk menghasilkan persentase ini.";
  const f = item.flight;
  const kelasTiket = ({ Economy: "Ekonomi", Business: "Bisnis", First: "Kelas utama" })[f.ticket_class] || f.ticket_class;
  document.getElementById("flight-summary").innerHTML = [detailRow("Maskapai",f.airline),detailRow("Rute",`${f.origin} → ${f.destination}`),detailRow("Tanggal berangkat",formatDate(f.departure_date)),detailRow("Jam keberangkatan",`${String(f.departure_hour).padStart(2,"0")}:00`),detailRow("Jumlah penumpang",f.passenger_count),detailRow("Kelas tiket",kelasTiket)].join("");
  document.getElementById("recommendation").innerHTML = [detailRow("Kategori hasil",translateRisk(cancellation.risk_level)),detailRow("Aturan kategori","Rendah < 30% · Menengah 30–<60% · Tinggi ≥ 60%"),detailRow("Saran","Periksa status penerbangan dan notifikasi maskapai mendekati keberangkatan."),detailRow("Pengingat","Nilai probabilitas bukan jaminan kejadian nyata.")].join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = sessionStorage.getItem("flight-risk-latest");
  if (!stored) { document.getElementById("result-empty").hidden = false; return; }
  const item = JSON.parse(stored);
  renderResult(item);
  document.getElementById("save-result").addEventListener("click", () => {
    const history = getHistory();
    if (!item.id) item.id = `FR-${Date.now().toString(36).toUpperCase()}`;
    if (!history.some((entry) => entry.id === item.id)) saveHistory([item, ...history]);
    showToast("Prediksi disimpan ke riwayat browser.", "success");
  });
  document.getElementById("print-result").addEventListener("click", () => window.print());
});
