var formulaire = document.getElementById("formulaire");
var formulaire_contact = document.getElementById("formulaire_contact");

var transactions = [];
var soldeHistory = [];
var labelsSolde = [];

var currentCurrency = "XAF";
// Toutes les valeurs internes sont en XAF
var rates = { XAF: 1, USD: 600, EUR: 650 };
var symbols = { XAF: "XAF", USD: "$", EUR: "€" };

// Convertit un montant XAF en monnaie affichée
function convert(amountXAF) {
    return amountXAF / rates[currentCurrency];
}

function format(amountXAF) {
    return convert(amountXAF).toFixed(2) + " " + symbols[currentCurrency];
}

// Ouvrir ou fermer les formulaires
function ouvrir_formulaire() { 
    formulaire.style.display = "flex"; 
}
function fermer_formulaire() { 
    formulaire.style.display = "none"; 
}
function ouverture_formulaire_contacte() {
     formulaire_contact.style.display = "block"; 
    }
function fermer_formulaire_contact() { 
    formulaire_contact.style.display = "none"; 
}
// ********************************fonction de calcule avec reduce()***************************
function calculerTotaux() {
    return transactions.reduce(
        (acc, t) => {
            if (t.type === "Revenue") acc.totalRevenu += t.montantXAF;
            if (t.type === "Dépense") acc.totalDepense += t.montantXAF;
            return acc;
        },
        { totalRevenu: 0, totalDepense: 0 }
    );
}
// *************************ajouter une transaction dans le formulaire*****************************
formulaire.addEventListener("submit", function (e) {
    e.preventDefault();

    var montant = Number(document.getElementById("montant").value);
    var categorie = document.getElementById("categorie").value;
    var date = document.querySelector("input[name='date']").value;
    var type = document.getElementById("type").value;

    if (type === "type") return alert("Choisir le type");
    if (montant <= 0) return alert("Montant invalide");

    // On convertit TOUT en XAF dès l’enregistrement
    var montantXAF = montant * rates[currentCurrency];

    transactions.push({ date, categorie, montantXAF, type });

    afficherTransaction(date, categorie, montantXAF, type);
    recalculerTotaux();

    formulaire.reset();
    fermer_formulaire();
});

