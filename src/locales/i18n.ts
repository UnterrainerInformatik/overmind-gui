function Lang (defaults, options = {}) {
  return Object.assign({}, defaults, options)
}

const en = {
  pageTitle: {
    about: 'About',
    main: 'Main',
    logout: 'Logout',
    preferences: 'Preferences'
  },
  page: {
    about: {
      buildTime: 'Build-time',
      fax: 'Fax',
      email: 'Email',
      loading: 'loading',
      module: 'Module',
      telephone: 'Telephone',
      version: 'Version',
      web: 'Webpage'
    }
  },
  tooltip: {
    pageTitle: {
      about: 'Information about our company and this program',
      main: 'The main page'
    },
    mnu: {
      main: 'Main Page',
      dark: 'Switch between light- and dark-theme',
      help: 'Turn display of the<br />help-tooltips on/off',
      logout: 'Logout or change user',
      preferences: 'Several settings'
    }
  },
  mnu: {
    main: 'Main Page',
    dark: 'Dark Theme',
    help: 'Help Tooltips',
    language: 'Language'
  },
  table: {
    loading: 'Loading... Please wait',
    jump: 'Jump to',
    search: 'Search',
    rowsPerPage: 'Rows / page',
    noData: 'No data available'
  },
  message: {
    success: {
      copyPaste: 'The text was copied to the clipboard.',
      heading: 'Success'
    },
    error: {
      copyPaste: 'The text could not be copied to the clipboard.',
      communication: 'There was an error communicating with the server.',
      heading: 'Error'
    },
    warning: {
      heading: 'Warning',
      internal: 'There was an internal warning.'
    }
  },
  bool: {
    true: 'true',
    false: 'false'
  }
}

const de = Lang(en, {
  pageTitle: {
    about: 'Über uns',
    main: 'Main',
    logout: 'Abmelden',
    preferences: 'Einstellungen'
  },
  page: {
    about: {
      buildTime: 'Build-Zeitpunkt',
      email: 'E-Mail',
      fax: 'Fax',
      loading: 'lädt',
      module: 'Modul',
      telephone: 'Telefon',
      version: 'Version',
      web: 'Webseite'
    }
  },
  tooltip: {
    pageTitle: {
      about: 'Informationen über unsere Firma und dieses Programm',
      main: 'Die Hauptseite'
    },
    mnu: {
      main: 'Hauptseite',
      dark: 'Zwischen heller und dunkler Einstellung wechseln',
      help: 'Ein oder ausschalten der<br />kontextbezogenen Hilfs-Tooltips',
      logout: 'Abmelden oder Benutzer wechseln',
      preferences: 'Verschiedene Einstellungen'
    }
  },
  mnu: {
    main: 'Hauptseite',
    dark: 'Dark Theme',
    help: 'Help Tooltips',
    language: 'Language'
  },
  table: {
    loading: 'Lade Daten... Bitte warten',
    jump: 'Springe zu',
    search: 'Suche',
    rowsPerPage: 'Zeilen / Seite',
    noData: 'Keine Daten verfügbar'
  },
  message: {
    success: {
      copyPaste: 'Der Text wurde in die Zwischenablage kopiert.',
      heading: 'Erfolg'
    },
    error: {
      copyPaste: 'Der Text konnte nicht in die Zwischenablage kopiert werden.',
      communication: 'Bei der Kommunikation mit dem Server trat ein Fehler auf.',
      heading: 'Fehler'
    },
    warning: {
      heading: 'Warnung',
      internal: 'Es gab eine interne Warnung.'
    }
  },
  bool: {
    true: 'Richtig',
    false: 'Falsch'
  }
})

export default {
  en: en,
  de: de
}
