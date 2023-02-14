import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isBetween from 'dayjs/plugin/isBetween'
import { check, Match } from 'meteor/check'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Timecards from '../../timecards/timecards'
import Projects from '../projects.js'
import Tasks from '../../tasks/tasks.js'
import { checkAuthentication } from '../../../utils/server_method_helpers.js'
import { addNotification } from '../../notifications/notifications.js'
import { emojify } from '../../../utils/frontend_helpers'

/**
Get the statistics of all projects based on the timecards.
@param {Object} params - The parameters for the method
@param {Boolean} [params.includeNotBillableTime] - Whether to include not billable
time in the statistics
@param {Boolean} [params.showArchived] - Whether to show archived projects in the statistics
@returns {Object} - An object that contains the statistics of all projects
*/
const getAllProjectStats = new ValidatedMethod({
  name: 'getAllProjectStats',
  validate(args) {
    check(args.includeNotBillableTime, Match.Maybe(Boolean))
    check(args.showArchived, Match.Maybe(Boolean))
  },
  async run({ includeNotBillableTime, showArchived }) {
    const notbillable = includeNotBillableTime
    await checkAuthentication(this)
    dayjs.extend(utc)
    dayjs.extend(isBetween)
    const andCondition = [{
      $or: [{ userId: this.userId }, { public: true }, { team: this.userId }],
    }]
    if (!showArchived) {
      andCondition.push({ $or: [{ archived: false }, { archived: { $exists: false } }] })
    }
    if (!notbillable) {
      andCondition.push({ $or: [{ notbillable }, { notbillable: { $exists: false } }] })
    }
    let projectList = await Projects.find({ $and: andCondition }, { _id: 1 })
      .fetchAsync()
    projectList = projectList.map((value) => value._id)
    let totalHours = 0
    let currentMonthHours = 0
    let previousMonthHours = 0
    let beforePreviousMonthHours = 0
    const currentMonthName = dayjs.utc().format('MMM')
    const currentMonthStart = dayjs.utc().startOf('month')
    const currentMonthEnd = dayjs.utc().endOf('month')
    const previousMonthName = dayjs.utc().subtract(1, 'month').format('MMM')
    const beforePreviousMonthName = dayjs.utc().subtract(2, 'month').format('MMM')
    const previousMonthStart = dayjs.utc().subtract(1, 'month').startOf('month')
    const previousMonthEnd = dayjs.utc().subtract(1, 'month').endOf('month')
    const beforePreviousMonthStart = dayjs.utc().subtract(2, 'month').startOf('month')
    const beforePreviousMonthEnd = dayjs.utc().subtract(2, 'month').endOf('month')
    const timecardAggregation = await Timecards.rawCollection().aggregate([{ $match: { projectId: { $in: projectList } } }, { $group: { _id: null, totalHours: { $sum: '$hours' } } }]).toArray()
    totalHours = Number.parseFloat(timecardAggregation[0]?.totalHours)
    for await (const timecard of
      Timecards.find({
        projectId: { $in: projectList },
        date: { $gte: beforePreviousMonthStart.toDate() },
      })) {
      if (dayjs.utc(new Date(timecard.date)).isBetween(currentMonthStart, currentMonthEnd)) {
        currentMonthHours += Number.parseFloat(timecard.hours)
      } else if (dayjs.utc(new Date(timecard.date))
        .isBetween(previousMonthStart, previousMonthEnd)) {
        previousMonthHours += Number.parseFloat(timecard.hours)
      } else if (dayjs.utc(new Date(timecard.date))
        .isBetween(beforePreviousMonthStart, beforePreviousMonthEnd)) {
        beforePreviousMonthHours += Number.parseFloat(timecard.hours)
      }
    }
    return {
      totalHours,
      currentMonthName,
      currentMonthHours,
      previousMonthName,
      previousMonthHours,
      beforePreviousMonthName,
      beforePreviousMonthHours,
    }
  },
})
/**
 * Update a project by ID
 *
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to update
 * @param {Array} options.projectArray - An array of attributes and their values
 * to update for the project
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to update the project
 * @return {undefined}
 */
