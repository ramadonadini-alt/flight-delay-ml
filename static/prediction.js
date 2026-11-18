const form = document.getElementById("prediction-form");
const errorBox = document.getElementById("form-error");
const submitButton = document.getElementById("predict-button");

function fillHours(selectId) {
  const select = document.getElementById(selectId);
  for (let hour = 0; hour < 24; hour += 1) {
    const option = document.createElement("option");
    option.value = hour;
    option.textContent = `${String(hour).padStart(2, "0")}.00–${String(hour).padStart(2, "0")}.59`;
    select.append(option);
  }
}

function seasonFor(date) {
  const month = date.getMonth() + 1;
  if ([12, 1, 2].includes(month)) return "Musim hujan";
  if ([6, 7, 8].includes(month)) return "Musim kemarau";
  return "Musim peralihan";
}

const numberRules = {
  passenger_count: { min: 1, max: 20, label: "Jumlah penumpang", unit: "orang" },
  flight_distance_km: { min: 1, max: 15000, label: "Jarak penerbangan", unit: "km" },
  flight_duration_minutes: { min: 1, max: 2000, label: "Durasi penerbangan", unit: "menit" },
  transit_count: { min: 0, max: 5, label: "Jumlah transit", unit: "kali" },
  ticket_price_idr: { min: 1, max: 500000000, label: "Harga tiket", unit: "rupiah" },
  baggage_count: { min: 0, max: 10, label: "Jumlah bagasi", unit: "unit" },
  previous_cancellation_history: { min: 0, max: 50, label: "Riwayat pembatalan", unit: "kali" },
};

const ageRules = {
  Child: { min: 1, max: 12, label: "Anak-anak" },
  Adult: { min: 13, max: 59, label: "Dewasa" },
  Senior: { min: 60, max: 120, label: "Lansia" },
};

function validateNumber(input, rule) {
  input.setCustomValidity("");
  if (input.value === "") return;
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
    input.setCustomValidity(`${rule.label} harus antara ${rule.min} sampai ${rule.max} ${rule.unit}.`);
  }
}

function updateAgeValidation() {
  const ageInput = form.elements.passenger_age;
  const type = form.elements.passenger_type.value;
  const rule = ageRules[type] || { min: 1, max: 120, label: "Penumpang" };
  ageInput.min = rule.min;
  ageInput.max = rule.max;
  ageInput.placeholder = `Contoh: ${rule.min === 1 ? 8 : rule.min === 13 ? 28 : 65}`;
  ageInput.closest(".field").querySelector("small").textContent = `Usia kategori ${rule.label}: ${rule.min}–${rule.max} tahun.`;
  validateNumber(ageInput, { ...rule, label: "Usia penumpang", unit: "tahun" });
}

function validateDates() {
  const booking = form.elements.booking_date;
  const departure = form.elements.departure_date;
  departure.setCustomValidity("");
  if (!booking.value || !departure.value) return;
  departure.min = booking.value;
  const days = Math.round((new Date(`${departure.value}T00:00:00`) - new Date(`${booking.value}T00:00:00`)) / 86400000);
  if (days < 0) departure.setCustomValidity("Tanggal keberangkatan tidak boleh lebih awal dari tanggal pemesanan.");
  if (days > 365) departure.setCustomValidity("Jarak tanggal pemesanan dan keberangkatan maksimal 365 hari.");
}

function validateRoute() {
  const destination = form.elements.destination;
  destination.setCustomValidity("");
  if (form.elements.origin.value && destination.value && form.elements.origin.value === destination.value) {
    destination.setCustomValidity("Bandara asal dan tujuan harus berbeda.");
  }
}

