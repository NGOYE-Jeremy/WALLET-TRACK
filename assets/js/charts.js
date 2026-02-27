/**
 * Module de visualisation des données WalletTrack
 * Gère les 3 graphiques : camembert, barres, ligne
 * Utilise Chart.js via CDN (window.Chart)
 * ES6 Module - Vanilla JavaScript
 */

// ═══════════════════════════════════════════
// ÉTAT INTERNE (PRIVÉ)
// ═══════════════════════════════════════════

let instanceCamembert = null;
let instanceBarres = null;
let instanceLigne = null;
let ongletActif = 'camembert';
let donneesActuelles = [];
let debounceTimer = null;
let deviseActuelle = 'EUR';

const COULEURS = [
  '#1A6B8A', '#1DB954', '#E74C3C', '#F39C12',
  '#9B59B6', '#3498DB', '#E67E22', '#1ABC9C',
  '#E91E63', '#607D8B', '#FF5722', '#795548'
];

const TAUX_CONVERSION = {
  EUR: 1,
  FCFA: 655.957,
  USD: 1.08
};

const SYMBOLES = {
  EUR: '€',
  FCFA: 'FCFA',
  USD: '$'
};

// ═══════════════════════════════════════════
// FONCTIONS PRIVÉES UTILITAIRES
// ═══════════════════════════════════════════

/**
 * Récupère les couleurs du thème depuis les CSS Custom Properties
 * @returns {Object} Objet contenant les couleurs du thème
 */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--color-text').trim(),
    textSecondary: style.getPropertyValue('--color-text-secondary').trim(),
    card: style.getPropertyValue('--color-card').trim(),
    border: style.getPropertyValue('--color-border').trim(),
    bg: style.getPropertyValue('--color-bg').trim()
  };
}

/**
 * Détruit une instance Chart.js proprement
 * @param {Chart} instance - Instance Chart.js à détruire
 * @returns {null}
 */
function detruireInstance(instance) {
  if (instance && typeof instance.destroy === 'function') {
    instance.destroy();
  }
  return null;
}

/**
 * Formate un nombre en devise actuelle avec conversion
 * @param {number} montant - Montant à formater
 * @returns {string} Montant formaté dans la devise actuelle
 */
function formatMontant(montant) {
  const montantConverti = montant * TAUX_CONVERSION[deviseActuelle];
  const symbole = SYMBOLES[deviseActuelle];
  
  if (deviseActuelle === 'FCFA') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(montantConverti);
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: deviseActuelle
  }).format(montantConverti);
}

/**
 * Formate un nombre en notation compacte (K, M, etc.) avec conversion
 * @param {number} montant - Montant à formater
 * @returns {string} Montant formaté en notation compacte
 */
function formatMontantCompact(montant) {
  const montantConverti = montant * TAUX_CONVERSION[deviseActuelle];
  
  if (deviseActuelle === 'FCFA') {
    return new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'XOF'
    }).format(montantConverti);
  }
  
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: deviseActuelle
  }).format(montantConverti);
}

/**
 * Génère les 6 derniers mois à partir d'aujourd'hui
 * @returns {Array} Tableau d'objets {date, label}
 */
function generer6DerniersMois() {
  const mois = [];
  const aujourd = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(aujourd.getFullYear(), aujourd.getMonth() - i, 1);
    const label = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    mois.push({ date, label });
  }
  
  return mois;
}

/**
 * Obtient tous les jours du mois courant
 * @returns {Array} Tableau de dates
 */
function obtenirJoursDuMois() {
  const aujourd = new Date();
  const annee = aujourd.getFullYear();
  const mois = aujourd.getMonth();
  const dernierJour = new Date(annee, mois + 1, 0).getDate();
  
  const jours = [];
  for (let jour = 1; jour <= dernierJour; jour++) {
    jours.push(new Date(annee, mois, jour));
  }
  
  return jours;
}

/**
 * Formate une date au format "1 Jan", "2 Jan", etc.
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée
 */
function formatJour(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Crée un gradient vertical pour le graphique ligne
 * @param {CanvasRenderingContext2D} ctx - Contexte canvas
 * @param {number} height - Hauteur du canvas
 * @param {string} couleur - Couleur de base (hex)
 * @returns {CanvasGradient} Gradient créé
 */
function creerGradient(ctx, height, couleur) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  
  // Convertir hex en rgba avec opacité
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  gradient.addColorStop(0, hexToRgba(couleur, 0.3));
  gradient.addColorStop(1, hexToRgba(couleur, 0.01));
  
  return gradient;
}

/**
 * Plugin Chart.js pour afficher le texte au centre du doughnut
 */
