/* ==========================================================================
   INSTANT COLLECTÉ — comportement, v3 multi-pages
   ========================================================================== */

/* --------------------------------------------------------------------------
   1) POINT DE CONTACT DES COMMANDES — une seule ligne à changer
   -------------------------------------------------------------------------- */
const ORDER_LINK = "https://www.instagram.com/instant_collecte/";

/* --------------------------------------------------------------------------
   1bis) FORMULAIRE DE COMMANDE (Tally) — dépôt photos + infos client
   Un formulaire Tally PAR FORMAT (livret / poster) : le format et la
   quantité sont désormais choisis UNIQUEMENT sur le site (paliers de prix
   sur les fiches produit), jamais redemandés dans Tally. Chaque formulaire
   ne sert plus qu'à collecter les chapitres et les photos. Comme le client
   n'atterrit que sur le formulaire correspondant à son choix, il ne peut
   structurellement plus se tromper de formule en cours de route.
   -------------------------------------------------------------------------- */
const TALLY_FORM_URLS = {
  livret: "https://tally.so/r/D4yOX5",
  poster: "https://tally.so/r/RGgEb9",
};

// URL d'embed dérivée + options d'intégration : hideTitle (le hero de la page
// affiche déjà le titre), transparentBackground (l'écrin kraft du site se voit
// à travers), dynamicHeight (l'iframe suit la hauteur réelle du formulaire,
// nécessite le script tally.so/widgets/embed.js chargé dans index.html).
// Tant que TALLY_FORM_URLS.poster est vide, on retombe sur le formulaire
// livret pour ne jamais laisser un client sans formulaire — à retirer dès
// que le formulaire poster existe.
function getTallyFormUrl(format){
  return TALLY_FORM_URLS[format] || TALLY_FORM_URLS.livret;
}
function getTallyEmbedBase(format){
  return getTallyFormUrl(format).replace("/r/", "/embed/")
    + "?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
}

// Correspondance route du site → libellé exact de l'option "Quelle édition ?"
// dans Tally (si cette question existe encore côté Tally — sinon utile pour
// rien, aucune conséquence). ATTENTION : la valeur doit correspondre AU
// CARACTÈRE PRÈS au texte de l'option choisie dans Tally (Pre-populate
// fields), sinon le champ ne se pré-coche pas (le formulaire reste
// fonctionnel, juste pas pré-rempli).
const EDITION_PREFILL = {
  "pour-toute-la-famille": "Pour toute la Famille !",
  "histoire-d-amour": "Histoire d'Amour",
  "souvenir-ete":   "Souvenir d'été",
};


/* --------------------------------------------------------------------------
   1ter) LIENS DE PAIEMENT — étape affichée juste après l'envoi du formulaire
   Tally (voir listener "Tally.FormSubmitted" plus bas).
   Un jeu de liens par édition + format ("livret" ou "poster"), avec UN LIEN
   STRIPE PAR PALIER DE QUANTITÉ (les paliers de prix affichés sur la fiche
   produit ont chacun leur propre Payment Link Stripe, avec sa propre
   quantité ajustable et son propre seuil de livraison offerte).
   Clé de premier niveau = "<clé-édition>-<format>", ex. "souvenir-ete-poster".
   Chaque entrée est un tableau de paliers { qty, link }, trié du plus petit
   seuil au plus grand — qty doit correspondre EXACTEMENT aux valeurs
   data-qty utilisées dans .pdp-tiers-grid côté HTML pour que le bon palier
   soit toujours sélectionné.

   ⚠️ CONDITION INDISPENSABLE côté Tally pour que ce système reste fiable :
   les champs "édition", "format" et "quantité" doivent être des HIDDEN
   FIELDS Tally (pré-remplis automatiquement depuis l'URL, invisibles et NON
   modifiables par le client) — PAS des questions visibles du formulaire.
   Le site a déjà déterminé édition/format/quantité/prix AVANT que Tally ne
   s'ouvre (clic sur un palier de prix puis "Je commande") ; si Tally repose
   la question de façon modifiable, le client peut changer d'avis dans le
   formulaire sans que le site ne le sache jamais (Tally ne renvoie pas les
   réponses via son événement de soumission, seulement des métadonnées) —
   c'est exactement ce qui a causé le bug "3 posters facturés au prix
   livret". Convertir ces champs en Hidden Fields dans l'éditeur Tally
   (Content → ce champ → Hidden Field) supprime le problème à la racine :
   le client ne les voit plus, ne peut plus les changer, et la valeur
   affichée ici reste donc garantie exacte.
   -------------------------------------------------------------------------- */
const PAYMENT_LINKS = {
  "souvenir-ete-poster": [
    { qty: 1,  link: "https://buy.stripe.com/bJe8wR50z5t6fx54vRaAw05" },
    { qty: 4,  link: "https://buy.stripe.com/dRm8wR64D08M84D4vRaAw02" },
    { qty: 7,  link: "https://buy.stripe.com/7sY7sNdx5g7K1Gf3rNaAw03" },
    { qty: 10, link: "https://buy.stripe.com/fZu4gB78H8FibgPgezaAw04" },
  ],
  "souvenir-ete-livret": [
    { qty: 1, link: "https://buy.stripe.com/6oU28tct14p20Cb8M7aAw0c" },
    { qty: 3, link: "https://buy.stripe.com/aFa00l1Onf3GbgPaUfaAw0d" },
    { qty: 5, link: "https://buy.stripe.com/9B6dRb8cLaNqet13rNaAw0f" },
    { qty: 7, link: "https://buy.stripe.com/5kQ7sN0Kj4p2ckT1jFaAw0e" },
  ],
  "pour-toute-la-famille-poster": [
    { qty: 1,  link: "https://buy.stripe.com/5kQ8wR2Srg7KacLd2naAw06" },
    { qty: 4,  link: "https://buy.stripe.com/bJefZjgJhaNqacLfavaAw07" },
    { qty: 7,  link: "https://buy.stripe.com/28E9AV64Df3G84D7I3aAw08" },
    { qty: 10, link: "https://buy.stripe.com/28E7sN0KjcVygB90fBaAw09" },
  ],
  "pour-toute-la-famille-livret": [
    { qty: 1, link: "https://buy.stripe.com/28E5kFakTcVybgP2nJaAw0g" },
    { qty: 3, link: "https://buy.stripe.com/fZu8wRgJhaNq98H4vRaAw0h" },
    { qty: 5, link: "https://buy.stripe.com/28E7sNeB9aNq2KjfavaAw0j" },
    { qty: 7, link: "https://buy.stripe.com/9B67sN78HdZC84DgezaAw0i" },
  ],
  "histoire-d-amour-livret": [
    { qty: 1, link: "https://buy.stripe.com/28EeVf64Df3GgB99QbaAw0n" },
    { qty: 2, link: "https://buy.stripe.com/4gMeVf78H6xa2Kj3rNaAw0m" },
  ],
  "histoire-d-amour-poster": [
    { qty: 1, link: "https://buy.stripe.com/14AdRbct1f3G70z9QbaAw0k" },
    { qty: 2, link: "https://buy.stripe.com/3cIeVf50zcVy4SrfavaAw0l" },
  ],
};
// Utilisé tant qu'aucun palier n'est renseigné ci-dessus pour la
// combinaison édition+format+quantité en cours. Remplace/complète
// PAYMENT_LINKS dès que de nouveaux Payment Links existent (en attendant,
// pointe vers l'Instagram — mieux qu'un bouton mort).
const PAYMENT_LINK_FALLBACK = ORDER_LINK;

