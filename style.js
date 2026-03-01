/* -------------------------
   FORMULAIRE POPUP
-------------------------- */

const formulaire = document.getElementById("formulaire");
let overlay = document.getElementById("overlay");

// Créer l'overlay s'il n'existe pas
if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.className = 'overlay';
    overlay.onclick = fermer_formulaire;
    document.body.insertBefore(overlay, document.body.firstChild);
}

function ouvrir_formulaire() {
    formulaire.style.display = "flex";
    if (overlay) overlay.classList.add('active');
}

function fermer_formulaire() {
    formulaire.style.display = "none";
    if (overlay) overlay.classList.remove('active');
    effacerErreurs();
}

/* -------------------------
   VARIABLES GLOBALES
-------------------------- */

let totalRevenu = 0;
let totalDepense = 0;
let deviseActuelle = 'XAF';
const tauxBase = { XAF: 1, USD: 0.0015, Euro: 0.0014 };

// Stockage des transactions pour la conversion
const transactions = [];

/* -------------------------
   TOAST NOTIFICATION
-------------------------- */

function afficherToast(message, type) {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* -------------------------
   VALIDATION DU FORMULAIRE
-------------------------- */

function afficherErreur(champId, message) {
    const champ = document.getElementById(champId);
    let erreurDiv = document.getElementById(`erreur-${champId}`);

    if (!erreurDiv) {
        erreurDiv = document.createElement('div');
        erreurDiv.id = `erreur-${champId}`;
        erreurDiv.style.cssText = 'color: #E74C3C; font-size: 12px; margin-top: 4px;';
        champ.parentNode.appendChild(erreurDiv);
    }

    erreurDiv.textContent = message;
    champ.style.borderColor = '#E74C3C';
}

function effacerErreurs() {
    ['montant', 'categorie', 'date', 'type'].forEach(id => {
        const champ = document.getElementById(id);
        const erreurDiv = document.getElementById(`erreur-${id}`);
        if (champ) champ.style.borderColor = '';
        if (erreurDiv) erreurDiv.textContent = '';
    });
}

function validerFormulaire() {
    effacerErreurs();
    let estValide = true;

    const montant = Number(document.getElementById("montant").value);
    const categorie = document.getElementById("categorie").value.trim();
    const date = document.querySelector("input[name='date']")?.value;
    const typeSelectionne = document.getElementById("type").value;

    if (typeSelectionne === "type") {
        afficherErreur('type', 'Veuillez choisir Revenue ou Dépense');
        estValide = false;
    }

    if (!montant || montant <= 0) {
        afficherErreur('montant', 'Le montant doit être supérieur à 0');
        estValide = false;
    }

    if (!categorie) {
        afficherErreur('categorie', 'La catégorie est requise');
        estValide = false;
    }

    if (!date) {
        const dateInput = document.querySelector("input[name='date']");
        if (dateInput) {
            let erreurDiv = document.getElementById('erreur-date');
            if (!erreurDiv) {
                erreurDiv = document.createElement('div');
                erreurDiv.id = 'erreur-date';
                erreurDiv.style.cssText = 'color: #E74C3C; font-size: 12px; margin-top: 4px;';
                dateInput.parentNode.appendChild(erreurDiv);
            }
            erreurDiv.textContent = 'La date est requise';
            dateInput.style.borderColor = '#E74C3C';
        }
        estValide = false;
    }

    return estValide;
}

/* -------------------------
   FORMATAGE UTILITAIRE
-------------------------- */

function formaterMontant(montant) {
    return montant.toLocaleString('fr-FR') + ' ' + deviseActuelle;
}

function formaterDate(dateString) {
    const date = new Date(dateString);
    const jour = date.getDate().toString().padStart(2, '0');
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const annee = date.getFullYear();
    const heures = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${jour}/${mois}/${annee} ${heures}:${minutes}`;
}

/* -------------------------
   AJOUT DES TRANSACTIONS
-------------------------- */

formulaire.addEventListener("submit", function(e) {
    e.preventDefault();

    if (!validerFormulaire()) {
        return;
    }

    const montant = Number(document.getElementById("montant").value);
    const categorie = document.getElementById("categorie").value.trim();
    const date = document.querySelector("input[name='date']").value;
    const typeSelectionne = document.getElementById("type").value;

    const tbody = document.querySelector("tbody");

    const tr = document.createElement("tr");
    tr.dataset.id = Date.now().toString();
    tr.dataset.montant = montant;
    tr.dataset.type = typeSelectionne;
    tr.dataset.categorie = categorie;

    const badgeClass = typeSelectionne === "Revenue" ? "badge-revenue" : "badge-depense";

    tr.innerHTML = `
        <td>${formaterDate(date)}</td>
        <td>${categorie}</td>
        <td>${formaterMontant(montant)}</td>
        <td><span class="${badgeClass}">${typeSelectionne}</span></td>
        <td>
            <button type="button" class="btn-supprimer" aria-label="Supprimer la transaction">🗑️</button>
        </td>
    `;

    // Ajouter l'événement de suppression
    tr.querySelector('.btn-supprimer').addEventListener('click', function() {
        supprimerTransaction(tr);
    });

    tbody.appendChild(tr);

    // Stocker la transaction
    transactions.push({
        id: tr.dataset.id,
        montant: montant,
        categorie: categorie,
        date: date,
        type: typeSelectionne
    });

    mettreAJourTotaux();

    if (typeSelectionne === "Dépense") {
        mettreAJourGraphique();
    }

    afficherToast('Transaction ajoutée avec succès', 'success');

    formulaire.reset();
    fermer_formulaire();
});

/* -------------------------
   SUPPRESSION TRANSACTION
-------------------------- */

function supprimerTransaction(row) {
    const montant = Number(row.dataset.montant);
    const type = row.dataset.type;
    const categorie = row.dataset.categorie;

    // Supprimer du tableau des transactions
    const index = transactions.findIndex(t => t.id === row.dataset.id);
    if (index > -1) {
        transactions.splice(index, 1);
    }

    // Supprimer la ligne du tableau
    row.remove();

    // Recalculer les totaux
    recalculerTotaux();

    afficherToast('Transaction supprimée', 'success');
}

function recalculerTotaux() {
    totalRevenu = 0;
    totalDepense = 0;

    // Vider les données du graphique
    categoriesDepense.length = 0;
    montantsDepense.length = 0;

    // Agréger les dépenses par catégorie
    const depensesParCategorie = {};

    transactions.forEach(t => {
        const montantConverti = t.montant * tauxBase[deviseActuelle];
        if (t.type === "Revenue") {
            totalRevenu += montantConverti;
        } else {
            totalDepense += montantConverti;
            if (!depensesParCategorie[t.categorie]) {
                depensesParCategorie[t.categorie] = 0;
            }
            depensesParCategorie[t.categorie] += montantConverti;
        }
    });

    // Mettre à jour les tableaux du graphique
    for (const [cat, montant] of Object.entries(depensesParCategorie)) {
        categoriesDepense.push(cat);
        montantsDepense.push(montant);
    }

    afficherTotaux();
    mettreAJourGraphique();
}

/* -------------------------
   MISE À JOUR DES TOTAUX
-------------------------- */

function mettreAJourTotaux() {
    const montantInput = Number(document.getElementById("montant").value);
    const typeSelectionne = document.getElementById("type").value;

    // Convertir le montant selon la devise actuelle
    const montantConverti = montantInput * tauxBase[deviseActuelle];

    if (typeSelectionne === "Revenue") {
        totalRevenu += montantConverti;
    } else {
        totalDepense += montantConverti;
    }

    afficherTotaux();
}

function afficherTotaux() {
    const solde = totalRevenu - totalDepense;

    document.querySelector(".revenue .montant p").innerText = formaterMontant(totalRevenu);
    document.querySelector(".depense .montant p").innerText = formaterMontant(totalDepense);
    document.querySelector(".solde .montant p").innerText = formaterMontant(solde);
}

/* -------------------------
   CONVERSION DE DEVISE
-------------------------- */

const selectMonnaie = document.getElementById("monnaie");

if (selectMonnaie) {
    selectMonnaie.addEventListener("change", function() {
        const nouvelleDevise = this.value;
        const tauxAncien = tauxBase[deviseActuelle];
        const tauxNouveau = tauxBase[nouvelleDevise];
        const ratio = tauxNouveau / tauxAncien;

        deviseActuelle = nouvelleDevise;

        // Convertir les totaux
        totalRevenu = totalRevenu * ratio;
        totalDepense = totalDepense * ratio;

        afficherTotaux();

        // Mettre à jour le graphique avec les nouveaux montants
        for (let i = 0; i < montantsDepense.length; i++) {
            montantsDepense[i] = montantsDepense[i] * ratio;
        }
        mettreAJourGraphique();

        // Mettre à jour les montants dans le tableau
        const rows = document.querySelectorAll("tbody tr");
        rows.forEach(row => {
            const montantBase = Number(row.dataset.montant);
            const montantConverti = montantBase * tauxBase[deviseActuelle];
            row.cells[2].textContent = formaterMontant(montantConverti);
        });
    });
}

/* -------------------------
   EXPORT CSV
-------------------------- */

function exporterCSV() {
    const table = document.querySelector("table");
    if (!table) return;

    const lignes = table.querySelectorAll("tr");
    const csv = [];

    lignes.forEach(function(ligne) {
        const colonnes = ligne.querySelectorAll("th, td");
        const row = [];

        colonnes.forEach(function(col, index) {
            // Ne pas inclure la colonne Action (dernière colonne)
            if (index === colonnes.length - 1 && ligne.querySelector("th")) return;
            if (col.querySelector("button")) return;

            let texte = col.innerText.replace(/"/g, '""');
            row.push('"' + texte + '"');
        });

        csv.push(row.join(","));
    });

    const blob = new Blob([csv.join("\n")], {
        type: "text/csv;charset=utf-8;"
    });

    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "wallet-track.csv";
    lien.click();
}

const btnExport = document.querySelector(".btn-export");
if (btnExport) {
    btnExport.addEventListener("click", exporterCSV);
}

/* -------------------------
   GRAPHIQUE DES DÉPENSES
-------------------------- */

// Plugin pour le texte au centre
const pluginTexteCenter = {
    id: 'texteCenter',
    afterDraw(chart) {
        const { ctx, chartArea: { left, top, width, height } } = chart;
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

        ctx.save();
        ctx.font = 'bold 13px Poppins, sans-serif';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Total', centerX, centerY - 14);
        ctx.font = 'bold 20px Poppins, sans-serif';
        ctx.fillStyle = '#333';
        ctx.fillText(
            total.toLocaleString('fr-FR') + ' ' + deviseActuelle,
            centerX, centerY + 14
        );
        ctx.restore();
    }
};

const chartCanvas = document.getElementById("chartDepense");
let chartDepense = null;

// Données du graphique
const categoriesDepense = [];
const montantsDepense = [];

// Couleurs améliorées
const couleursGraphique = [
    '#1A6B8A', '#1DB954', '#E74C3C', '#F39C12',
    '#9B59B6', '#3498DB', '#E67E22', '#1ABC9C'
];

if (chartCanvas) {
    const ctx = chartCanvas.getContext("2d");

    chartDepense = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: categoriesDepense,
            datasets: [{
                data: montantsDepense,
                backgroundColor: couleursGraphique,
                borderWidth: 1
            }]
        },
        options: {
            cutout: "70%",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return ` ${context.raw.toLocaleString('fr-FR')} ${deviseActuelle} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [pluginTexteCenter]
    });
}

function mettreAJourGraphique() {
    if (chartDepense) {
        chartDepense.data.labels = categoriesDepense;
        chartDepense.data.datasets[0].data = montantsDepense;
        chartDepense.update();
    }
    mettreAJourResumeGraphique();
}

function mettreAJourResumeGraphique() {
    const summaryDiv = document.getElementById('chart-summary');
    if (!summaryDiv) return;

    if (categoriesDepense.length === 0) {
        summaryDiv.textContent = 'Aucune dépense enregistrée';
        return;
    }

    const total = montantsDepense.reduce((a, b) => a + b, 0);
    const categorieMax = categoriesDepense[montantsDepense.indexOf(Math.max(...montantsDepense))];
    summaryDiv.textContent = `Total: ${formaterMontant(total)} - Catégorie principale: ${categorieMax}`;
}