const updateProject = new ValidatedMethod({
  name: 'updateProject',
  validate(args) {
    check(args, {
      projectId: String,
      projectArray: Array,
    })
  },
  async run({ projectId, projectArray }) {
    await checkAuthentication(this)
    const updateJSON = {}
    for (const projectAttribute of projectArray) {
      updateJSON[projectAttribute.name] = projectAttribute.value
    }
    updateJSON.name = await emojify(updateJSON.name)
    if (!updateJSON.public) {
      updateJSON.public = false
    } else {
      updateJSON.public = true
    }
    if (!updateJSON.notbillable) {
      updateJSON.notbillable = false
    } else {
      updateJSON.notbillable = true
    }
    await Projects.updateAsync({
      $or: [{ userId: this.userId }, { admins: { $in: [this.userId] } }],
      _id: projectId,
    }, { $set: updateJSON })
  },
})
/**
 * Create a new project
 * @param {Object} options
 * @param {Array} options.projectArray - An array of attributes and their values
 * to create for the project
 * @throws {Meteor.Error} If the user is not authenticated
 * @return {String} The ID of the newly created project
*/
const createProject = new ValidatedMethod({
  name: 'createProject',
  validate(args) {
    check(args, {
      projectArray: Array,
    })
  },
  async run({ projectArray }) {
    await checkAuthentication(this)
    const updateJSON = {}
    for (const projectAttribute of projectArray) {
      updateJSON[projectAttribute.name] = projectAttribute.value
    }
    if (!updateJSON.public) {
      updateJSON.public = false
    } else {
      updateJSON.public = true
    }
    updateJSON.name = await emojify(updateJSON.name)
    updateJSON._id = Random.id()
    updateJSON.userId = this.userId
    await Projects.insertAsync(updateJSON)
    return updateJSON._id
  },
})
/**
 * Delete a project by ID
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to delete
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to delete the project
 * @return {undefined}
 */
const deleteProject = new ValidatedMethod({
  name: 'deleteProject',
  validate(args) {
    check(args, {
      projectId: String,
    })
  },
  async run({ projectId }) {
    await checkAuthentication(this)
    await Projects.removeAsync({
      $or: [{ userId: this.userId }, { admins: { $in: [this.userId] } }],
      _id: projectId,
    })
    return true
  },
})
/**
 * Archive a project by ID
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to archive
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to archive the project
 * @return {undefined}
 */
const archiveProject = new ValidatedMethod({
  name: 'archiveProject',
  validate(args) {
    check(args, {
      projectId: String,
    })
  },
  async run({ projectId }) {
    await checkAuthentication(this)
    await Projects.updateAsync(
      {
        _id: projectId,
        $or: [{ userId: this.userId }, { admins: { $in: [this.userId] } }],
      },
      { $set: { archived: true } },
    )
    return true
  },
})
/**
 * Restore a project by ID
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to restore
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to restore the project
 * @return {undefined}
 */
const restoreProject = new ValidatedMethod({
  name: 'restoreProject',
  validate(args) {
    check(args, {
      projectId: String,
    })
  },
  async run({ projectId }) {
    await checkAuthentication(this)
    await Projects.updateAsync(
      {
        _id: projectId,
        $or: [{ userId: this.userId }, { admins: { $in: [this.userId] } }],
      },
      { $set: { archived: false } },
    )
    return true
  },
})
const getTopTasks = new ValidatedMethod({
  name: 'getTopTasks',
  validate(args) {
    check(args, {
      projectId: String,
      includeNotBillableTime: Match.Maybe(Boolean),
      showArchived: Match.Maybe(Boolean),
    })
  },
  async run({ projectId, includeNotBillableTime, showArchived }) {
    await checkAuthentication(this)
    const rawCollection = Timecards.rawCollection()
    if (projectId === 'all') {
      const notbillable = includeNotBillableTime
      const andCondition = [{
        $or: [{ userId: this.userId }, { public: true }, { team: this.userId }],
      }]
      if (!showArchived) {
        andCondition.push({ $or: [{ archived: false }, { archived: { $exists: false } }] })
      }
      if (!notbillable) {
        andCondition.push({ $or: [{ notbillable }, { notbillable: { $exists: false } }] })
      }
      let projectList = await Projects.find({ $and: andCondition }, { _id: 1 })
        .fetchAsync()
      projectList = projectList.map((value) => value._id)
      return rawCollection.aggregate([{ $match: { projectId: { $in: projectList } } }, { $group: { _id: '$task', count: { $sum: '$hours' } } }, { $sort: { count: -1 } }, { $limit: 3 }]).toArray()
    }
    return rawCollection.aggregate([{ $match: { projectId } }, { $group: { _id: '$task', count: { $sum: '$hours' } } }, { $sort: { count: -1 } }, { $limit: 3 }]).toArray()
  },
})
/**
 * Add a team member to a project
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to add the team member to
 * @param {String} options.eMail - The eMail of the user to add to the project
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to add a team member to the project
 * @return {undefined}
 */
