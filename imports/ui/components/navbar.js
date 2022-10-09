import { Template } from 'meteor/templating'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { t } from '../../utils/i18n.js'
import { displayUserAvatar, getUserSetting, showToast } from '../../utils/frontend_helpers'
import './navbar.html'
import './timetracker'


Template.navbar.onCreated(function navbarCreated() {
  this.autorun(() => {
    if (Meteor.user()) {
      this.subscribe('userRoles')
    }
  })
})

Template.navbar.helpers({
  isRouteActive: (routename) => (FlowRouter.getRouteName() === routename ? 'active' : ''),
  displayLinkText: (routename) => (FlowRouter.getRouteName() === routename),
  avatar: () => displayUserAvatar(Meteor.user()),
  getUserSetting: (setting) => getUserSetting(setting),
})


Template.navbar.events({
  'click .timeunitSwitch': (event, templateInstance) => {
    event.preventDefault()
    if (getUserSetting('timeunit') === 'd') {
      showToast(t('settings.time_unit') + ': ' + (t('globals.hour_plural')))
    } else if (getUserSetting('timeunit') === 'h') {
      showToast(t('settings.time_unit') + ': ' + (t('globals.minute_plural')))
    } else if (getUserSetting('timeunit') === 'm') {
      showToast(t('settings.time_unit') + ': ' + (t('globals.day_plural')))
    }
  }

})