// Résout le Payment Link applicable pour une édition+format+quantité :
// prend, parmi les paliers déclarés, le plus grand dont le seuil (qty) est
// atteint par la quantité commandée — même logique que tierForQty() côté
// affichage des paliers sur la fiche produit (voir plus bas dans ce fichier),
// pour garantir que le palier facturé sur Stripe correspond toujours au
// palier affiché au client.
function resolvePaymentLink(linkKey, qty){
  const tiers = PAYMENT_LINKS[linkKey];
  if (!tiers || !tiers.length) return "";
  let applicable = tiers[0];
  tiers.forEach((tier) => {
    if (qty >= tier.qty) applicable = tier;
  });
  return applicable.link || "";
}

// Renseigné à chaque entrée dans #commande à partir des paramètres d'URL
// (edition_cle, format, quantite, prix_unitaire) — relu par showPaymentStep()
// une fois le formulaire Tally soumis. Fiable à condition que les champs
// correspondants soient bien des Hidden Fields côté Tally (voir avertissement
// ci-dessus).
let currentCommandeParams = {};

function parseCommandeParams(rawHash){
  const queryIndex = (rawHash || "").indexOf("?");
  if (queryIndex === -1) return {};
  const out = {};
  new URLSearchParams(rawHash.slice(queryIndex + 1)).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

// Affiche l'étape paiement à la place du formulaire une fois que Tally
// confirme l'envoi (voir listener "message" plus bas). Résout le lien de
// paiement à partir de l'édition + du format + de la quantité mémorisés à
// l'entrée dans le tunnel (le palier Stripe applicable est déterminé par
// resolvePaymentLink), avec repli sur PAYMENT_LINK_FALLBACK si rien n'est
// configuré pour ce palier.
function showPaymentStep(){
  const formWrap = document.getElementById("commandeFormWrap");
  const paymentStep = document.getElementById("commandePaymentStep");
  const paymentBtn = document.getElementById("commandePaymentBtn");
  const recapEl = document.getElementById("commandePaymentRecap");
  if (!paymentStep || !paymentBtn) return;

  const { edition_cle, format, quantite, prix_unitaire } = currentCommandeParams;
  const linkKey = edition_cle && format ? (edition_cle + "-" + format) : "";
  const qty = parseInt(quantite, 10) || 1;
  const link = (linkKey && resolvePaymentLink(linkKey, qty)) || PAYMENT_LINK_FALLBACK;

  if (recapEl) {
    const unit = parseFloat(prix_unitaire);
    if (!isNaN(unit)) {
      const total = (unit * qty).toFixed(2).replace(".", ",");
      recapEl.textContent = "Total à régler : " + total + "€ (" + qty + " exemplaire" + (qty > 1 ? "s" : "") + ")";
    } else {
      recapEl.textContent = "";
    }
  }

  if (link) {
    paymentBtn.href = link;
    paymentBtn.classList.remove("is-disabled");
  } else {
    paymentBtn.removeAttribute("href");
    paymentBtn.classList.add("is-disabled");
  }

  if (formWrap) formWrap.hidden = true;
  paymentStep.hidden = false;
  paymentStep.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

// Tally envoie un postMessage à la soumission du formulaire. Selon les
// versions du widget, event.data est soit déjà un objet, soit une chaîne
// JSON à parser — on gère les deux cas.
window.addEventListener("message", (event) => {
  let payload = event.data;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (e) { return; }
  }
  if (payload && payload.event === "Tally.FormSubmitted") {
    showPaymentStep();
  }
});

// État du tunnel de commande : sert à forcer un formulaire Tally VIERGE à
// chaque nouvelle entrée dans le tunnel (clic sur "Je commande", retour sur
// la page après une commande envoyée, etc.). Sans ça, l'iframe reste figée
// sur l'écran "merci" de Tally et un client ne peut plus repasser commande.
let forceTallyReload = false;
let previousRoute = null;

/* --------------------------------------------------------------------------
   2) IMAGES — colle ici les URLs de tes images (Assets CodePen, postimages, etc.)
      Laisse "" pour afficher un cadre "image à venir" stylisé à la place.
      La clé correspond à l'attribut data-img="..." dans le HTML.

      Exemple : editionMeresHero: "https://i.postimg.cc/xxxx/pour-toute-la-famille.png",

      boosterPackArt / boosterCard1-3 : visuel du pack fermé et des 3 photos
      révélées à l'ouverture (booster mystère, page d'accueil). Embarquées en
      base64 ci-dessous pour fonctionner directement sur CodePen sans
      hébergement externe — tu peux remplacer par une URL https://... à tout
      moment, le fonctionnement ne change pas.
   -------------------------------------------------------------------------- */
const IMAGES = {
  // Logo hero accueil
  heroLogo: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%201%20modif.png",

  // Accueil — titre "Comment ça fonctionne ?" flanqué des 3 mini boosters
  titleBoostersArt: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/icones/3%20mini%20booster.jpeg",

  // Accueil — icônes des 4 mini-étapes
  stepIconCamera:    "https://frozenfuzer.github.io/Instant-Collect-V2/assets/icones/Vignette%201%20appareil%20photo.jpeg",
  stepIconVignettes: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/icones/Vignette%202%20carte%20en%20d%C3%A9sordre.jpeg",
  stepIconBoosters:  "https://frozenfuzer.github.io/Instant-Collect-V2/assets/icones/Vignette%203%203%20mini%20booster.jpeg",
  stepIconLivre:     "https://frozenfuzer.github.io/Instant-Collect-V2/assets/icones/Vignette%204%20livret.jpeg",

  // Accueil — booster mystère interactif
  boosterPackArt: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Booster%20Ete%202026%20sans%20Fond.png",
  boosterCard1:   "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Mini%20image%20booster%20mystere%20Famille.jpeg",
  boosterCard2:   "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Mini%20image%20booster%20mystere%20Julian%20et%20mami.jpeg",
  boosterCard3:   "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Mini%20image%20booster%20mystere%20mariage.jpeg",

  // Vitrine "une collection à découvrir" (accueil, sous le booster interactif)
  boosterCollEte:    "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Booster%20Ete%202026%20sans%20Fond.png",
  boosterCollNormal: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/booster%20normal.png",
  boosterCollFete:   "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Booster%20fete.png",

  // Accueil — cartes valeurs (photos)
  valuePhoto1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%202.png",
  valuePhoto2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%203%20.png",
  valuePhoto3: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%204.jpg",

  // Accueil — grille éditions (à compléter)
  editionHistoireAmour: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%204.jpg",
  editionSouvenirs:     "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%205.png",
  editionEte:           "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9725.jpg",
  editionKing:          "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%208.png",
  editionMariage:       "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%207.png",
  editionPeres:         "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%209.png",

  // Accueil — ambiance (polaroids)
  ambiance1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%202.png",
  ambiance2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%2010.jpg",
  ambiance3: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%209.png",
  ambiance4: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%205.png",

  // Accueil — preuve sociale (screenshots)
  screenshot1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/PHOTO%2011.PNG",
  screenshot2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/PHOTO%2012.PNG",
  screenshot3: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/PHOTO%2013.PNG",
  screenshot4: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/PHOTO%2014.PNG",
  screenshot5: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/PHOTO%2015.jpg",

  // Concept — intro nostalgie (collage photos, à remplir dès que les images sont dans assets/concept/)
  conceptPhoto1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/Photo%201%20carte%20concept.PNG",
  conceptPhoto2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/Photo%202%20carte%20concept.PNG",
  conceptPhoto3: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/Photo%203%20carte%20concept.PNG",

  // Concept — 4 étapes
  step1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/Groupement%20de%20photo%20sur%20table.JPG",
  step2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/Photo%20concept%202.jpg",
  step3: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/IMG_9295.PNG",
  step4: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/concept/IMG_9294.jpg",

  // King Jouet
  kingBooster: "", kingShop: "",

  // Réalisations sur-mesure
  realisationJoinzy: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%201%20Joinzy%20(1)%20(1).jpg", realisationEvg: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_8874.jpg", realisationEntreprise: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Marina.png", realisationMariage: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/accueil/Photo%207.png",

  // Pour toute la Famille
  meresHero: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/livret%20maelle.JPG",
  meresPoster: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%201%20Poster%20Famille.jpg",
  meresPosterHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%202%20Poster%20Famille.jpg",
  meresPosterExtra1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%203%20Poster%20Famille.jpg",
  meresLivret: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%201%20album%20Famille.JPG",
  meresLivretHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/PHOTO%202%20album%20Famille.JPG",

  // Histoire d'Amour
  valentinHero: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Photo%20HA%201%20(1).JPG", valentinLivret: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9846.JPG",
  valentinLivretHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Photo%20HA%202.JPG",
  valentinLivretExtra1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9850%20(1).JPG",
  valentinLivretExtra2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9852.JPG",
  valentinPoster: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9859.JPG",
  valentinPosterHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9860.JPG",

  // Souvenir d'été
  etePoster: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Photo%20poster%20%C3%A9dition%20%C3%A9t%C3%A9%201.JPG",
  etePosterHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Photo%20poster%20%C3%A9dition%20%C3%A9t%C3%A9%202.jpeg",
  etePosterExtra1: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/Photo%20poster%20%C3%A9dition%20%C3%89t%C3%A9%203.JPG",
  eteLivret: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9853.JPG",
  eteLivretHover: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9854.JPG",
  eteLivretExtra: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9743.jpg",
  eteLivretExtra2: "https://frozenfuzer.github.io/Instant-Collect-V2/assets/edition/IMG_9625.jpg",
};

// Clés à charger immédiatement (au-dessus de la ligne de flottaison)
const EAGER_KEYS = new Set([
  'heroLogo','boosterPackArt','boosterCard1','boosterCard2','boosterCard3',
  'titleBoostersArt','stepIconCamera','stepIconVignettes','stepIconBoosters','stepIconLivre',
  'screenshot1','screenshot2','screenshot3','screenshot4','screenshot5'
]);

function setImage(el){
  const key = el.dataset.img;
  const url = IMAGES[key];
  if (!url || url.trim() === "") return;
  if (el.tagName === 'IMG'){
    el.src = url;
  } else {
    el.style.backgroundImage = `url("${url}")`;
  }
  el.classList.add("has-image");

  // Survol : si l'élément porte data-img-hover, on crée un vrai calque enfant
  // (pas un ::after — déjà utilisé par le système de placeholder "image à
  // venir" ci-dessus, un élément ne peut en avoir qu'un seul) avec la 2e
  // image, affiché en fondu au survol via .hover-overlay (voir style.css).
  const hoverKey = el.dataset.imgHover;
  if (hoverKey){
    const hoverUrl = IMAGES[hoverKey];
    if (hoverUrl && hoverUrl.trim() !== ""){
      let overlay = el.querySelector(":scope > .hover-overlay");
      if (!overlay){
        overlay = document.createElement("span");
        overlay.className = "hover-overlay";
        overlay.setAttribute("aria-hidden", "true");
        el.appendChild(overlay);
      }
      overlay.style.backgroundImage = `url("${hoverUrl}")`;
    }
  }
}

function applyImages(){
  const lazyEls = [];

  document.querySelectorAll("[data-img]").forEach((el) => {
    const key = el.dataset.img;
    if (!key) return;
    if (EAGER_KEYS.has(key)){
      setImage(el); // chargement immédiat
    } else {
      lazyEls.push(el); // lazy
    }
  });

  // Lazy loading via IntersectionObserver
  if ('IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          setImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px 0px' }); // commence à charger 400px avant d'être visible
    lazyEls.forEach(el => observer.observe(el));
  } else {
    // Fallback navigateurs anciens
    lazyEls.forEach(el => setImage(el));
  }
}

