var formulaire = document.getElementById("formulaire");
var transactions = [];
var soldeHistory = [];
var labelsSolde = [];
var currentCurrency = "XAF";

var rates = { XAF: 1, USD: 600, EUR: 650 };
var symbols = { XAF: "XAF", USD: "$", EUR: "€" };

function convert(amount) {
    return amount / rates[currentCurrency];
}

function format(amount) {
    return convert(amount).toFixed(2) + " " + symbols[currentCurrency];
}

function ouvrir_formulaire() {
    formulaire.style.display = "flex";
}

function fermer_formulaire() {
    formulaire.style.display = "none";
}

formulaire.addEventListener("submit", function (e) {
    e.preventDefault();

    var montant = Number(document.getElementById("montant").value);
    var categorie = document.getElementById("categorie").value;
    var date = document.querySelector("input[name='date']").value;
    var type = document.getElementById("type").value;

    if (type === "type") return alert("Choisir Revenue ou Dépense");

    transactions.push({ date, categorie, montant, type });

    afficherTransaction(date, categorie, montant, type);
    recalculerTotaux();

    formulaire.reset();
    fermer_formulaire();
});

function afficherTransaction(date, categorie, montant, type) {
    var tbody = document.querySelector("tbody");
    var tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${date}</td>
        <td>${categorie}</td>
        <td>${format(montant)}</td>
        <td>${type}</td>
    `;

    tbody.appendChild(tr);
}

function recalculerTotaux() {
    var totalRevenu = transactions.filter(t => t.type === "Revenue").reduce((a, t) => a + t.montant, 0);
    var totalDepense = transactions.filter(t => t.type === "Dépense").reduce((a, t) => a + t.montant, 0);
    var solde = totalRevenu - totalDepense;

    document.querySelector(".revenue .montant p").innerText = format(totalRevenu);
    document.querySelector(".depense .montant p").innerText = format(totalDepense);
    document.querySelector(".solde .montant p").innerText = format(solde);

    soldeHistory.push(solde);
    labelsSolde.push(new Date().toLocaleTimeString());

    updateCharts();
}

document.getElementById("monnaie").addEventListener("change", function () {
    currentCurrency = this.value;

    document.querySelector("tbody").innerHTML = "";
    transactions.forEach(t => afficherTransaction(t.date, t.categorie, t.montant, t.type));

    recalculerTotaux();
});

var ctx1 = document.getElementById("chartDepense").getContext("2d");
var ctx2 = document.getElementById("chartFlux").getContext("2d");
var ctx3 = document.getElementById("chartSolde").getContext("2d");

var chartDepense = new Chart(ctx1, {
    type: "doughnut",
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ["#ff0000", "#ff8000", "#51ff00", "#ff00d0", "#00ffd5", "#5500ff"]
        }]
    },
    options: {
        cutout: "70%",
        plugins: { legend: { position: "bottom" } }
    }
});

var chartFlux = new Chart(ctx2, {
    type: "bar",
    data: {
        labels: ["Revenus", "Dépenses"],
        datasets: [{
            data: [0, 0],
            backgroundColor: ["#36a2eb", "#ff6384"]
        }]
    },
    options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
    }
});

var chartSolde = new Chart(ctx3, {
    type: "line",
    data: {
        labels: labelsSolde,
        datasets: [{
            data: soldeHistory,
            borderColor: "#4bc0c0",
            fill: false,
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
    }
});

function updateCharts() {
    var depenses = transactions.filter(t => t.type === "Dépense");

    chartDepense.data.labels = depenses.map(t => t.categorie);
    chartDepense.data.datasets[0].data = depenses.map(t => convert(t.montant));
    chartDepense.update();

    var totalRevenu = transactions.filter(t => t.type === "Revenue").reduce((a, t) => a + t.montant, 0);
    var totalDepense = transactions.filter(t => t.type === "Dépense").reduce((a, t) => a + t.montant, 0);

    chartFlux.data.datasets[0].data = [convert(totalRevenu), convert(totalDepense)];
    chartFlux.update();

    chartSolde.data.labels = labelsSolde;
    chartSolde.data.datasets[0].data = soldeHistory.map(s => convert(s));
    chartSolde.update();
}

function exporterCSV() {
    if (transactions.length === 0) {
        alert("Aucune transaction à exporter.");
        return;
    }

    var csv = [];
    csv.push("Date,Catégorie,Montant,Type");

    transactions.forEach(t => {
        var montantConverti = convert(t.montant).toFixed(2) + " " + symbols[currentCurrency];
        csv.push(`${t.date},${t.categorie},${montantConverti},${t.type}`);
    });

    var blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    var lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "wallet-track.csv";
    lien.click();
}

document.querySelector(".btn-export").addEventListener("click", exporterCSV);
