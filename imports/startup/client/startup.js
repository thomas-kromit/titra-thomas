import { Template } from 'meteor/templating'
import isDarkMode from 'is-dark'
import hotkeys from 'hotkeys-js'
import { $ } from 'meteor/jquery'
import Projects from '../../api/projects/projects.js'
import Extensions from '../../api/extensions/extensions.js'
import {
  timeInUserUnit,
  emojify,
  getGlobalSetting,
  getUserSetting,
  getUserTimeUnitVerbose,
  getUserTimeUnitAbbreviated,
} from '../../utils/frontend_helpers.js'

import {
  i18nReady, t, getLanguage, loadLanguage,
} from '../../utils/i18n.js'

const i18nextDebugMode = window.location.href.indexOf('localhost') > 0
let lightThemeCSS
let darkThemeCSS
Template.registerHelper('t', (param) => (i18nReady.get() ? t(param) : 'Loading ...'))
Template.registerHelper('prefix', () => window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '')

Meteor.startup(() => {
  window.BootstrapLoaded = new ReactiveVar(false)
  Meteor.subscribe('globalsettings')
  const extensionHandle = Meteor.subscribe('extensions')
  let language = navigator.language.substring(0, 2)
  import('@fortawesome/fontawesome-free/js/all.js')
  import('bootstrap').then((bs) => {
    window.BootstrapLoaded.set(true)
    const bsTooltips = new bs.Tooltip(document.body, {
      selector: '[data-bs-toggle="tooltip"]',
      trigger: 'hover focus',
    })
    const avatarTooltip = new bs.Tooltip(document.body, {
      selector: '.js-avatar-tooltip',
      trigger: 'hover focus',
    })
  })
  function cleanupStyles(theme) {
    let darkTheme
    let lightTheme
    document
      .querySelectorAll('style').forEach((style) => {
        if (style.textContent.indexOf('::selection') === 1) {
          darkTheme = style
          darkThemeCSS = style.cloneNode(true)
        } else if (style.textContent.indexOf('.btn') === 0) {
          lightThemeCSS = style.cloneNode(true)
          lightTheme = style
        }
      })
    if (theme === 'light') {
      if (darkTheme && lightTheme) {
        darkTheme.remove()
      } else if (darkTheme && !lightTheme && lightThemeCSS) {
        darkTheme.remove()
        document.head.append(lightThemeCSS)
      }
    } else if (theme === 'dark') {
      if (lightTheme && darkTheme) {
        lightTheme.remove()
      } else if (lightTheme && !darkTheme && darkThemeCSS) {
        lightTheme.remove()
        document.head.append(darkThemeCSS)
      }
    }
  }
  Tracker.autorun(() => {
    if (!Meteor.loggingIn() && Meteor.user()
      && Meteor.user().profile) {
      if (getUserSetting('theme') === 'dark') {
        cleanupStyles('dark')
        import('../../ui/styles/dark.scss')
      } else if (getUserSetting('theme') === 'light') {
        cleanupStyles('light')
        import('../../ui/styles/light.scss')
      } else if (getUserSetting('theme') === 'custom') {
        import('../../ui/styles/custom_theme/custom.scss')
      } else if (isDarkMode()) {
        cleanupStyles('dark')
        import('../../ui/styles/dark.scss')
      } else {
        cleanupStyles('light')
        import('../../ui/styles/light.scss')
      }
    } else if (!Meteor.loggingIn() && isDarkMode()) {
      cleanupStyles('dark')
      import('../../ui/styles/dark.scss')
    } else {
      cleanupStyles('light')
      import('../../ui/styles/light.scss')
    }
  })
  Tracker.autorun(() => {
    if (!Meteor.loggingIn() && Meteor.user() && Meteor.user().profile) {
      if (getUserSetting('language')) {
        language = getUserSetting('language') === 'auto' ? navigator.language.substring(0, 2) : getUserSetting('language')
      }
      if (getLanguage() !== language) {
        loadLanguage(language, i18nextDebugMode)
      }
    } else if (!Meteor.user() && !Meteor.loggingIn()) {
      if (getLanguage() !== language) {
        loadLanguage(language, i18nextDebugMode)
      }
    }
  })
  Tracker.autorun(() => {
    if (getGlobalSetting('customCSS')) {
      $('head').append(`<style>${getGlobalSetting('customCSS')}</style>`)
    }
    if (getGlobalSetting('customHTML')) {
      $('body').append(`<div>${getGlobalSetting('customHTML')}</div>`)
    }
  })
  Tracker.autorun(() => {
    if (getGlobalSetting('enableOpenIDConnect')) {
      import('../../utils/oidc_client').then((Oidc) => {
        Oidc.registerOidc()
      })
    }
  })

  hotkeys('command+s,d,w,m', (event, handler) => {
    event.preventDefault()
    switch (handler.key) {
      case 'command+s':
        if (document.querySelector('.js-save')) {
          document.querySelector('.js-save').click()
        }
        break
      case 'd':
        if (document.querySelector('.js-day')) {
          document.querySelector('.js-day').click()
        }
        break
      case 'w':
        if (document.querySelector('.js-week')) {
          document.querySelector('.js-week').click()
        }
        break
      case 'm':
        if (document.querySelector('.js-month')) {
          document.querySelector('.js-month').click()
        }
        break
      default:
        break
    }
  })
  if ('serviceWorker' in navigator) {
    const prefix = window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || ''
    navigator.serviceWorker.register(`${prefix}/sw.js`)
  }
  Tracker.autorun(() => {
    if (extensionHandle.ready()) {
      for (const extension of Extensions.find({})) {
        if (extension.isActive) {
          eval(extension.client)
        }
      }
    }
  })
})
Template.registerHelper('i18nReady', () => i18nReady.get())
Template.registerHelper('unit', () => {
  if (!Meteor.loggingIn() && Meteor.user() && Meteor.user().profile) {
    return getUserSetting('unit')
  }
  return false
})
Template.registerHelper('emojify', (text) => {
  if (text) {
    return text.replace(/(:\S*:)/g, emojify)
  }
  return false
})
Template.registerHelper('timeunit', getUserTimeUnitAbbreviated)
Template.registerHelper('timeunitVerbose', getUserTimeUnitVerbose)
Template.registerHelper('timetrackview', () => {
  if (!Meteor.loggingIn() && Meteor.user() && Meteor.user().profile) {
    return getUserSetting('timetrackview')
  }
  return false
})
Template.registerHelper('timeInUserUnit', (time) => timeInUserUnit(time))
Template.registerHelper('projectColor', (_id) => {
  if (Projects.findOne({ _id })) {
    return Projects.findOne({ _id }).color ? Projects.findOne({ _id }).color : '#009688'
  }
  return '#d9d9d9'
})
Template.registerHelper('isSandstorm', () => Meteor.settings.public.sandstorm)
Template.registerHelper('getGlobalSetting', (settingName) => getGlobalSetting(settingName))