/* --------------------------------------------------------------------------
   3) CTA commande
   -------------------------------------------------------------------------- */
document.querySelectorAll("[data-order-link]").forEach((el) => {
  el.addEventListener("click", () => window.open(ORDER_LINK, "_blank", "noopener"));
});

// Boutons "Je commande" — redirigent vers le tunnel de commande #commande,
// avec l'édition pré-remplie. "data-edition" porte la CLÉ de route (ex.
// "histoire-d-amour"), jamais le nom affiché : on la résout donc TOUJOURS via
// EDITION_PREFILL pour obtenir le vrai nom envoyé à Tally (ex. "Histoire
// d'Amour"). Sans data-edition explicite, on déduit la clé depuis la page
// actuellement affichée.
// Sur les fiches produit (PDP) à paliers de prix, le bouton porte aussi
// data-qty / data-unit-price (mis à jour par initPdpTiers au clic sur un
// palier) : on les transmet en paramètres d'URL (&quantite=, &prix_unitaire=)
// — ENCORE FAUT-IL que Tally ait des champs configurés pour les recevoir,
// exactement comme pour "edition" (voir avertissement déjà donné à ce sujet).
// Chaque clic force un formulaire Tally VIERGE (voir forceTallyReload et
// renderRoute) : sans ça, un client qui a déjà validé une commande retombe
// sur l'écran "merci" de Tally et ne peut plus en repasser une seconde,
// que ce soit pour la même édition ou une autre.
document.querySelectorAll("[data-order-cta]").forEach((el) => {
  el.addEventListener("click", () => {
    const currentRoute = document.body.getAttribute("data-page") || "";
    const editionKey = el.dataset.edition || currentRoute;
    const edition = EDITION_PREFILL[editionKey] || "";
    // Le format se déduit du suffixe de la route PDP (ex.
    // "produit-histoire-d-amour-livret" → "livret") : c'est ce qui permet à
    // showPaymentStep() de retrouver le bon lien de paiement dans
    // PAYMENT_LINKS une fois le formulaire Tally soumis.
    const format = currentRoute.endsWith("-livret") ? "livret"
      : currentRoute.endsWith("-poster") ? "poster"
      : "";

    const params = [];
    if (edition) params.push("edition=" + encodeURIComponent(edition));
    if (el.dataset.qty) params.push("quantite=" + encodeURIComponent(el.dataset.qty));
    if (el.dataset.unitPrice) params.push("prix_unitaire=" + encodeURIComponent(el.dataset.unitPrice));
    if (editionKey) params.push("edition_cle=" + encodeURIComponent(editionKey));
    if (format) params.push("format=" + encodeURIComponent(format));

    const query = params.length ? ("?" + params.join("&")) : "";
    const targetHash = "commande" + query;

    forceTallyReload = true;

    if (window.location.hash.replace("#", "") === targetHash) {
      // Le hash cible est identique au hash actuel : "hashchange" ne se
      // déclenche pas tout seul dans ce cas, on relance donc le rendu de
      // la route manuellement pour appliquer le rechargement forcé.
      renderRoute();
    } else {
      window.location.hash = targetHash;
    }
  });
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
   4) ROUTEUR par hash — 7 "pages" dans un seul fichier
   -------------------------------------------------------------------------- */
const ROUTES = {
  "accueil":        { title: "Instant Collecté — Le souvenir qu'on déballe, qu'on offre", header: "full" },
  "concept":        { title: "Comment ça marche — Instant Collecté", header: "full" },
  "king-jouet":     { title: "Partenariat King Jouet — Instant Collecté", header: "minimal" },
  "pour-toute-la-famille": { title: "Édition Pour toute la Famille ! — Instant Collecté", header: "full" },
  "histoire-d-amour": { title: "Édition Histoire d'Amour — Instant Collecté", header: "full" },
  "contact":        { title: "Nous contacter — Instant Collecté",                     header: "full" },
  "souvenir-ete":   { title: "Édition Souvenir d'été — Instant Collecté",            header: "full" },
  "partenaires":    { title: "Nos Partenaires — Instant Collecté",                     header: "full" },
  "realisations":   { title: "Un autre projet ? — Réalisations sur-mesure — Instant Collecté", header: "full" },
  "mentions-legales": { title: "Mentions légales — Instant Collecté",                   header: "full" },
  "cgv":              { title: "Conditions Générales de Vente — Instant Collecté",       header: "full" },
  "commande":         { title: "Votre commande — Instant Collecté",                      header: "full" },
  "produit-histoire-d-amour-livret": { title: "Le livret — Édition Histoire d'Amour — Instant Collecté", header: "full" },
  "produit-pour-toute-la-famille-poster": { title: "Le Poster — Édition Pour toute la Famille ! — Instant Collecté", header: "full" },
  "produit-pour-toute-la-famille-livret": { title: "Le Livret — Édition Pour toute la Famille ! — Instant Collecté", header: "full" },
  "produit-histoire-d-amour-poster": { title: "Le Poster — Édition Histoire d'Amour — Instant Collecté", header: "full" },
  "produit-souvenir-ete-poster": { title: "Le Poster — Édition Souvenir d'été — Instant Collecté", header: "full" },
  "produit-souvenir-ete-livret": { title: "Le Livret — Édition Souvenir d'été — Instant Collecté", header: "full" },
};
const DEFAULT_ROUTE = "accueil";

const siteHeader     = document.getElementById("siteHeader");
  const siteFooter     = document.getElementById("siteFooter") || document.querySelector(".footer");
const navLinksPanel  = document.getElementById("navLinks");
const navBurger      = document.getElementById("navBurger");
const navEditions    = document.getElementById("navEditions");
const navEditionsTrig = document.getElementById("navEditionsTrigger");
const pages          = document.querySelectorAll(".page");

function resolveRoute(rawHash){
  // On ignore tout ce qui suit un "?" (ex. #commande?edition=Notre+Mariage)
  // pour que la route reste bien "commande" et ne tombe pas sur DEFAULT_ROUTE.
  const clean = (rawHash || "").replace("#", "").split("?")[0].trim();
  return ROUTES[clean] ? clean : DEFAULT_ROUTE;
}

function renderRoute(){
  const rawHash = window.location.hash;
  const route = resolveRoute(rawHash);
  const config = ROUTES[route];

  // On entre fraîchement dans le tunnel de commande depuis une autre page
  // (navigation directe, retour arrière du navigateur, etc.) : on force un
  // formulaire vierge, même si l'édition demandée est identique à la
  // dernière fois.
  if (route === "commande" && previousRoute !== "commande") {
    forceTallyReload = true;
  }
  previousRoute = route;

  pages.forEach((page) => page.classList.toggle("is-active", page.dataset.pageSection === route));

  document.body.setAttribute("data-page", route);
  document.title = config.title;

  siteHeader.classList.toggle("header-minimal", config.header === "minimal");
  if (siteFooter) siteFooter.classList.toggle("footer-minimal", route === "king-jouet");

  document.querySelectorAll("[data-route-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.routeLink === route);
  });

  closeEditions();
  navLinksPanel.classList.remove("is-open");
  navBurger.setAttribute("aria-expanded", "false");

  // Scroll immédiat — triple méthode pour compatibilité navigateurs
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);

  // ré-arme les apparitions au scroll sur le contenu désormais visible
  setupReveal();

  // Repositionne la flèche concept exactement 10px sous le texte
  if (route === "concept") positionConceptArrow();

  // Charge le formulaire Tally avec l'édition pré-remplie (si présente dans le
  // hash, ex. #commande?edition=Notre+Mariage). On ne recharge que lorsque
  // forceTallyReload l'exige (nouveau clic "Je commande" ou entrée fraîche
  // dans le tunnel, voir plus haut) — le paramètre anti-cache "_r" garantit
  // que le rechargement est réel même si l'édition demandée est identique à
  // la précédente, pour ne jamais rester bloqué sur l'écran "merci" de Tally.
  if (route === "commande") {
    const queryIndex = rawHash.indexOf("?");
    const query = queryIndex !== -1 ? "&" + rawHash.slice(queryIndex + 1) : "";
    currentCommandeParams = parseCommandeParams(rawHash);
    const frame = document.getElementById("tallyFrame");
    if (frame && (forceTallyReload || !frame.dataset.tallySrc)) {
      const embedBase = getTallyEmbedBase(currentCommandeParams.format);
      const url = embedBase + query + "&_r=" + Date.now();
      frame.dataset.tallySrc = url;
      // frame.src EST le rechargement réel de l'iframe : c'est lui qui
      // garantit qu'un changement de format (poster ↔ livret) ou d'édition
      // remplace bien le formulaire affiché. Tally.loadEmbeds() ne fait que
      // RÉ-INITIALISER le comportement de l'embed (dynamicHeight, resize) une
      // fois l'iframe déjà présente dans le DOM avec le bon data-tally-src —
      // il n'a jamais force un rechargement d'une iframe déjà initialisée par
      // un premier passage. Compter uniquement sur loadEmbeds() ici reproduit
      // le bug où un second clic "Je commande" (ex. poster après un premier
      // clic livret) laissait affiché l'ancien formulaire.
      frame.src = url;
      if (window.Tally && typeof window.Tally.loadEmbeds === "function") {
        window.Tally.loadEmbeds();          // active dynamicHeight & co
      }
      forceTallyReload = false;

      // Lien de secours ("le formulaire ne s'affiche pas ?") : doit pointer
      // vers le MÊME formulaire que celui chargé dans l'iframe.
      const fallbackLink = document.getElementById("tallyFallbackLink");
      if (fallbackLink) fallbackLink.href = getTallyFormUrl(currentCommandeParams.format);

      // Nouveau passage dans le tunnel : on réaffiche le formulaire et on
      // masque l'étape paiement d'une éventuelle commande précédente.
      const formWrap = document.getElementById("commandeFormWrap");
      const paymentStep = document.getElementById("commandePaymentStep");
      if (formWrap) formWrap.hidden = false;
      if (paymentStep) paymentStep.hidden = true;
    }
  }
}