const pluginTexteCenter = {
  id: 'texteCenter',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    
    const { ctx, chartArea: { left, top, width, height } } = chart;
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Récupérer le total des données
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const themeColors = getThemeColors();
    
    // Dessiner "Total"
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = themeColors.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', centerX, centerY - 15);
    
    // Dessiner le montant
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = themeColors.text;
    ctx.fillText(formatMontant(total), centerX, centerY + 15);
  }
};

// ═══════════════════════════════════════════
// FONCTIONS DE MISE À JOUR DES GRAPHIQUES
// ═══════════════════════════════════════════

/**
 * Met à jour le graphique camembert (répartition des dépenses par catégorie)
 * @param {Array} transactions - Tableau de transactions
 */
function updateCamembert(transactions) {
  const canvas = document.getElementById('chart-camembert');
  const emptyMsg = document.getElementById('chart-empty-message');
  const themeColors = getThemeColors();
  
  // Filtrer les dépenses
  const depenses = transactions.filter(t => t.type === 'depense');
  
  // Si aucune dépense
  if (depenses.length === 0) {
    canvas.hidden = true;
    emptyMsg.hidden = false;
    emptyMsg.textContent = 'Aucune dépense à afficher 💸';
    instanceCamembert = detruireInstance(instanceCamembert);
    return;
  }
  
  // Grouper par catégorie
  const parCategorie = depenses.reduce((acc, t) => {
    acc[t.categorie] = (acc[t.categorie] || 0) + t.montant;
    return acc;
  }, {});
  
  const labels = Object.keys(parCategorie);
  const data = Object.values(parCategorie);
  
  // Afficher le canvas, masquer le message
  canvas.hidden = false;
  emptyMsg.hidden = true;
  
  // Détruire l'ancienne instance
  instanceCamembert = detruireInstance(instanceCamembert);
  
  // Créer la nouvelle instance
  instanceCamembert = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: COULEURS.slice(0, labels.length),
        borderColor: themeColors.card,
        borderWidth: 3,
        hoverOffset: 12,
        hoverBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { size: 12, family: "'Inter', sans-serif" },
            color: themeColors.text
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const valeur = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pourcentage = ((valeur / total) * 100).toFixed(1);
              const formate = formatMontant(valeur);
              return ` ${formate}  (${pourcentage}%)`;
            },
            title: function(context) {
              return `📂 ${context[0].label}`;
            }
          },
          backgroundColor: themeColors.card,
          titleColor: themeColors.text,
          bodyColor: themeColors.textSecondary,
          borderColor: themeColors.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 600,
        easing: 'easeInOutQuart'
      }
    },
    plugins: [pluginTexteCenter]
  });
}

/**
 * Met à jour le graphique barres (revenus vs dépenses sur 6 mois)
 * @param {Array} transactions - Tableau de transactions
 */
function updateBarres(transactions) {
  const canvas = document.getElementById('chart-barres');
  const themeColors = getThemeColors();
  
  // Générer les 6 derniers mois
  const mois = generer6DerniersMois();
  
  // Initialiser les données pour chaque mois
  const donneesParMois = mois.map(m => ({
    label: m.label,
    revenus: 0,
    depenses: 0
  }));
  
  // Remplir les données
  transactions.forEach(t => {
    const dateTransaction = new Date(t.date);
    const moisTransaction = dateTransaction.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    
    const moisData = donneesParMois.find(m => m.label === moisTransaction);
    if (moisData) {
      if (t.type === 'revenu') {
        moisData.revenus += t.montant;
      } else if (t.type === 'depense') {
        moisData.depenses += t.montant;
      }
    }
  });
  
  const labels = donneesParMois.map(m => m.label);
  const revenus = donneesParMois.map(m => m.revenus);
  const depenses = donneesParMois.map(m => m.depenses);
  
  // Détruire l'ancienne instance
  instanceBarres = detruireInstance(instanceBarres);
  
  // Créer la nouvelle instance
  instanceBarres = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenus',
          data: revenus,
          backgroundColor: 'rgba(29, 185, 84, 0.8)',
          borderColor: '#1DB954',
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Dépenses',
          data: depenses,
          backgroundColor: 'rgba(231, 76, 60, 0.8)',
          borderColor: '#E74C3C',
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            font: { size: 12 },
            color: themeColors.text
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const formate = formatMontant(ctx.raw);
              return ` ${ctx.dataset.label} : ${formate}`;
            },
            footer: (items) => {
              const revenus = items.find(i => i.dataset.label === 'Revenus')?.raw || 0;
              const depenses = items.find(i => i.dataset.label === 'Dépenses')?.raw || 0;
              const diff = revenus - depenses;
              const formate = formatMontant(Math.abs(diff));
              return diff >= 0 
                ? `✅ Épargne : +${formate}`
                : `❌ Déficit : -${formate}`;
            }
          },
          backgroundColor: themeColors.card,
          titleColor: themeColors.text,
          bodyColor: themeColors.textSecondary,
          footerColor: themeColors.text,
          borderColor: themeColors.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: themeColors.textSecondary }
        },
        y: {
          beginAtZero: true,
          grid: { color: themeColors.border, drawBorder: false },
          ticks: {
            color: themeColors.textSecondary,
            callback: (val) => formatMontantCompact(val)
          }
        }
      },
      animation: { duration: 500, easing: 'easeInOutQuart' }
    }
  });
}

