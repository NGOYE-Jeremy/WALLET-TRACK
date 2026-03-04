/* -------------------------
   VARIABLES GLOBALES
-------------------------- */

var formulaire = document.getElementById("formulaire");
var transactions = []; // Toutes les transactions stockées ici

var categoriesDepense = [];
var montantsDepense = [];

/* -------------------------
   OUVERTURE / FERMETURE FORM
-------------------------- */

function ouvrir_formulaire() {
    formulaire.style.display = "flex";
}

function fermer_formulaire() {
    formulaire.style.display = "none";
}

/* -------------------------
   AJOUT D’UNE TRANSACTION
-------------------------- */

formulaire.addEventListener("submit", function (e) {
    e.preventDefault();

    var montant = Number(document.getElementById("montant").value);
    var categorie = document.getElementById("categorie").value;
    var date = document.querySelector("input[name='date']").value;
    var typeSelectionne = document.getElementById("type").value;

    if (typeSelectionne === "type") {
        alert("Veuillez choisir Revenue ou Dépense");
        return;
    }

    // Ajout dans le tableau
    transactions.push({
        date: date,
        categorie: categorie,
        montant: montant,
        type: typeSelectionne
    });

    afficherTransaction(date, categorie, montant, typeSelectionne);
    recalculerTotaux();

    formulaire.reset();
    fermer_formulaire();
});

/* -------------------------
   AFFICHAGE DANS LE TABLEAU
-------------------------- */

function afficherTransaction(date, categorie, montant, type) {
    var tbody = document.querySelector("tbody");

    var tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${date}</td>
        <td>${categorie}</td>
        <td>${montant}</td>
        <td>${type}</td>
    `;

    tbody.appendChild(tr);
}

/* -------------------------
   CALCUL DES TOTAUX AVEC REDUCE
-------------------------- */

function recalculerTotaux() {

    var totalRevenu = transactions
        .filter(t => t.type === "Revenue")
        .reduce((acc, t) => acc + t.montant, 0);

    var totalDepense = transactions
        .filter(t => t.type === "Dépense")
        .reduce((acc, t) => acc + t.montant, 0);

    var solde = totalRevenu - totalDepense;

    document.querySelector(".revenue .montant p").innerText = totalRevenu + " FCFA";
    document.querySelector(".depense .montant p").innerText = totalDepense + " FCFA";
    document.querySelector(".solde .montant p").innerText = solde + " FCFA";

    mettreAJourGraphique();
}

/* -------------------------
   MISE À JOUR DU GRAPHIQUE
-------------------------- */

function mettreAJourGraphique() {
    categoriesDepense.length = 0;
    montantsDepense.length = 0;

    transactions
        .filter(t => t.type === "Dépense")
        .forEach(t => {
            categoriesDepense.push(t.categorie);
            montantsDepense.push(t.montant);
        });

    chartDepense.update();
}

/* -------------------------
   EXPORT CSV
-------------------------- */

function exporterCSV() {
    var table = document.querySelector("table");
    if (!table) return;

    var lignes = table.querySelectorAll("tr");
    var csv = [];

    lignes.forEach(function (ligne) {
        var colonnes = ligne.querySelectorAll("th, td");
        var row = [];

        colonnes.forEach(function (col) {
            var texte = col.innerText.replace(/"/g, '""');
            row.push('"' + texte + '"');
        });

        csv.push(row.join(","));
    });

    var blob = new Blob([csv.join("\n")], {
        type: "text/csv;charset=utf-8;"
    });

    var lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "wallet-track.csv";
    lien.click();
}

document.querySelector(".btn-export").addEventListener("click", exporterCSV);

/* -------------------------
   GRAPHIQUE DOUGHNUT
-------------------------- */

var ctx = document.getElementById("chartDepense").getContext("2d");

var chartDepense = new Chart(ctx, {
    type: "doughnut",
    data: {
        labels: categoriesDepense,
        datasets: [{
            data: montantsDepense,
            backgroundColor: [
                "#ff0000", "#ff8000", "#51ff00",
                "#ff00d0", "#00ffd5", "#5500ff"
            ],
            borderWidth: 1
        }]
    },
    options: {
        cutout: "70%",
        plugins: {
            legend: { position: "bottom" },
            tooltip: { enabled: true },
            beforeDraw: (chart) => {
                const { ctx, chartArea: { width, height } } = chart;
                ctx.save();
                ctx.font = "bold 20px sans-serif";
                ctx.fillStyle = "#333";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                var totalDepense = transactions
                    .filter(t => t.type === "Dépense")
                    .reduce((acc, t) => acc + t.montant, 0);

                ctx.fillText(totalDepense + " FCFA", width / 2, height / 2);
            }
        }
    }
});