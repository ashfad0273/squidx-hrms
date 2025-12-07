/**
 * SquidX HRM — API Service Module
 * =================================
 * Single source of truth for ALL frontend-backend communication.
 * Uses jQuery AJAX for network requests.
 * All functions return Promises.
 * 
 * Dependencies:
 *   - jQuery (for AJAX)
 *   - /config/sheet-config.js (for CONFIG.SCRIPT_URL)
 */

const API = (function() {
    'use strict';

    // ============================================
    // 🔧 CONFIGURATION & CONSTANTS
    // ============================================

    const API_URL = CONFIG.SCRIPT_URL;
    const TIMEOUT = CONFIG.REQUEST_TIMEOUT || 30000;
    const DEBUG = CONFIG.DEBUG_MODE || false;

    // ============================================
    // 📝 LOGGING UTILITIES
    // ============================================

    /**
     * Logs API requests (only in debug mode)
     */
    const logRequest = (type, endpoint, data = null) => {
        if (DEBUG) {
            console.log(`[API] ${type} Request:`, endpoint, data || '');
        }
    };

    /**
     * Logs API responses (only in debug mode)
     */
    const logResponse = (endpoint, response) => {
        if (DEBUG) {
            console.log(`[API] Response from ${endpoint}:`, response);
        }
    };

    /**
     * Logs API errors (only in debug mode)
     */
    const logError = (endpoint, error) => {
        if (DEBUG) {
            console.error(`[API] Error from ${endpoint}:`, error);
        }
    };

    // ============================================
    // 🌐 CORE HTTP UTILITIES
    // ============================================

    /**
     * Generic GET request wrapper
     * @param {Object} params - Query parameters object
     * @returns {Promise} - Resolves with response data
     */
    const apiGet = (params = {}) => {
        return new Promise((resolve, reject) => {
            // Build query string
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');

            const url = queryString ? `${API_URL}?${queryString}` : API_URL;
            const endpoint = params.action || 'unknown';

            logRequest('GET', endpoint, params);

            $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                timeout: TIMEOUT,
                success: function(response) {
                    logResponse(endpoint, response);

                    if (response.success) {
                        resolve(response.data);
                    } else {
                        const error = {
                            message: response.error || 'Unknown error occurred',
                            code: response.code || 400,
                            endpoint: endpoint
                        };
                        logError(endpoint, error);
                        reject(error);
                    }
                },
                error: function(xhr, status, error) {
                    const errorObj = parseAjaxError(xhr, status, error, endpoint);
                    logError(endpoint, errorObj);
                    reject(errorObj);
                }
            });
        });
    };

    /**
     * Generic POST request wrapper
     * @param {Object} body - Request body object (must include 'action')
     * @returns {Promise} - Resolves with response data
     */
    const apiPost = (body = {}) => {
        return new Promise((resolve, reject) => {
            const endpoint = body.action || 'unknown';

            logRequest('POST', endpoint, body);

            $.ajax({
               url: API_URL,
               type: 'POST',
               contentType: 'application/x-www-form-urlencoded',
               data: { payload: JSON.stringify(body) },
               dataType: 'json',

                timeout: TIMEOUT,
                success: function(response) {
                    logResponse(endpoint, response);

                    if (response.success) {
                        resolve(response.data);
                    } else {
                        const error = {
                            message: response.error || 'Unknown error occurred',
                            code: response.code || 400,
                            endpoint: endpoint
                        };
                        logError(endpoint, error);
                        reject(error);
                    }
                },
                error: function(xhr, status, error) {
                    const errorObj = parseAjaxError(xhr, status, error, endpoint);
                    logError(endpoint, errorObj);
                    reject(errorObj);
                }
            });
        });
    };

    /**
     * Parses AJAX errors into a consistent format
     * @param {Object} xhr - XMLHttpRequest object
     * @param {string} status - Status text
     * @param {string} error - Error message
     * @param {string} endpoint - API endpoint name
     * @returns {Object} - Standardized error object
     */
    const parseAjaxError = (xhr, status, error, endpoint) => {
        let message = 'An unexpected error occurred';
        let code = xhr.status || 500;

        // Handle specific error types
        if (status === 'timeout') {
            message = 'Request timed out. Please check your connection and try again.';
            code = 408;
        } else if (status === 'parsererror') {
            message = 'Failed to parse server response. Please try again.';
            code = 422;
        } else if (status === 'abort') {
            message = 'Request was cancelled.';
            code = 0;
        } else if (xhr.status === 0) {
            message = 'Network error. Please check your internet connection.';
            code = 0;
        } else if (xhr.status === 401) {
            message = 'Unauthorized. Please refresh and try again.';
        } else if (xhr.status === 403) {
            message = 'Access forbidden. You do not have permission.';
        } else if (xhr.status === 404) {
            message = 'Resource not found.';
        } else if (xhr.status === 429) {
            message = 'Too many requests. Please wait and try again.';
        } else if (xhr.status >= 500) {
            message = 'Server error. Please try again later.';
        }

        // Try to extract message from response
        try {
            if (xhr.responseJSON && xhr.responseJSON.error) {
                message = xhr.responseJSON.error;
            } else if (xhr.responseText) {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed.error) {
                    message = parsed.error;
                }
            }
        } catch (e) {
            // Keep default message
        }

        return {
            message: message,
            code: code,
            status: status,
            endpoint: endpoint,
            originalError: error
        };
    };

    // ============================================
    // ⚙️ SETTINGS API
    // ============================================

    /**
     * Fetches all application settings
     * @returns {Promise<Object>} - Settings object
     */
    const getSettings = () => {
        return apiGet({ action: 'getSettings' });
    };

    /**
     * Updates application settings
     * @param {Object} settings - Settings object to save
     * @returns {Promise<Object>} - Updated settings confirmation
     */
    const updateSettings = (settings) => {
        if (!settings || typeof settings !== 'object') {
            return Promise.reject({
                message: 'Settings object is required',
                code: 400
            });
        }

        return apiPost({
            action: 'saveSettings',
            settings: settings
        });
    };

    // ============================================
    // 👥 MEMBERS API
    // ============================================

    /**
     * Fetches all members with basic info
     * @returns {Promise<Array>} - Array of member objects
     */
    const getMembers = () => {
        return apiGet({ action: 'getMembers' });
    };

    /**
     * Fetches all members with full details
     * @returns {Promise<Array>} - Array of member objects with full details
     */
    const getAllMembers = () => {
        return apiGet({ action: 'getAllMembers' });
    };

    /**
     * Fetches member names and IDs (for dropdowns)
     * @returns {Promise<Array>} - Array of {memberId, name, photoURL, department}
     */
    const getMemberNames = () => {
        return apiGet({ action: 'getMemberNames' });
    };

    /**
     * Fetches a single member by ID
     * @param {string} memberId - Member ID (e.g., 'M001')
     * @returns {Promise<Object>} - Member object
     */
    const getMemberById = (memberId) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        return apiGet({
            action: 'getMember',
            memberId: memberId
        });
    };

    /**
     * Adds a new member
     * @param {Object} member - Member object with required fields
     * @returns {Promise<Object>} - Created member confirmation with memberId
     */
    const addMember = (member) => {
        if (!member || !member.name) {
            return Promise.reject({
                message: 'Member object with name is required',
                code: 400
            });
        }

        return apiPost({
            action: 'addMember',
            member: member
        });
    };

    /**
     * Updates an existing member
     * @param {string} memberId - Member ID to update
     * @param {Object} member - Updated member data
     * @returns {Promise<Object>} - Update confirmation
     */
    const updateMember = (memberId, member) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        if (!member || typeof member !== 'object') {
            return Promise.reject({
                message: 'Member data object is required',
                code: 400
            });
        }

        return apiPost({
            action: 'updateMember',
            memberId: memberId,
            member: member
        });
    };

    /**
     * Deletes a member permanently
     * @param {string} memberId - Member ID to delete
     * @returns {Promise<Object>} - Deletion confirmation
     */
    const deleteMember = (memberId) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        return apiPost({
            action: 'deleteMember',
            memberId: memberId
        });
    };

    /**
     * Deactivates a member (sets status to Inactive)
     * @param {string} memberId - Member ID to deactivate
     * @returns {Promise<Object>} - Deactivation confirmation
     */
    const deactivateMember = (memberId) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        return updateMember(memberId, { status: 'Inactive' });
    };

    /**
     * Activates a member (sets status to Active)
     * @param {string} memberId - Member ID to activate
     * @returns {Promise<Object>} - Activation confirmation
     */
    const activateMember = (memberId) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        return updateMember(memberId, { status: 'Active' });
    };

    // ============================================
    // 📅 ATTENDANCE API
    // ============================================

    /**
     * Fetches attendance records for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} - Array of attendance records
     */
    const getAttendanceByDate = (date) => {
        if (!date) {
            return Promise.reject({
                message: 'Date is required',
                code: 400
            });
        }

        return apiGet({
            action: 'getAttendance',
            date: date
        });
    };

    /**
     * Fetches attendance history for a specific member
     * @param {string} memberId - Member ID
     * @returns {Promise<Array>} - Array of attendance records
     */
    const getAttendanceByMember = (memberId) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        return apiGet({
            action: 'getAttendanceByMember',
            memberId: memberId
        });
    };

    /**
     * Fetches attendance records for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} - Array of attendance records
     */
    const getAttendanceRange = (startDate, endDate) => {
        if (!startDate || !endDate) {
            return Promise.reject({
                message: 'Start date and end date are required',
                code: 400
            });
        }

        return apiGet({
            action: 'getAttendanceRange',
            startDate: startDate,
            endDate: endDate
        });
    };

    /**
     * Saves attendance records (single or batch)
     * Handles insert, update, and delete operations
     * @param {Array} batch - Array of attendance record objects
     * @returns {Promise<Object>} - Save confirmation with processed count
     * 
     * @example
     * // Single attendance
     * saveAttendance([{
     *   date: '2024-01-15',
     *   memberId: 'M001',
     *   punchIn: '09:00',
     *   punchOut: '18:00',
     *   comments: ''
     * }]);
     * 
     * @example
     * // Batch attendance
     * saveAttendance([
     *   { date: '2024-01-15', memberId: 'M001', punchIn: '09:00', punchOut: '18:00' },
     *   { date: '2024-01-15', memberId: 'M002', punchIn: '08:55', punchOut: '17:30' }
     * ]);
     */
    const saveAttendance = (batch) => {
        if (!batch || !Array.isArray(batch) || batch.length === 0) {
            return Promise.reject({
                message: 'Attendance batch array is required',
                code: 400
            });
        }

        // Validate each record has required fields
        for (let i = 0; i < batch.length; i++) {
            const record = batch[i];
            if (!record.date || !record.memberId) {
                return Promise.reject({
                    message: `Record ${i + 1} is missing required fields (date, memberId)`,
                    code: 400
                });
            }
        }

        return apiPost({
            action: 'saveAttendance',
            batch: batch
        });
    };

    /**
     * Updates a single attendance record
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} memberId - Member ID
     * @param {Object} data - Updated attendance data
     * @returns {Promise<Object>} - Update confirmation
     */
    const updateAttendance = (date, memberId, data) => {
        if (!date || !memberId) {
            return Promise.reject({
                message: 'Date and Member ID are required',
                code: 400
            });
        }

        return apiPost({
            action: 'updateAttendance',
            date: date,
            memberId: memberId,
            data: data
        });
    };

    /**
     * Deletes an attendance record
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} memberId - Member ID
     * @returns {Promise<Object>} - Deletion confirmation
     */
    const deleteAttendance = (date, memberId) => {
        if (!date || !memberId) {
            return Promise.reject({
                message: 'Date and Member ID are required',
                code: 400
            });
        }

        return apiPost({
            action: 'deleteAttendance',
            date: date,
            memberId: memberId
        });
    };

    // ============================================
    // 📊 PERFORMANCE TASKS API
    // ============================================

    /**
     * Fetches all performance tasks
     * @param {string} [memberId] - Optional member ID to filter by
     * @returns {Promise<Array>} - Array of task objects
     */
    const getPerformanceTasks = (memberId = null) => {
        const params = { action: 'getPerformanceTasks' };
        if (memberId) {
            params.memberId = memberId;
        }
        return apiGet(params);
    };

    /**
     * Alias for getPerformanceTasks (backward compatibility)
     */
    const getPerformance = getPerformanceTasks;

    /**
     * Fetches a single task by ID
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} - Task object
     */
    const getTask = (taskId) => {
        if (!taskId) {
            return Promise.reject({
                message: 'Task ID is required',
                code: 400
            });
        }

        return apiGet({
            action: 'getTask',
            taskId: taskId
        });
    };

    /**
     * Adds a new task
     * @param {Object} task - Task object with required fields
     * @returns {Promise<Object>} - Created task confirmation with taskId
     * 
     * @example
     * addTask({
     *   memberId: 'M001',
     *   title: 'Complete project documentation',
     *   deadline: '2024-01-30',
     *   status: 'Pending',
     *   notes: 'High priority'
     * });
     */
    const addTask = (task) => {
        if (!task || !task.memberId || !task.title) {
            return Promise.reject({
                message: 'Task with memberId and title is required',
                code: 400
            });
        }

        return apiPost({
            action: 'addTask',
            task: task
        });
    };

    /**
     * Updates an existing task
     * @param {string} taskId - Task ID to update
     * @param {Object} task - Updated task data
     * @returns {Promise<Object>} - Update confirmation
     */
    const updateTask = (taskId, task) => {
        if (!taskId) {
            return Promise.reject({
                message: 'Task ID is required',
                code: 400
            });
        }

        if (!task || typeof task !== 'object') {
            return Promise.reject({
                message: 'Task data object is required',
                code: 400
            });
        }

        return apiPost({
            action: 'updateTask',
            taskId: taskId,
            task: task
        });
    };

    /**
     * Deletes a task
     * @param {string} taskId - Task ID to delete
     * @returns {Promise<Object>} - Deletion confirmation
     */
    const deleteTask = (taskId) => {
        if (!taskId) {
            return Promise.reject({
                message: 'Task ID is required',
                code: 400
            });
        }

        return apiPost({
            action: 'deleteTask',
            taskId: taskId
        });
    };

    /**
     * Marks a task as complete
     * @param {string} taskId - Task ID to complete
     * @param {number} [score] - Optional completion score
     * @param {string} [completedOn] - Optional completion date (defaults to today)
     * @returns {Promise<Object>} - Completion confirmation
     */
    const completeTask = (taskId, score = null, completedOn = null) => {
        if (!taskId) {
            return Promise.reject({
                message: 'Task ID is required',
                code: 400
            });
        }

        return apiPost({
            action: 'completeTask',
            taskId: taskId,
            score: score,
            completedOn: completedOn
        });
    };

    // ============================================
    // ⭐ RATINGS API
    // ============================================

    /**
     * Fetches ratings for a member (or all if no memberId)
     * @param {string} [memberId] - Optional member ID to filter by
     * @returns {Promise<Array>} - Array of rating objects
     */
    const getRatings = (memberId = null) => {
        const params = { action: 'getRatings' };
        if (memberId) {
            params.memberId = memberId;
        }
        return apiGet(params);
    };

    /**
     * Fetches a single rating by record ID
     * @param {string} recordId - Rating record ID
     * @returns {Promise<Object>} - Rating object
     */
    const getRating = (recordId) => {
        if (!recordId) {
            return Promise.reject({
                message: 'Record ID is required',
                code: 400
            });
        }

        return apiGet({
            action: 'getRating',
            recordId: recordId
        });
    };

    /**
     * Adds a new rating
     * @param {Object} rating - Rating object with required fields
     * @returns {Promise<Object>} - Created rating confirmation with recordId
     * 
     * @example
     * addRating({
     *   memberId: 'M001',
     *   quality: 4,
     *   punctuality: 5,
     *   reliability: 4,
     *   deadlines: 3
     * });
     */
    const addRating = (rating) => {
        if (!rating || !rating.memberId) {
            return Promise.reject({
                message: 'Rating with memberId is required',
                code: 400
            });
        }

        return apiPost({
            action: 'addRating',
            rating: rating
        });
    };

    /**
     * Updates an existing rating
     * @param {string} recordId - Rating record ID to update
     * @param {Object} rating - Updated rating data
     * @returns {Promise<Object>} - Update confirmation
     */
    const updateRating = (recordId, rating) => {
        if (!recordId) {
            return Promise.reject({
                message: 'Record ID is required',
                code: 400
            });
        }

        if (!rating || typeof rating !== 'object') {
            return Promise.reject({
                message: 'Rating data object is required',
                code: 400
            });
        }

        return apiPost({
            action: 'updateRating',
            recordId: recordId,
            rating: rating
        });
    };

    /**
     * Deletes a rating
     * @param {string} recordId - Rating record ID to delete
     * @returns {Promise<Object>} - Deletion confirmation
     */
    const deleteRating = (recordId) => {
        if (!recordId) {
            return Promise.reject({
                message: 'Record ID is required',
                code: 400
            });
        }

        return apiPost({
            action: 'deleteRating',
            recordId: recordId
        });
    };

    // ============================================
    // 📈 DASHBOARD API
    // ============================================

    /**
     * Fetches dashboard statistics
     * @param {string} [date] - Optional date for stats (defaults to today)
     * @returns {Promise<Object>} - Dashboard stats object
     */
    const getDashboardStats = (date = null) => {
        const params = { action: 'getDashboardStats' };
        if (date) {
            params.date = date;
        }
        return apiGet(params);
    };

    // ============================================
    // 🏥 LEAVE API
    // ============================================

    /**
     * Fetches leave summary for a member
     * @param {string} memberId - Member ID
     * @param {number} [year] - Optional year (defaults to current)
     * @param {number} [month] - Optional month 0-11 (defaults to current)
     * @returns {Promise<Object>} - Leave summary object
     */
    const getLeaveSummary = (memberId, year = null, month = null) => {
        if (!memberId) {
            return Promise.reject({
                message: 'Member ID is required',
                code: 400
            });
        }

        const params = {
            action: 'getLeaveSummary',
            memberId: memberId
        };

        if (year !== null) params.year = year;
        if (month !== null) params.month = month;

        return apiGet(params);
    };

    // ============================================
    // 🔧 UTILITY FUNCTIONS
    // ============================================

    /**
     * Tests the API connection
     * @returns {Promise<Object>} - Connection status
     */
    const testConnection = () => {
        return apiGet({ action: 'getSettings' })
            .then(() => ({
                success: true,
                message: 'API connection successful',
                timestamp: new Date().toISOString()
            }))
            .catch(error => ({
                success: false,
                message: error.message || 'API connection failed',
                timestamp: new Date().toISOString()
            }));
    };

    /**
     * Gets the current API URL
     * @returns {string} - API endpoint URL
     */
    const getApiUrl = () => API_URL;

    /**
     * Checks if debug mode is enabled
     * @returns {boolean} - Debug mode status
     */
    const isDebugMode = () => DEBUG;

    // ============================================
    // 📤 PUBLIC API EXPORT
    // ============================================

    return {
        // Settings
        getSettings,
        updateSettings,

        // Members
        getMembers,
        getAllMembers,
        getMemberNames,
        getMemberById,
        addMember,
        updateMember,
        deleteMember,
        deactivateMember,
        activateMember,

        // Attendance
        getAttendanceByDate,
        getAttendanceByMember,
        getAttendanceRange,
        saveAttendance,
        updateAttendance,
        deleteAttendance,

        // Performance Tasks
        getPerformanceTasks,
        getPerformance, // Alias
        getTask,
        addTask,
        updateTask,
        deleteTask,
        completeTask,

        // Ratings
        getRatings,
        getRating,
        addRating,
        updateRating,
        deleteRating,

        // Dashboard
        getDashboardStats,

        // Leave
        getLeaveSummary,

        // Utilities
        testConnection,
        getApiUrl,
        isDebugMode,

        // Low-level (for advanced use)
        _get: apiGet,
        _post: apiPost
    };

})();

// Make API globally available
window.API = API;