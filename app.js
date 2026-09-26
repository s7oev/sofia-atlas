const chartCanvas = document.querySelector("#chart");
const currencySelect = document.querySelector("#currency");
const periodLabel = document.querySelector("#period");
const latestLabel = document.querySelector("#latest");
const rowsBody = document.querySelector("#rows");
const errorLabel = document.querySelector("#error");
const pricesCsvUrl = window.SOFIA_ATLAS?.pricesCsvUrl;

const format = (value, digits = 0) =>
  new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
const quarter = (q) => {
  const [year, n] = q.split("-Q");
  return `${year}, Q${n}`;
};
let chart;
function draw(data) {
  if (!chartCanvas || !currencySelect || !periodLabel || !latestLabel) return;

  const currency = currencySelect.value;
  const suffix = currency === "eur" ? "€" : "лв.";
  const key = `implied_${currency}_per_m2`;
  const last = data.at(-1);
  periodLabel.textContent = quarter(last.quarter);
  latestLabel.textContent = `${format(last[key])} ${suffix}/м²`;
  if (chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: data.map((d) => quarter(d.quarter)),
      datasets: [
        {
          data: data.map((d) => d[key]),
          borderColor: "#287460",
          backgroundColor: "#2874600d",
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#287460",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false, axis: "x" },
      plugins: {
        legend: { display: false },
        tooltip: {
          position: "nearest",
          animation: false,
          displayColors: false,
          backgroundColor: "#233b34",
          padding: 12,
          cornerRadius: 5,
          callbacks: {
            label: (context) => `${format(context.parsed.y, 2)} ${suffix}/м²`,
            afterLabel: (context) => {
              const change = data[context.dataIndex].quarterly_change_pct;
              return `${change > 0 ? "+" : ""}${format(change, 1)}% спрямо предходното тримесечие`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: false,
            callback: (_value, index) =>
              data[index].quarter.endsWith("Q1") &&
              Number(data[index].quarter.slice(0, 4)) % 2 === 1
                ? data[index].quarter.slice(0, 4)
                : "",
          },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "#e8ece8" },
          ticks: { callback: (value) => format(value) },
          title: { display: true, text: `${suffix}/м²` },
        },
      },
    },
  });
}

if (chartCanvas && pricesCsvUrl) {
  fetch(pricesCsvUrl)
    .then((r) => {
      if (!r.ok) throw Error(r.status);
      return r.text();
    })
    .then((text) => {
      const [header, ...lines] = text.trim().split(/\r?\n/);
      const keys = header.split(",");
      const data = lines.map((line) =>
        Object.fromEntries(
          line.split(",").map((v, i) => [keys[i], i === 0 ? v : Number(v)]),
        ),
      );
      if (
        !data.length ||
        data.some(
          (d) =>
            !Number.isFinite(d.implied_eur_per_m2) ||
            !Number.isFinite(d.implied_bgn_per_m2),
        )
      )
        throw Error("Invalid data");

      draw(data);
      currencySelect?.addEventListener("change", () => draw(data));

      if (rowsBody) {
        rowsBody.textContent = "";
        for (const d of [...data].reverse()) {
          const tr = document.createElement("tr");
          for (const v of [
            quarter(d.quarter),
            `${format(d.quarterly_change_pct, 1)}%`,
            format(d.implied_eur_per_m2, 2),
            format(d.implied_bgn_per_m2, 2),
          ]) {
            const td = document.createElement("td");
            td.textContent = v;
            tr.append(td);
          }
          rowsBody.append(tr);
        }
      }
    })
    .catch((error) => {
      console.error(error);
      if (errorLabel) errorLabel.hidden = false;
      if (periodLabel) periodLabel.textContent = "Данните не са достъпни";
    });
} else if (chartCanvas) {
  if (errorLabel) errorLabel.hidden = false;
  if (periodLabel) periodLabel.textContent = "Данните не са достъпни";
  console.error("Missing Sofia Atlas pricesCsvUrl configuration");
}