window.addEventListener("hashchange", renderRoute);

/* --------------------------------------------------------------------------
   Flèche concept — positionnement dynamique (indépendant des fonts)
   -------------------------------------------------------------------------- */
function positionConceptArrow() {
  const lastP  = document.querySelector("#page-concept .concept-nostalgie-text p:last-of-type");
  const arrow  = document.querySelector("#page-concept .concept-nostalgie-arrow");
  const section = document.querySelector("#page-concept .concept-nostalgie");
  if (!lastP || !arrow || !section) return;

  const pRect = lastP.getBoundingClientRect();
  const sRect = section.getBoundingClientRect();

  // 10px sous le dernier paragraphe, exprimé en top relatif à la section
  arrow.style.top    = (pRect.bottom - sRect.top - 38) + "px";
  arrow.style.bottom = "auto";
}

// Applique aussi quand les fonts Google sont chargées (Work Sans change les mesures)
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (document.querySelector("#page-concept.is-active")) positionConceptArrow();
  });
}
window.addEventListener("resize", () => {
  if (document.querySelector("#page-concept.is-active")) positionConceptArrow();
});

/* --------------------------------------------------------------------------
   4b) Scroll en haut sur TOUT clic de lien hash (nav, footer, cartes…)
       Couvre aussi le cas où le hash ne change pas (même page, relance manuelle)
   -------------------------------------------------------------------------- */
