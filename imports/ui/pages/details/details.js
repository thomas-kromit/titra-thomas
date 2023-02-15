import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './details.html'
import './components/dailytimetable.js'
import './components/periodtimetable.js'
import './components/workingtimetable.js'
import './components/detailtimetable'
import './components/filterbar.js'
import './dashboard.js'

Template.timecardlist.onCreated(function createTimeCardList() {
  this.project = new ReactiveVar()
  this.resource = new ReactiveVar()
  this.period = new ReactiveVar()
  this.limit = new ReactiveVar(25)
  this.customer = new ReactiveVar()
  this.activeTab = new ReactiveVar()
  this.autorun(() => {
    if (window && window.BootstrapLoaded && window.BootstrapLoaded.get()) {
      $(`#${this.activeTab.get()}`).tab('show')
    }
  })
})
Template.timecardlist.onRendered(() => {
  const templateInstance = Template.instance()
  templateInstance.autorun(() => {
    if (templateInstance.subscriptionsReady() && window.BootstrapLoaded.get()) {
      window.requestAnimationFrame(() => {
        if (templateInstance.$('[data-bs-toggle="tooltip"]').get(0)) {
          templateInstance.$('[data-bs-toggle="tooltip"]').tooltip({
            container: templateInstance.firstNode,
            trigger: 'hover focus',
          })
        }
      })
    }
    if (FlowRouter.getParam('projectId')) {
      const projectIdParam = FlowRouter.getParam('projectId')
      const projectIdArray = projectIdParam.split(',')
      templateInstance.project.set(projectIdArray.length > 1 ? projectIdArray : projectIdParam)
    } else {
      templateInstance.project.set('all')
    }
    if (FlowRouter.getQueryParam('resource')) {
      const resourceIdParam = FlowRouter.getQueryParam('resource')
      const resourceIdArray = resourceIdParam.split(',')
      templateInstance.resource.set(resourceIdArray.length > 1 ? resourceIdArray : resourceIdParam)
    } else {
      templateInstance.resource.set('all')
    }
    if (FlowRouter.getQueryParam('period')) {
      templateInstance.period.set(FlowRouter.getQueryParam('period'))
    } else {
      templateInstance.period.set('currentMonth')
    }
    if (FlowRouter.getQueryParam('customer')) {
      const customerIdParam = FlowRouter.getQueryParam('customer')
      const customerIdArray = customerIdParam.split(',')
      templateInstance.customer.set(customerIdArray.length > 1 ? customerIdArray : customerIdParam)
    } else {
      templateInstance.customer.set('all')
    }
    if (FlowRouter.getQueryParam('activeTab')) {
      templateInstance.activeTab.set(FlowRouter.getQueryParam('activeTab'))
    } else {
      templateInstance.activeTab.set('detailed-tab')
    }
    if (FlowRouter.getQueryParam('limit')) {
      templateInstance.limit.set(Number(FlowRouter.getQueryParam('limit')))
    } else {
      templateInstance.limit.set(25)
    }
  })
})
Template.timecardlist.helpers({
  project() {
    return Template.instance().project
  },
  resource() {
    return Template.instance().resource
  },
  period() {
    return Template.instance().period
  },
  limit() {
    return Template.instance().limit
  },
  customer() {
    return Template.instance().customer
  },
  isActive(tab) {
    return Template.instance().activeTab.get() === tab
  },
})

Template.timecardlist.events({
  // 'change #period': (event, templateInstance) => {
  //   FlowRouter.setQueryParams({ period: templateInstance.$(event.currentTarget).val() })
  // },
  // 'change #resourceselect': (event, templateInstance) => {
  //   FlowRouter.setQueryParams({ resource: templateInstance.$(event.currentTarget).val() })
  // },
  // 'change #customerselect': (event, templateInstance) => {
  //   FlowRouter.setQueryParams({ customer: templateInstance.$(event.currentTarget).val() })
  // },
  'click .nav-link[data-bs-toggle]': (event, templateInstance) => {
    FlowRouter.setQueryParams({ activeTab: templateInstance.$(event.currentTarget)[0].id })
  },
})
