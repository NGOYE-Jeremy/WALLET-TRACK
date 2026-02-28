var formulaire = document.getElementById("formulaire");

function ouvrir_formulaire(){
    formulaire.style.display = "flex";
}
function fermer_formulaire(){
    formulaire.style.display = "none";
}

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