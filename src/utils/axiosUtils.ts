import Vue from 'vue'
import store from '@/store'
import { error } from './loggingUtils'
import { getDeepProperty } from './objectUtils'

function buildBaseUrl (server) {
  const config = getDeepProperty(server, store.getters['rest/config'].servers)
  return `${config.protocol}://${config.address}:${config.port}`
}

export async function handleErrors (wrapped) {
  return wrapped.catch(err => {
    const status = err ? err.status : err
    let msg = err.message
    if (err != null && err.response != null && err.response.data != null && err.response.data.message != null) {
      msg = err.response.data.message
    }
    error(msg, 'communication', status)
  })
}

function setIndicator (workingIndicator, value) {
  if (workingIndicator !== null) {
    if (typeof workingIndicator === 'string') {
      store.dispatch(workingIndicator, value)
    } else {
      workingIndicator(value)
    }
  }
}

function setResponse (dataSetter, response) {
  if (dataSetter != null) {
    if (typeof dataSetter === 'string') {
      store.dispatch(dataSetter, response)
    } else {
      dataSetter(response)
    }
  }
}

function provideData (dataProvider) {
  if (dataProvider !== null) {
    if (typeof dataProvider === 'string') {
      return store.getters[dataProvider]
    } else {
      return dataProvider()
    }
  }
  return null
}

async function internalRestCall (workingIndicator, responseSetter, restCallPromise) {
  setIndicator(workingIndicator, true)
  return handleErrors(restCallPromise.then(response => {
    setIndicator(workingIndicator, false)
    // console.log(response)
    setResponse(responseSetter, response)
    return response
  }))
}

function getAuthorizationHeader () {
  const token = store.getters['keycloak/token']
  if (token == null || token === undefined || token === '') {
    return {}
  }
  return { Authorization: 'Bearer ' + token }
}

async function internalGet (server, endpointPath) {
  // console.log(buildBaseUrl(server) + endpointPath)
  return Vue.axios
    .get(buildBaseUrl(server) + endpointPath, {
      headers: Object.assign({}, getAuthorizationHeader())
    })
    .then(response => {
      return response.data
    })
}

async function internalDelete (server, endpointPath) {
  return Vue.axios
    .delete(buildBaseUrl(server) + endpointPath, {
      data: {
      },
      headers: Object.assign({}, getAuthorizationHeader())
    })
    .then(response => {
      return response.data
    })
}

async function internalPut (server, endpointPath, dataProvider) {
  // console.log(buildBaseUrl(server) + endpointPath)
  return Vue.axios
    .put(buildBaseUrl(server) + endpointPath, provideData(dataProvider), {
      headers: Object.assign({}, getAuthorizationHeader())
    })
    .then(response => {
      return response.data
    })
}

async function internalPost (server, endpointPath, dataProvider) {
  // console.log(buildBaseUrl(server) + endpointPath)
  return Vue.axios
    .post(buildBaseUrl(server) + endpointPath, provideData(dataProvider), {
      headers: Object.assign({}, getAuthorizationHeader())
    })
    .then(response => {
      return response.data
    })
}

/**
 * Send a GET retrieving the response from the server.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 */
export async function getResponse (server, endpointPath, workingIndicator, responseSetter) {
  return internalRestCall(workingIndicator, responseSetter, internalGet(server, getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)))
}

/**
 * Send a GET retrieving a data-object represented by an ID from the server.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 * @param id the ID of the object to retrieve
 */
export async function getById (server, endpointPath, id, workingIndicator, responseSetter) {
  return internalRestCall(workingIndicator, responseSetter, internalGet(server, `${getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)}/${id}`))
}

/**
 * Send a GET retrieving a list of data-objects from the server.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 * @param size the size of a single page of the list
 * @param offset the number of pages to omit before returning the list
 * @param additionalQueryParams a string containing additional query parameters (like 'scanId=5&searchName=hallo' for example)
 */
export async function getList (server, endpointPath, size, offset, workingIndicator, responseSetter, additionalQueryParams) {
  return internalRestCall(workingIndicator, responseSetter, internalGet(server, `${getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)}?size=${size}&offset=${offset}${additionalQueryParams != null ? '&' + additionalQueryParams : ''}`))
}

/**
 * Sends a DEL request to the server for the object with the given ID.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 * @param id the ID of the object to retrieve
 */
export async function del (server, endpointPath, id, workingIndicator, responseSetter) {
  return internalRestCall(workingIndicator, responseSetter, internalDelete(server, `${getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)}/${id}`))
}

/**
 * Sends a PUT request to the server for the object with the given ID.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param dataProvider path to a vuex-getter or function that will be called in order to get the body for the call
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 * @param id the ID of the object to retrieve
 */
export async function put (server, endpointPath, id, workingIndicator, dataProvider, responseSetter) {
  return internalRestCall(workingIndicator, responseSetter, internalPut(server, `${getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)}/${id}`, dataProvider))
}

/**
 * Sends a POST request to the server for the object with the given ID.
 * @param server name of the rest/config/servers property to use
 * @param endpointPath path to the correct endpoint-definition starting from rest/config/endpoint/
 * @param workingIndicator path to an indicator-action (true/false) or function(value) that will be called with value = (true/false) accordingly
 * @param dataProvider path to a vuex-getter or function that will be called in order to get the body for the call
 * @param responseSetter path to a vuex-action (object) or function(response) that will be called with the received response
 */
export async function post (server, endpointPath, workingIndicator, dataProvider, responseSetter) {
  return internalRestCall(workingIndicator, responseSetter, internalPost(server, `${getDeepProperty(endpointPath, store.getters['rest/config'].endpoint)}`, dataProvider))
}