/**
 * Met à jour le graphique ligne (évolution du solde cumulatif du mois)
 * @param {Array} transactions - Tableau de transactions
 */
function updateLigne(transactions) {
  const canvas = document.getElementById('chart-ligne');
  const themeColors = getThemeColors();
  
  // Obtenir tous les jours du mois courant
  const jours = obtenirJoursDuMois();
  const aujourd = new Date();
  const moisActuel = aujourd.getMonth();
  const anneeActuelle = aujourd.getFullYear();
  
  // Filtrer les transactions du mois courant
  const transactionsMois = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === moisActuel && date.getFullYear() === anneeActuelle;
  });
  
  // Trier par date croissante
  transactionsMois.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculer le solde cumulatif pour chaque jour
  let soldeCumulatif = 0;
  const soldes = [];
  
  jours.forEach(jour => {
    // Ajouter les transactions du jour
    const transactionsJour = transactionsMois.filter(t => {
      const dateT = new Date(t.date);
      return dateT.getDate() === jour.getDate();
    });
    
    transactionsJour.forEach(t => {
      if (t.type === 'revenu') {
        soldeCumulatif += t.montant;
      } else if (t.type === 'depense') {
        soldeCumulatif -= t.montant;
      }
    });
    
    soldes.push(soldeCumulatif);
  });
  
  // Déterminer la couleur en fonction du solde final
  const soldeFinal = soldes[soldes.length - 1] || 0;
  const couleurLigne = soldeFinal >= 0 ? '#1DB954' : '#E74C3C';
  
  // Créer le gradient
  const ctx = canvas.getContext('2d');
  const gradient = creerGradient(ctx, canvas.height, couleurLigne);
  
  // Labels des jours
  const labels = jours.map(jour => formatJour(jour));
  
  // Détruire l'ancienne instance
  instanceLigne = detruireInstance(instanceLigne);
  
  // Créer la nouvelle instance
  instanceLigne = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Solde cumulé',
        data: soldes,
        borderColor: couleurLigne,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: couleurLigne,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const formate = formatMontant(ctx.raw);
              return ctx.raw >= 0 ? ` Solde : +${formate}` : ` Solde : ${formate}`;
            },
            title: (ctx) => `📅 ${ctx[0].label}`
          },
          backgroundColor: themeColors.card,
          titleColor: themeColors.text,
          bodyColor: couleurLigne,
          borderColor: themeColors.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: themeColors.textSecondary,
            maxTicksLimit: 10
          }
        },
        y: {
          grid: { color: themeColors.border, drawBorder: false },
          ticks: {
            color: themeColors.textSecondary,
            callback: (val) => formatMontantCompact(val)
          }
        }
      },
      animation: { duration: 700, easing: 'easeInOutQuart' }
    }
  });
}

// ═══════════════════════════════════════════
// FONCTIONS PUBLIQUES EXPORTÉES
// ═══════════════════════════════════════════

/**
 * Initialise les graphiques et attache les listeners
 * @exports
 */
export function initCharts() {
  // Récupérer les canvas
  const canvasCamembert = document.getElementById('chart-camembert');
  const canvasBarres = document.getElementById('chart-barres');
  const canvasLigne = document.getElementById('chart-ligne');
  
  // Vérifier que les canvas existent
  if (!canvasCamembert || !canvasBarres || !canvasLigne) {
    console.error('Canvas non trouvés. Vérifiez les IDs.');
    return;
  }
  
  // Attacher les listeners sur les boutons d'onglets
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchOnglet(e.target.dataset.chart);
    });
  });
}

/**
 * Met à jour tous les graphiques avec les nouvelles données
 * Utilise un debounce pour éviter les recalculs trop fréquents
 * @param {Array} transactions - Tableau de transactions
 * @exports
 */
export function updateAllCharts(transactions) {
  // Stocker les données actuelles
  donneesActuelles = transactions;
  
  // Debounce : éviter les recalculs trop fréquents
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Mettre à jour le graphique de l'onglet actif en priorité
    if (ongletActif === 'camembert') {
      updateCamembert(transactions);
    } else if (ongletActif === 'barres') {
      updateBarres(transactions);
    } else if (ongletActif === 'ligne') {
      updateLigne(transactions);
    }
    
    // Invalider les instances des graphiques non actifs
    // Ils seront re-rendus à la demande quand l'utilisateur cliquera sur leur onglet
    if (ongletActif !== 'camembert') instanceCamembert = detruireInstance(instanceCamembert);
    if (ongletActif !== 'barres') instanceBarres = detruireInstance(instanceBarres);
    if (ongletActif !== 'ligne') instanceLigne = detruireInstance(instanceLigne);
  }, 150);
}