document.addEventListener("click", (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = anchor.getAttribute("href").replace("#", "");
  if (!ROUTES[target]) return; // ignore les ancres non-routées

  // Si le hash est déjà le bon, hashchange ne se déclenche pas → on force manuellement
  if (resolveRoute(window.location.hash) === target) {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  // Dans tous les cas, on sécurise le scroll au prochain tick
  setTimeout(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, 16);
});

/* --------------------------------------------------------------------------
   5) Dropdown "Éditions" — ouverture au clic + survol (desktop), accessible
   -------------------------------------------------------------------------- */
function openEditions(){
  if (!navEditions) return;
  navEditions.classList.add("is-open");
  navEditionsTrig.setAttribute("aria-expanded", "true");
}
function closeEditions(){
  if (!navEditions) return;
  navEditions.classList.remove("is-open");
  navEditionsTrig.setAttribute("aria-expanded", "false");
}
function toggleEditions(){
  if (!navEditions) return;
  navEditions.classList.contains("is-open") ? closeEditions() : openEditions();
}

if (navEditions && navEditionsTrig){
  navEditionsTrig.addEventListener("click", (e) => { e.stopPropagation(); toggleEditions(); });

  // survol sur desktop seulement
  const hoverCapable = window.matchMedia("(hover: hover) and (min-width: 761px)");
  navEditions.addEventListener("mouseenter", () => { if (hoverCapable.matches) openEditions(); });
  navEditions.addEventListener("mouseleave", () => { if (hoverCapable.matches) closeEditions(); });

  // clic en dehors ferme
  document.addEventListener("click", (e) => {
    if (navEditions.classList.contains("is-open") && !navEditions.contains(e.target)) closeEditions();
  });
  // Échap ferme
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEditions(); });
}

