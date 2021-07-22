import store from '@/store'

/**
 * Logs a message to the snackbar.
 * @param message the message to log
 * @param group the group to use ('internal', 'communication', ...) which is a path in the message-object in localization.
 * @param level the level to use ('error', 'warning')
 * @param status the status-code (integer) (may be omitted)
 */
export function log (message, group, level, status) {
  store.dispatch('gui/snackbar/snackbarEnqueue', {
    color: `${level}`,
    headingTKey: `message.${level}.heading`,
    descriptionTKey: `message.${level}.${group}`,
    status,
    message
  }, { root: true })
}

/**
 * Logs a success message to the snackbar
 * @param message the message to log
 * @param group the group to use ('internal', 'communication', ...) which is a path in the message-object in localization.
 * @param status the status-code (integer) (may be omitted)
 */
export function success (message, group, status?) {
  log(message, group, 'success', status)
}

/**
 * Logs a warning to the snackbar
 * @param message the message to log
 * @param group the group to use ('internal', 'communication', ...) which is a path in the message-object in localization.
 * @param status the status-code (integer) (may be omitted)
 */
export function warning (message, group, status?) {
  log(message, group, 'warning', status)
}

/**
 * Logs an error to the snackbar
 * @param message the message to log
 * @param group the group to use ('internal', 'communication', ...) which is a path in the message-object in localization.
 * @param status the status-code (integer) (may be omitted)
 */
export function error (message, group, status?) {
  log(message, group, 'error', status)
}