function updateFormState() {
  const fields = [...form.querySelectorAll("input[required], select[required]")];
  const complete = fields.filter((field) => field.value).length;
  document.getElementById("form-progress").style.width = `${(complete / fields.length) * 100}%`;
  const booking = form.elements.booking_date.value;
  const departure = form.elements.departure_date.value;
  document.getElementById("summary-origin").textContent = form.elements.origin.value || "---";
  document.getElementById("summary-destination").textContent = form.elements.destination.value || "---";
  document.getElementById("summary-date").textContent = formatDate(departure);
  if (booking && departure) {
    const days = Math.round((new Date(`${departure}T00:00:00`) - new Date(`${booking}T00:00:00`)) / 86400000);
    document.getElementById("summary-days").textContent = days >= 0 ? `${days} hari` : "Tanggal tidak valid";
    const date = new Date(`${departure}T00:00:00`);
    document.getElementById("summary-calendar").textContent = `${date.toLocaleDateString("id-ID", { weekday:"long" })} · ${seasonFor(date)}`;
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
  errorBox.scrollIntoView({ behavior:"smooth", block:"center" });
}

async function fillRouteDetails() {
  const origin = form.elements.origin.value;
  const destination = form.elements.destination.value;
  const status = document.getElementById("route-status");
  if (!origin || !destination) return;
  if (origin === destination) {
    status.textContent = "Bandara asal dan tujuan harus berbeda.";
    status.className = "route-loading error";
    return;
  }
  status.textContent = "Mengambil jarak dan durasi referensi dari dataset…";
  status.className = "route-loading";
  try {
    const response = await fetch(`/api/analytics/route-details?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
    const route = await response.json();
    if (!response.ok) throw new Error(route.detail || "Rute tidak ditemukan.");
    form.elements.flight_distance_km.value = route.flight_distance_km;
    form.elements.flight_duration_minutes.value = route.flight_duration_minutes;
    status.textContent = `Terisi otomatis dari ${route.sample_size} data rute ${origin}–${destination}: ${route.flight_distance_km} km dan ${route.flight_duration_minutes} menit. Nilai masih dapat disesuaikan dengan tiket.`;
    status.className = "route-loading";
    updateFormState();
  } catch (error) {
    status.textContent = "Rute tidak ditemukan pada dataset. Isi jarak (km) dan durasi (menit) sesuai tiket.";
    status.className = "route-loading error";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fillHours("booking_hour");
  fillHours("departure_hour");
  form.elements.ticket_class.querySelector('option[value="First"]').textContent = "Kelas utama";
  form.elements.payment_method.querySelector('option[value="Virtual Account"]').textContent = "Akun virtual";
  Object.entries(numberRules).forEach(([name, rule]) => {
    const input = form.elements[name];
    input.min = rule.min;
    input.max = rule.max;
    input.addEventListener("input", () => validateNumber(input, rule));
    input.addEventListener("invalid", () => validateNumber(input, rule));
  });
  form.elements.passenger_age.addEventListener("input", updateAgeValidation);
  form.elements.passenger_age.addEventListener("invalid", updateAgeValidation);
  form.elements.passenger_type.addEventListener("change", updateAgeValidation);
  form.elements.booking_date.addEventListener("change", validateDates);
  form.elements.departure_date.addEventListener("change", validateDates);
  form.elements.origin.addEventListener("change", validateRoute);
  form.elements.destination.addEventListener("change", validateRoute);
  const today = new Date().toISOString().slice(0, 10);
  form.elements.booking_date.value = today;
  form.elements.departure_date.min = today;
  form.addEventListener("input", updateFormState);
  form.addEventListener("change", updateFormState);
  form.elements.origin.addEventListener("change", fillRouteDetails);
  form.elements.destination.addEventListener("change", fillRouteDetails);
  form.addEventListener("reset", () => setTimeout(updateFormState, 0));
  updateAgeValidation();
  validateDates();
  updateFormState();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.classList.remove("show");
  if (!form.reportValidity()) return;
  const booking = new Date(`${form.elements.booking_date.value}T00:00:00`);
  const departure = new Date(`${form.elements.departure_date.value}T00:00:00`);
  validateDates();
  validateRoute();
  updateAgeValidation();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  for (const key of ["booking_hour","passenger_age","passenger_count","flight_distance_km","flight_duration_minutes","departure_hour","transit_count","ticket_price_idr","baggage_count","previous_cancellation_history"]) data[key] = Number(data[key]);
  submitButton.disabled = true;
  submitButton.innerHTML = "<i data-lucide='loader-circle'></i> Menghitung…";
  window.lucide?.createIcons();
  try {
    const response = await fetch("/api/predict", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) {
      const detail = Array.isArray(payload.detail) ? payload.detail.map((item) => item.msg).join(" ") : payload.detail;
      throw new Error(detail || "Prediksi tidak dapat diproses.");
    }
    sessionStorage.setItem("flight-risk-latest", JSON.stringify({ ...payload, request:data, created_at:new Date().toISOString() }));
    window.location.href = "/result.html";
  } catch (error) {
    showError(error.message);
    submitButton.disabled = false;
    submitButton.innerHTML = "<i data-lucide='sparkles'></i> Hitung peluang pembatalan";
    window.lucide?.createIcons();
  }
});