/**
 * Change l'onglet actif et affiche le graphique correspondant
 * @param {string} nomOnglet - Nom de l'onglet ('camembert', 'barres', 'ligne')
 * @exports
 */
export function switchOnglet(nomOnglet) {
  // Mettre à jour l'onglet actif
  ongletActif = nomOnglet;
  
  // Retirer la classe 'active' de tous les boutons
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  // Ajouter 'active' au bouton correspondant
  const btnActif = document.querySelector(`[data-chart="${nomOnglet}"]`);
  if (btnActif) {
    btnActif.classList.add('active');
  }
  
  // Masquer tous les canvas
  const canvasCamembert = document.getElementById('chart-camembert');
  const canvasBarres = document.getElementById('chart-barres');
  const canvasLigne = document.getElementById('chart-ligne');
  const emptyMsg = document.getElementById('chart-empty-message');
  
  canvasCamembert.hidden = true;
  canvasBarres.hidden = true;
  canvasLigne.hidden = true;
  emptyMsg.hidden = true;
  
  // Afficher le canvas correspondant
  if (nomOnglet === 'camembert') {
    canvasCamembert.hidden = false;
    if (!instanceCamembert && donneesActuelles.length > 0) {
      updateCamembert(donneesActuelles);
    }
  } else if (nomOnglet === 'barres') {
    canvasBarres.hidden = false;
    if (!instanceBarres && donneesActuelles.length > 0) {
      updateBarres(donneesActuelles);
    }
  } else if (nomOnglet === 'ligne') {
    canvasLigne.hidden = false;
    if (!instanceLigne && donneesActuelles.length > 0) {
      updateLigne(donneesActuelles);
    }
  }
}

/**
 * Change la devise actuelle et re-rend tous les graphiques
 * @param {string} devise - Devise à utiliser ('EUR', 'USD', 'FCFA')
 * @exports
 */
export function setDevise(devise) {
  if (!TAUX_CONVERSION[devise]) {
    console.error(`Devise inconnue: ${devise}`);
    return;
  }
  
  deviseActuelle = devise;
  
  // Détruire toutes les instances
  instanceCamembert = detruireInstance(instanceCamembert);
  instanceBarres = detruireInstance(instanceBarres);
  instanceLigne = detruireInstance(instanceLigne);
  
  // Re-rendre tous les graphiques
  if (donneesActuelles.length > 0) {
    updateAllCharts(donneesActuelles);
  }
}

/**
 * Exporte le graphique actif en image PNG
 * @exports
 */
export function exporterGraphique() {
  let canvas = null;
  
  if (ongletActif === 'camembert') {
    canvas = document.getElementById('chart-camembert');
  } else if (ongletActif === 'barres') {
    canvas = document.getElementById('chart-barres');
  } else if (ongletActif === 'ligne') {
    canvas = document.getElementById('chart-ligne');
  }
  
  if (!canvas || canvas.hidden) {
    console.error('Aucun graphique à exporter');
    return;
  }
  
  // Convertir le canvas en image
  const dataUrl = canvas.toDataURL('image/png');
  
  // Créer un lien de téléchargement
  const lien = document.createElement('a');
  lien.href = dataUrl;
  lien.download = `wallettrack-graphique-${ongletActif}.png`;
  
  // Déclencher le téléchargement
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  
  // Afficher une notification
  console.log('✅ Graphique exporté avec succès');
}

// ═══════════════════════════════════════════
// DÉTECTION AUTOMATIQUE DU CHANGEMENT DE THÈME
// ═══════════════════════════════════════════

/**
 * Observer pour détecter les changements de thème
 * Re-rend les graphiques quand le thème change
 */
const themeObserver = new MutationObserver(() => {
  if (donneesActuelles.length > 0) {
    // Détruire les instances pour les re-créer avec les nouvelles couleurs
    instanceCamembert = detruireInstance(instanceCamembert);
    instanceBarres = detruireInstance(instanceBarres);
    instanceLigne = detruireInstance(instanceLigne);
    
    // Re-rendre le graphique actif
    if (ongletActif === 'camembert') {
      updateCamembert(donneesActuelles);
    } else if (ongletActif === 'barres') {
      updateBarres(donneesActuelles);
    } else if (ongletActif === 'ligne') {
      updateLigne(donneesActuelles);
    }
  }
});

// Écouter les changements d'attribut data-theme
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});
git