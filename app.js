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
Chart.Tooltip.positioners.cursor = function (_elements, position) {
  return { x: position.x, y: position.y };
};
function draw(data) {
  const currency = document.querySelector("#currency").value;
  const suffix = currency === "eur" ? "€" : "лв.";
  const key = `implied_${currency}_per_m2`;
  const last = data.at(-1);
  document.querySelector("#period").textContent = quarter(last.quarter);
  document.querySelector("#latest").textContent =
    `${format(last[key])} ${suffix}/м²`;
  if (chart) chart.destroy();
  chart = new Chart(document.querySelector("#chart"), {
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
          position: "cursor",
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
fetch("data/prices.csv")
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
    document
      .querySelector("#currency")
      .addEventListener("change", () => draw(data));
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
      document.querySelector("#rows").append(tr);
    }
  })
  .catch((error) => {
    console.error(error);
    document.querySelector("#error").hidden = false;
    document.querySelector("#period").textContent = "Данните не са достъпни";
  });