/* --------------------------------------------------------------------------
   6) Menu mobile (burger)
   -------------------------------------------------------------------------- */
if (navBurger && navLinksPanel){
  navBurger.addEventListener("click", () => {
    const isOpen = navLinksPanel.classList.toggle("is-open");
    navBurger.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  });
  navLinksPanel.querySelectorAll("a, .nav-cta").forEach((el) => {
    el.addEventListener("click", () => {
      navLinksPanel.classList.remove("is-open");
      navBurger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    });
  });
  const navBackdrop = document.getElementById("navBackdrop");
  if (navBackdrop){
    navBackdrop.addEventListener("click", () => {
      navLinksPanel.classList.remove("is-open");
      navBurger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    });
  }
}

/* --------------------------------------------------------------------------
   7) Booster mystère — ouverture façon "booster TCG", au clic/tap uniquement
      Séquence complète, entièrement automatique une fois déclenchée :
        1. déchirure du pack (scale + fade)
        2. flash lumineux
        3. les 3 cartes s'envolent en éventail avec rebond, puis flottent
        4. freeze de 5 secondes, le temps de regarder les photos
        5. les cartes rentrent dans le pack (animation inverse)
        6. le pack se reforme, retour à l'état initial
      Pas de bouton dédié : on reclique sur le pack pour relancer le cycle.
   -------------------------------------------------------------------------- */
const boosterPack    = document.getElementById("boosterPack");
const boosterFlash   = document.getElementById("boosterFlash");
const boosterReveal  = document.getElementById("boosterReveal");

let boosterIsBusy = false; // verrouille les clics pendant tout le cycle
let boosterAnimTimers = [];

function clearBoosterTimers(){
  boosterAnimTimers.forEach((t) => clearTimeout(t));
  boosterAnimTimers = [];
}

function runBoosterCycle(){
  if (!boosterPack || !boosterReveal || boosterIsBusy) return;
  boosterIsBusy = true;

  boosterPack.setAttribute("aria-expanded", "true");
  boosterPack.setAttribute("aria-label", "Booster ouvert");

  if (prefersReducedMotion){
    // version simplifiée : affichage direct, freeze 5s, puis retour direct
    boosterPack.classList.add("is-open");
    boosterReveal.classList.add("is-visible", "is-settled");
    boosterAnimTimers.push(setTimeout(() => {
      boosterReveal.classList.remove("is-visible", "is-settled");
      boosterPack.classList.remove("is-open");
      boosterPack.setAttribute("aria-expanded", "false");
      boosterPack.setAttribute("aria-label", "Cliquer pour ouvrir le booster mystère");
      boosterIsBusy = false;
    }, 3500));
    return;
  }

  // 1) le pack se déchire
  boosterPack.classList.add("is-opening");

  // 2) flash lumineux, synchronisé avec la fin de la déchirure
  boosterAnimTimers.push(setTimeout(() => {
    boosterPack.classList.remove("is-opening");
    boosterPack.classList.add("is-open");
    if (boosterFlash) boosterFlash.classList.add("is-flashing");
  }, 280));

  // 3) les cartes s'envolent en éventail
  boosterAnimTimers.push(setTimeout(() => {
    boosterReveal.classList.add("is-visible");
  }, 340));

  // 4) une fois posées, petit flottement continu + démarrage du freeze de 5s
  boosterAnimTimers.push(setTimeout(() => {
    boosterReveal.classList.add("is-settled");
    if (boosterFlash) boosterFlash.classList.remove("is-flashing");
  }, 1100));

  // 5) après le freeze, les cartes rentrent dans le pack (animation inverse)
  boosterAnimTimers.push(setTimeout(() => {
    boosterReveal.classList.remove("is-settled");
    boosterReveal.classList.add("is-returning");
  }, 4600));

  // 6) le pack se reforme une fois les cartes rentrées
  boosterAnimTimers.push(setTimeout(() => {
    boosterReveal.classList.remove("is-visible", "is-returning");
    boosterPack.classList.remove("is-open");
    boosterPack.classList.add("is-reforming");
  }, 5060));

  // 7) retour complet à l'état initial, le clic redevient possible
  boosterAnimTimers.push(setTimeout(() => {
    boosterPack.classList.remove("is-reforming");
    boosterPack.setAttribute("aria-expanded", "false");
    boosterPack.setAttribute("aria-label", "Cliquer pour ouvrir le booster mystère");
    boosterIsBusy = false;
  }, 5560));
}

if (boosterPack && boosterReveal){
  boosterPack.addEventListener("click", runBoosterCycle);
}

/* --------------------------------------------------------------------------
   8) Apparitions au scroll (marquées) — ré-armées à chaque changement de page
   -------------------------------------------------------------------------- */
let revealObserver = null;
const REVEAL_SELECTOR = ".page.is-active .values .value, .page.is-active .step-mini, .page.is-active .produit-card, .page.is-active .concept-step-row, .page.is-active .feature-band, .page.is-active .polaroid, .page.is-active .faq-item, .page.is-active .section-header, .page.is-active .partenaire-header, .page.is-active .video-embed-wrap, .page.is-active .contact-card, .page.is-active .contact-form-wrap, .page.is-active .concept-nostalgie-text";

function setupReveal(){
  if (prefersReducedMotion) return;
  if (revealObserver) revealObserver.disconnect();

  const targets = document.querySelectorAll(REVEAL_SELECTOR);
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting){
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  targets.forEach((el, i) => {
    el.classList.add("reveal");
    // petit décalage en cascade dans une même rangée
    const mod = i % 3;
    if (mod === 1) el.classList.add("reveal-delay-1");
    if (mod === 2) el.classList.add("reveal-delay-2");
    revealObserver.observe(el);
  });
}

