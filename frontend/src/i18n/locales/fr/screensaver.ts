import type { screensaver as en } from '../en/screensaver';

export const screensaver: typeof en = {
  title: "Économiseur d'écran",
  start: 'Démarrer',
  index: {
    startSubtitle: "Lancer l'affichage kiosque",
    layoutTitle: 'Disposition',
    layoutSubtitle: 'Éléments superposés & position',
    autostartTitle: 'Démarrage auto',
    autostartSubtitle: "Lancement automatique en cas d'inactivité",
  },
  layout: {
    title: 'Disposition',
  },
  elements: {
    time: 'Heure',
    date: 'Date',
    calendar: 'Calendrier',
    chat: 'Discussion de la maison',
  },
  corners: {
    topLeft: 'En haut à gauche',
    topRight: 'En haut à droite',
    bottomLeft: 'En bas à gauche',
    bottomRight: 'En bas à droite',
  },
  autostart: {
    title: 'Démarrage auto',
    enabledLabel: "Démarrer automatiquement en cas d'inactivité",
    enabledHint: "Lancez automatiquement l'économiseur d'écran après une période d'inactivité.",
    idleTimeout: "Délai d'inactivité (minutes)",
  },
  kiosk: {
    upcoming: 'À venir',
    chat: 'Discussion de la maison',
  },
};
