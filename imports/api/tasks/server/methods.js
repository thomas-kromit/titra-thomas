import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Tasks from '../tasks.js'
import { checkAuthentication } from '../../../utils/server_method_helpers.js'

/**
Inserts a new project task into the Tasks collection.
@param {Object} args - The arguments object containing the task information.
@param {string} args.projectId - The ID of the project for the task.
@param {string} args.name - The name of the task.
@param {Date} args.start - The start date of the task.
@param {Date} args.end - The end date of the task.
@param {string[]} [args.dependencies] - An array of task IDs that this task depends on.
*/
const insertProjectTask = new ValidatedMethod({
  name: 'insertProjectTask',
  validate(args) {
    check(args, {
      projectId: String,
      name: String,
      start: Date,
      end: Date,
      dependencies: Match.Optional([String]),
    })
  },
  async run({
    projectId, name, start, end, dependencies,
  }) {
    await checkAuthentication(this)
    await Tasks.insertAsync({
      projectId,
      name,
      start,
      end,
      dependencies,
    })
  },
})
/**
 * Updates a task in the Tasks collection.
 * @param {Object} args - The arguments object containing the task information.
 * @param {string} args.taskId - The ID of the task to update.
 * @param {string} [args.projectId] - The ID of the project for the task.
 * @param {string} [args.name] - The name of the task.
 * @param {Date} [args.start] - The start date of the task.
 * @param {Date} [args.end] - The end date of the task.
 * @param {string[]} [args.dependencies] - An array of task IDs that this task depends on.
 * @throws {Meteor.Error} If user is not authenticated.
 * @returns {String} 'notifications.success' if successful
 */
const updateTask = new ValidatedMethod({
  name: 'updateTask',
  validate(args) {
    check(args, {
      taskId: String,
      projectId: Match.Optional(String),
      name: Match.Optional(String),
      start: Match.Optional(Date),
      end: Match.Optional(Date),
      dependencies: Match.Optional([String]),
    })
  },
  async run({
    taskId, name, start, end, dependencies,
  }) {
    await checkAuthentication(this)
    const updatedTask = {
    }
    if (name) updatedTask.name = name
    if (start) updatedTask.start = start
    if (end) updatedTask.end = end
    if (dependencies) updatedTask.dependencies = dependencies
    if (updatedTask) {
      await Tasks.updateAsync(taskId, {
        $set: {
          name,
          start,
          end,
          dependencies,
        },
      })
    }
  },
})
/**
 * Removes a task from the Tasks collection.
 * @param {Object} args - The arguments object containing the task information.
 * @param {string} args.taskId - The ID of the task to remove.
 * @throws {Meteor.Error} If user is not authenticated.
 * @returns {String} 'notifications.success' if successful
 */
const removeProjectTask = new ValidatedMethod({
  name: 'removeProjectTask',
  validate(args) {
    check(args, {
      taskId: String,
    })
  },
  async run({ taskId }) {
    await checkAuthentication(this)
    await Tasks.removeAsync({ _id: taskId })
  },
})

export {
  insertProjectTask, updateTask, removeProjectTask,
}