/* --------------------------------------------------------------------------
   8bis) Fiche produit (PDP) — paliers de prix + galerie de vignettes
   -------------------------------------------------------------------------- */
// Détermine le prix unitaire applicable pour une quantité donnée, à partir
// des mêmes paliers que ceux affichés dans .pdp-tiers-grid (1 / 4 / 7 / 10).
// Le palier applicable est le plus grand dont le seuil (data-qty) est
// atteint par la quantité tapée (ex. 5 exemplaires → palier "à partir de 4").
function tierForQty(tiers, qty){
  let applicable = tiers[0];
  tiers.forEach((tier) => {
    if (qty >= parseInt(tier.dataset.qty, 10)) applicable = tier;
  });
  return applicable;
}

function initPdpTiers(){
  document.querySelectorAll(".pdp-tiers-grid").forEach((grid) => {
    const basePrice = parseFloat(grid.dataset.basePrice);
    const tiers = Array.from(grid.querySelectorAll(".pdp-tier"));
    const pdpSection = grid.closest(".pdp");
    const ctaBtn = pdpSection ? pdpSection.querySelector(".pdp-cta") : null;
    const qtyPicker = pdpSection ? pdpSection.querySelector(".pdp-qty-picker") : null;
    const qtyInput = qtyPicker ? qtyPicker.querySelector(".pdp-qty-input") : null;
    const qtyMinus = qtyPicker ? qtyPicker.querySelector(".pdp-qty-minus") : null;
    const qtyPlus = qtyPicker ? qtyPicker.querySelector(".pdp-qty-plus") : null;
    const qtyTotal = qtyPicker ? qtyPicker.querySelector(".pdp-qty-total") : null;

    // Calcule et affiche le "Économisez X%" à partir des vrais prix, plutôt
    // que d'écrire un pourcentage en dur : garantit que l'affichage reste
    // exact si un prix change un jour.
    tiers.forEach((tier) => {
      const unitPrice = parseFloat(tier.dataset.unitPrice);
      const noteEl = tier.querySelector(".pdp-tier-note");
      if (noteEl && unitPrice < basePrice){
        const pct = Math.round((1 - unitPrice / basePrice) * 100);
        noteEl.textContent = `Économisez ${pct}%`;
      }
    });

    // Met à jour le CTA + le total affiché à partir de la quantité tapée
    // dans le champ : détermine automatiquement le bon palier de prix,
    // synchronise le bouton de palier visuellement actif, et recalcule
    // le total (qty × prix unitaire du palier applicable).
    // Plafond de quantité : lu depuis l'attribut max de l'input (99 par
    // défaut si absent). Certaines éditions (ex. Histoire d'Amour, pensée
    // pour 1 ou 2 exemplaires) fixent max="2" côté HTML : sans ce garde-fou
    // ici, les boutons +/- custom pouvaient dépasser cette limite (l'attribut
    // HTML max ne borne que les flèches natives du navigateur, pas nos
    // propres boutons), et le prix restait alors figé sur le dernier palier
    // existant au lieu de refléter une offre qui n'existe pas.
    const maxQty = qtyInput && qtyInput.max ? parseInt(qtyInput.max, 10) : 99;

    function applyQty(qty){
      qty = Math.min(maxQty, Math.max(1, parseInt(qty, 10) || 1));
      if (qtyInput) qtyInput.value = qty;

      const activeTier = tierForQty(tiers, qty);
      const unitPrice = parseFloat(activeTier.dataset.unitPrice);

      tiers.forEach((tier) => tier.classList.toggle("is-active", tier === activeTier));

      if (ctaBtn){
        ctaBtn.dataset.qty = String(qty);
        ctaBtn.dataset.unitPrice = String(unitPrice);
      }
      if (qtyTotal){
        const total = (unitPrice * qty).toFixed(2).replace(".", ",");
        qtyTotal.textContent = "Total : " + total + "€ (" + qty + " exemplaire" + (qty > 1 ? "s" : "") + ")";
      }
    }

    tiers.forEach((tier) => {
      tier.addEventListener("click", () => {
        applyQty(parseInt(tier.dataset.qty, 10));
      });
    });

    if (qtyInput){
      qtyInput.addEventListener("input", () => applyQty(qtyInput.value));
      qtyInput.addEventListener("change", () => applyQty(qtyInput.value));
    }
    if (qtyMinus){
      qtyMinus.addEventListener("click", () => applyQty((parseInt(qtyInput.value, 10) || 1) - 1));
    }
    if (qtyPlus){
      qtyPlus.addEventListener("click", () => applyQty((parseInt(qtyInput.value, 10) || 1) + 1));
    }

    // État initial (quantité 1, palier "À l'unité") sans attendre d'action.
    applyQty(1);
  });
}

function initPdpGallery(){
  document.querySelectorAll(".pdp-gallery").forEach((gallery) => {
    const thumbs = Array.from(gallery.querySelectorAll(".pdp-thumb"));
    const prevBtn = gallery.querySelector(".pdp-arrow-prev");
    const nextBtn = gallery.querySelector(".pdp-arrow-next");

    // Pas de vignette (une seule photo, ou aucune) : pas de navigation à afficher.
    if (thumbs.length <= 1){
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }

    function activate(index){
      thumbs.forEach((t, i) => t.classList.toggle("is-active", i === index));
      const thumb = thumbs[index];
      const targetId = thumb.dataset.thumbTarget;
      const target = document.getElementById(targetId);
      const url = IMAGES[thumb.dataset.img];
      if (!target || !url) return;
      // Fondu enchaîné : on masque d'abord l'image actuelle, on ne change
      // l'image de fond qu'une fois invisible, puis on la refait apparaître.
      // Un simple changement de background-image ne s'anime jamais tout
      // seul en CSS — c'est cette étape par étape qui donne l'effet de fondu.
      target.style.opacity = "0";
      window.setTimeout(() => {
        target.style.backgroundImage = `url("${url}")`;
        target.style.opacity = "1";
      }, 250);
    }

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener("click", () => activate(i));
    });

    if (prevBtn){
      prevBtn.addEventListener("click", () => {
        const current = thumbs.findIndex((t) => t.classList.contains("is-active"));
        activate((current - 1 + thumbs.length) % thumbs.length);
      });
    }
    if (nextBtn){
      nextBtn.addEventListener("click", () => {
        const current = thumbs.findIndex((t) => t.classList.contains("is-active"));
        activate((current + 1) % thumbs.length);
      });
    }
  });
}

