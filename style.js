var formulaire = document.getElementById("formulaire");

function ouvrir_formulaire(){
    formulaire.style.display = "flex";
}
function fermer_formulaire(){
    formulaire.style.display = "none";
}

/* -------------------------
   AJOUT DES TRANSACTIONS
-------------------------- */

var totalRevenu = 0;
var totalDepense = 0;

formulaire.addEventListener("submit", function(e) {
    e.preventDefault();

    var montant = Number(document.getElementById("montant").value);
    var categorie = document.getElementById("categorie").value;
    var date = document.querySelector("input[name='date']").value;

    var typeSelectionne = document.getElementById("type").value;

    if (typeSelectionne === "type") {
        alert("Veuillez choisir Revenue ou Dépense");
        return;
    }

    // ✅ CONDITION : montant doit être positif
    if (montant <= 0) {
        alert("Le montant doit obligatoirement être positif !");
        return;
    }

    var tbody = document.querySelector("tbody");

    var tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${date}</td>
        <td>${categorie}</td>
        <td>${montant}</td>
        <td>${typeSelectionne}</td>
    `;

    tbody.appendChild(tr);

    mettreAJourTotaux(montant, typeSelectionne, categorie);

    formulaire.reset();
    fermer_formulaire();
});

/* -------------------------
   MISE À JOUR DES TOTAUX
-------------------------- */

function mettreAJourTotaux(montant, type, categorie) {
    if (type === "Revenue") {
        totalRevenu += montant;
    } else {
        totalDepense += montant;
    }

    var solde = totalRevenu - totalDepense;

    document.querySelector(".revenue .montant p").innerText = totalRevenu + " FCFA";
    document.querySelector(".depense .montant p").innerText = totalDepense + " FCFA";
    document.querySelector(".solde .montant p").innerText = solde + " FCFA";

    if (type === "Dépense") {
        categoriesDepense.push(categorie);
        montantsDepense.push(montant);
        chartDepense.update();
    }
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
   GRAPHIQUE DES DÉPENSES
-------------------------- */

var ctx = document.getElementById("chartDepense").getContext("2d");

var categoriesDepense = [];
var montantsDepense = [];

var chartDepense = new Chart(ctx, {
    type: "doughnut",
    data: {
        labels: categoriesDepense,
        datasets: [{
            data: montantsDepense,
            backgroundColor: [
                "#ff6384", "#ff9f40", "#ffcd56",
                "#4bc0c0", "#36a2eb", "#9966ff"
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
                ctx.fillText(totalDepense + " FCFA", width / 2, height / 2);
            }
        }
    }
});