const addTeamMember = new ValidatedMethod({
  name: 'addTeamMember',
  validate(args) {
    check(args, {
      projectId: String,
      eMail: String,
    })
  },
  async run({ projectId, eMail }) {
    await checkAuthentication(this)
    const targetProject = await Projects.findOneAsync({ _id: projectId })
    if (!targetProject
      || !(targetProject.userId === this.userId
        || targetProject.admins.indexOf(this.userId) >= 0)) {
      throw new Meteor.Error('notifications.only_owner_can_add_team_members')
    }
    const targetUser = await Meteor.users.findOneAsync({ 'emails.0.address': eMail, inactive: { $ne: true } })
    if (targetUser) {
      await Projects
        .updateAsync({ _id: targetProject._id }, { $addToSet: { team: targetUser._id } })
      await addNotification(`You have been invited to collaborate on the titra project '${targetProject.name}'`, targetUser._id)
      return 'notifications.team_member_added_success'
    }
    throw new Meteor.Error('notifications.user_not_found')
  },
})
/**
 * Remove a team member from a project
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to remove the team member from
 * @param {String} options.userId - The ID of the user to remove from the project
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to remove a team member from the project
 * @return {undefined}
 */
const removeTeamMember = new ValidatedMethod({
  name: 'removeTeamMember',
  validate(args) {
    check(args, {
      projectId: String,
      userId: String,
    })
  },
  async run({ projectId, userId }) {
    await checkAuthentication(this)
    const targetProject = await Projects.findOneAsync({ _id: projectId })
    if (!targetProject
      || !(targetProject.userId === this.userId
        || targetProject.admins.indexOf(this.userId) >= 0)) {
      throw new Meteor.Error('notifications.only_owner_can_remove_team_members')
    }
    await Projects.updateAsync({ _id: targetProject._id }, { $pull: { team: userId } })
    await Projects.updateAsync({ _id: targetProject._id }, { $pull: { admins: userId } })
    return 'notifications.team_member_removed_success'
  },
})
/**
 * Change the role of a team member
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to change the team member's role in
 * @param {String} options.userId - The ID of the user to change the role of
 * @param {Boolean} options.administrator - Whether the user should be an administrator
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to change the role of a team member
 * @return {undefined}
 */
const changeProjectRole = new ValidatedMethod({
  name: 'changeProjectRole',
  validate(args) {
    check(args, {
      projectId: String,
      userId: String,
      administrator: Boolean,
    })
  },
  async run({ projectId, userId, administrator }) {
    await checkAuthentication(this)
    const targetProject = await Projects.findOneAsync({ _id: projectId })
    if (!targetProject
      || !(targetProject.userId === this.userId
        || targetProject.admins.indexOf(this.userId) >= 0)) {
      throw new Meteor.Error('notifications.only_owner_can_remove_team_members')
    }
    if (administrator) {
      await Projects.updateAsync({ _id: targetProject._id }, { $push: { admins: userId } })
    } else {
      await Projects.updateAsync({ _id: targetProject._id }, { $pull: { admins: userId } })
    }
    return 'notifications.access_rights_updated'
  },
})
/**
 * Update the priority of a project
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to update the priority of
 * @param {Number} options.priority - The new priority of the project
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to update the priority of the project
 * @return {undefined}
 */
const updatePriority = new ValidatedMethod({
  name: 'updatePriority',
  validate(args) {
    check(args, {
      projectId: String,
      priority: Number,
    })
  },
  async run({ projectId, priority }) {
    await checkAuthentication(this)
    await Projects.updateAsync({ _id: projectId }, { $set: { priority } })
    return 'notifications.project_priority_success'
  },
})
/**
 * Update the default task of a project
 * @param {Object} options
 * @param {String} options.projectId - The ID of the project to update the default task of
 * @param {String} options.taskId - The ID of the task to set as the default task
 * @throws {Meteor.Error} If the project is not found or the user does not have
 * permission to update the default task of the project
 * @return {undefined}
 */
const setDefaultTaskForProject = new ValidatedMethod({
  name: 'setDefaultTaskForProject',
  validate(args) {
    check(args, {
      projectId: String,
      taskId: String,
    })
  },
  async run({ projectId, taskId }) {
    await checkAuthentication(this)
    const task = await Tasks.findOneAsync({ _id: taskId })
    if (task.isDefaultTask) {
      await Projects.updateAsync({ _id: projectId }, { $unset: { defaultTask: 1 } })
      await Tasks.updateAsync({ _id: taskId }, { $set: { isDefaultTask: false } })
      return 'notifications.default_task_success'
    }
    await Projects.updateAsync({ _id: projectId }, { $set: { defaultTask: task.name } })
    await Tasks.updateAsync({ projectId }, { $set: { isDefaultTask: false } }, { multi: true })
    await Tasks.updateAsync({ _id: taskId }, { $set: { isDefaultTask: true } })
    return 'notifications.default_task_success'
  },
})
export {
  getAllProjectStats,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  getTopTasks,
  addTeamMember,
  removeTeamMember,
  changeProjectRole,
  updatePriority,
  setDefaultTaskForProject,
}