/* --------------------------------------------------------------------------
   9) Init
   -------------------------------------------------------------------------- */
applyImages();
renderRoute();
initPdpTiers();
initPdpGallery();

/* --------------------------------------------------------------------------
   10) Formulaire de contact — Formspree + fallback mailto
   -------------------------------------------------------------------------- */
(function(){
  const form = document.getElementById("contactForm");
  if (!form) return;
  const submitBtn    = document.getElementById("cfSubmitBtn");
  const labelDefault = submitBtn ? submitBtn.querySelector(".form-submit-label") : null;
  const labelSending = submitBtn ? submitBtn.querySelector(".form-submit-sending") : null;
  const successBox   = document.getElementById("cfSuccess");
  const errorBox     = document.getElementById("cfError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const requiredFields = form.querySelectorAll("[required]");
    let valid = true;
    requiredFields.forEach((f) => { f.classList.toggle("is-invalid", !f.value.trim()); if (!f.value.trim()) valid = false; });
    if (!valid) return;
    if (submitBtn) submitBtn.disabled = true;
    if (labelDefault) labelDefault.hidden = true;
    if (labelSending) labelSending.hidden = false;
    if (successBox) successBox.hidden = true;
    if (errorBox) errorBox.hidden = true;

    const action = form.getAttribute("action") || "";
    const isFormspree = action.includes("formspree.io") && !action.includes("YOUR_FORMSPREE_ID");

    if (isFormspree) {
      try {
        const res = await fetch(action, { method:"POST", body:new FormData(form), headers:{"Accept":"application/json"} });
        if (res.ok) { form.reset(); if (successBox) successBox.hidden = false; }
        else throw new Error();
      } catch { if (errorBox) errorBox.hidden = false; }
    } else {
      const fn=(form.querySelector("#cf-firstname")||{value:""}).value, ln=(form.querySelector("#cf-lastname")||{value:""}).value;
      const em=(form.querySelector("#cf-email")||{value:""}).value;
      const ph=(form.querySelector("#cf-phone")||{value:""}).value, tp=(form.querySelector("#cf-type")||{value:""}).value;
      const ms=(form.querySelector("#cf-message")||{value:""}).value;
      const body=`Nom : ${fn} ${ln}\nEmail : ${em}\nTéléphone : ${ph||"–"}\nType : ${tp}\n\nMessage :\n${ms}`;
      window.location.href=`mailto:instant.collecte@gmail.com?subject=Nouvelle demande — Instant Collecté&body=${encodeURIComponent(body)}`;
      if (successBox) successBox.hidden = false;
    }
    if (submitBtn) submitBtn.disabled = false;
    if (labelDefault) labelDefault.hidden = false;
    if (labelSending) labelSending.hidden = true;
  });
  form.querySelectorAll(".form-input").forEach((i) => i.addEventListener("input", () => i.classList.remove("is-invalid")));
})();

/* ---------- Carousel preuve sociale — infinite ---------- */
function initCarousel(){
  const track = document.querySelector('.sp-track');
  if(!track) return;
  const cards = Array.from(track.querySelectorAll('.screenshot-card'));
  const prevBtn = document.querySelector('.sp-prev');
  const nextBtn = document.querySelector('.sp-next');
  const dotsWrap = document.getElementById('spDots');
  const visible = window.innerWidth <= 640 ? 1 : 3;
  const total = cards.length;
  const max = total - visible;
  let current = 0;
  let animating = false;

  if(dotsWrap){
    dotsWrap.innerHTML = '';
    for(let i = 0; i <= max; i++){
      const dot = document.createElement('button');
      dot.className = 'sp-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Avis ' + (i+1));
      dot.addEventListener('click', function(){ goTo(i); });
      dotsWrap.appendChild(dot);
    }
  }

  function getCardWidth(){ return cards[0].offsetWidth + 16; }

  function updateDots(){
    document.querySelectorAll('.sp-dot').forEach(function(d, i){ d.classList.toggle('active', i === current); });
  }

  function goTo(index, instant){
    current = ((index % (max+1)) + (max+1)) % (max+1);
    var tx = current * getCardWidth();
    if(instant){ track.style.transition = 'none'; } else { track.style.transition = 'transform 0.4s ease'; }
    track.style.transform = 'translateX(-' + tx + 'px)';
    updateDots();
  }

  function goNext(){
    if(animating) return;
    if(current >= max){
      // Sauter à la fin, puis revenir au début sans animation
      animating = true;
      track.style.transition = 'none';
      track.style.transform = 'translateX(-' + (current * getCardWidth()) + 'px)';
      setTimeout(function(){
        track.style.transition = 'transform 0.4s ease';
        current = 0;
        track.style.transform = 'translateX(0)';
        updateDots();
        setTimeout(function(){ animating = false; }, 420);
      }, 20);
    } else {
      goTo(current + 1);
    }
  }

  function goPrev(){
    if(animating) return;
    if(current <= 0){
      animating = true;
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      setTimeout(function(){
        track.style.transition = 'transform 0.4s ease';
        current = max;
        track.style.transform = 'translateX(-' + (max * getCardWidth()) + 'px)';
        updateDots();
        setTimeout(function(){ animating = false; }, 420);
      }, 20);
    } else {
      goTo(current - 1);
    }
  }

  if(prevBtn) prevBtn.addEventListener('click', goPrev);
  if(nextBtn) nextBtn.addEventListener('click', goNext);
  goTo(0);
}
document.addEventListener('DOMContentLoaded', function(){ initCarousel(); });

if (typeof applyImages === "function") applyImages();

/* --------------------------------------------------------------------------
   FAQ accordion — délégation d'événement, fonctionne après rendu de page
   -------------------------------------------------------------------------- */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.faq-question');
  if (!btn) return;
  const card = btn.closest('[data-faq-card]');
  if (!card) return;
  const isOpen = card.classList.contains('is-open');
  // Ferme toutes les cartes ouvertes
  document.querySelectorAll('[data-faq-card].is-open').forEach(function(c) {
    c.classList.remove('is-open');
    c.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });
  // Ouvre la carte cliquée si elle était fermée
  if (!isOpen) {
    card.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  }
});
