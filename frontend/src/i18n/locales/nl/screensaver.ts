import type { screensaver as en } from '../en/screensaver';

export const screensaver: typeof en = {
  title: 'Schermbeveiliging',
  start: 'Starten',
  index: {
    startSubtitle: 'Kioskweergave starten',
    layoutTitle: 'Indeling',
    layoutSubtitle: 'Overlay-elementen & positie',
    autostartTitle: 'Automatisch starten',
    autostartSubtitle: 'Automatisch starten bij inactiviteit',
  },
  layout: {
    title: 'Indeling',
  },
  elements: {
    time: 'Tijd',
    date: 'Datum',
    calendar: 'Agenda',
    chat: 'Huischat',
  },
  corners: {
    topLeft: 'Linksboven',
    topRight: 'Rechtsboven',
    bottomLeft: 'Linksonder',
    bottomRight: 'Rechtsonder',
  },
  autostart: {
    title: 'Automatisch starten',
    enabledLabel: 'Automatisch starten bij inactiviteit',
    enabledHint: 'Start de schermbeveiliging automatisch nadat je een tijdje niets hebt gedaan.',
    idleTimeout: 'Inactiviteitstijd (minuten)',
  },
  kiosk: {
    upcoming: 'Binnenkort',
    chat: 'Huischat',
  },
};