// ********************affichage d'une transaction dans le tableau********************
function afficherTransaction(date, categorie, montantXAF, type) {
    var tbody = document.querySelector("tbody");
    var tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${date}</td>
        <td>${categorie}</td>
        <td>${format(montantXAF)}</td>
        <td>${type}</td>
    `;

    tbody.appendChild(tr);
}

// ************************recalculer et afficher les nouveaux montants*********************
function recalculerTotaux() {
    var { totalRevenu, totalDepense } = calculerTotaux();
    var solde = totalRevenu - totalDepense;

    document.querySelector(".revenue .montant p").innerText = format(totalRevenu);
    document.querySelector(".depense .montant p").innerText = format(totalDepense);
    document.querySelector(".solde .montant p").innerText = format(solde);

    soldeHistory.push(solde);
    labelsSolde.push(new Date().toLocaleTimeString());

    updateCharts();
}

//**************************** */ changement de la monaie*****************************
document.getElementById("monnaie").addEventListener("change", function () {
    currentCurrency = this.value;

    document.querySelector("tbody").innerHTML = "";
    transactions.forEach(t => afficherTransaction(t.date, t.categorie, t.montantXAF, t.type));

    recalculerTotaux();
});

// *****************************gestion des graphiques avec Chart.js*************************
var ctx1 = document.getElementById("chartDepense").getContext("2d");
var ctx2 = document.getElementById("chartFlux").getContext("2d");
var ctx3 = document.getElementById("chartSolde").getContext("2d");

var chartDepense = new Chart(ctx1, {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: ["#ff0000", "#ff8000", "#51ff00", "#ff00d0", "#00ffd5", "#5500ff"] }] },
    options: { cutout: "70%", plugins: { legend: { position: "bottom" } } }
});

var chartFlux = new Chart(ctx2, {
    type: "bar",
    data: { labels: ["Revenus", "Dépenses"], datasets: [{ data: [0, 0], backgroundColor: ["#36a2eb", "#ff6384"] }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
});

var chartSolde = new Chart(ctx3, {
    type: "line",
    data: { labels: labelsSolde, datasets: [{ data: soldeHistory, borderColor: "#4bc0c0", fill: false, tension: 0.3 }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
});

function updateCharts() {
    var depenses = transactions.filter(t => t.type === "Dépense");

    chartDepense.data.labels = depenses.map(t => t.categorie);
    chartDepense.data.datasets[0].data = depenses.map(t => convert(t.montantXAF));
    chartDepense.update();

    var { totalRevenu, totalDepense } = calculerTotaux();
    chartFlux.data.datasets[0].data = [convert(totalRevenu), convert(totalDepense)];
    chartFlux.update();

    chartSolde.data.labels = labelsSolde;
    chartSolde.data.datasets[0].data = soldeHistory.map(s => convert(s));
    chartSolde.update();
}

// ***************************exporter les données en fichier csv***********************
function exporterCSV() {
    if (transactions.length === 0) return alert("Aucune transaction à exporter.");

    var csv = ["Date;Catégorie;Montant;Type"];

    transactions.forEach(t => {
        csv.push(`${t.date};${t.categorie};${format(t.montantXAF)};${t.type}`);
    });

    var blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    var lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "wallet-track.csv";
    lien.click();
}

document.querySelector(".btn-export").addEventListener("click", exporterCSV);

// **********************sauvegarder les données**********************
window.addEventListener("load", function () {
    var savedUser = localStorage.getItem("user");
    if (!savedUser) {
        document.getElementById("authContainer").style.display = "flex";
        document.getElementById("app").style.display = "none";
        return;
    }

    savedUser = JSON.parse(savedUser);
    document.getElementById("usernameDisplay").innerText = savedUser.name;

    document.getElementById("authContainer").style.display = "none";
    document.getElementById("app").style.display = "flex";

    var savedTransactions = localStorage.getItem("transactions");
    var savedSoldeHistory = localStorage.getItem("soldeHistory");
    var savedLabelsSolde = localStorage.getItem("labelsSolde");

    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        transactions.forEach(t => afficherTransaction(t.date, t.categorie, t.montantXAF, t.type));
    }

    if (savedSoldeHistory) soldeHistory = JSON.parse(savedSoldeHistory);
    if (savedLabelsSolde) labelsSolde = JSON.parse(savedLabelsSolde);

    recalculerTotaux();
});

function sauvegarderDonnees() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("soldeHistory", JSON.stringify(soldeHistory));
    localStorage.setItem("labelsSolde", JSON.stringify(labelsSolde));
}

var _oldRecalculerTotaux = recalculerTotaux;
recalculerTotaux = function () {
    _oldRecalculerTotaux();
    sauvegarderDonnees();
};

// **********************supprimer toutes les données***********************
function resetDonnees() {
    if (!confirm("Voulez-vous vraiment supprimer toutes vos données ?")) return;

    localStorage.clear();

    transactions = [];
    soldeHistory = [];
    labelsSolde = [];

    document.querySelector("tbody").innerHTML = "";
    document.querySelector(".revenue .montant p").innerText = format(0);
    document.querySelector(".depense .montant p").innerText = format(0);
    document.querySelector(".solde .montant p").innerText = format(0);

    updateCharts();

    alert("Toutes les données ont été supprimées !");
}

function signupUser() {
    var name = document.getElementById("signupName").value;
    var pass = document.getElementById("signupPassword").value;

    if (!name || !pass) return alert("Champs requis");

    localStorage.setItem("user", JSON.stringify({ name, pass }));

    alert("Compte créé");
    showLogin();
}


function loginUser() {
    var name = document.getElementById("loginName").value;
    var pass = document.getElementById("loginPassword").value;

    var saved = localStorage.getItem("user");
    if (!saved) return alert("Aucun compte trouvé");

    saved = JSON.parse(saved);

    if (saved.name !== name || saved.pass !== pass) return alert("Identifiants incorrects");

    document.getElementById("usernameDisplay").innerText = saved.name;

    document.getElementById("authContainer").style.display = "none";
    document.getElementById("app").style.display = "flex";
}

function showSignup() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("signupBox").style.display = "flex";
}

function showLogin() {
    document.getElementById("signupBox").style.display = "none";
    document.getElementById("loginBox").style.display = "flex";
    }


    function logoutUser() {
    // supprimer uniquement l'utilisateur, pas les transactions
    localStorage.removeItem("user");

    // masquer l'application
    document.getElementById("app").style.display = "none";

    // afficher l'écran de connexion
    document.getElementById("authContainer").style.display = "flex";

    // réinitialiser les champs de connexion
    document.getElementById("loginName").value = "";
    document.getElementById("loginPassword").value = "";
}
