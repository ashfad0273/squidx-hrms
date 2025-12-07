/**
 * SquidX HRM — Configuration File
 * ================================
 * Central configuration for the application.
 * This file must be loaded BEFORE api.js
 */

const CONFIG = (function() {
    'use strict';

    // ============================================
    // 🔧 CORE CONFIGURATION
    // ============================================

    /**
     * Google Apps Script Web App URL
     * This is your deployed Apps Script endpoint
     */
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfYvnaegBnKQS4Zppyhy2ZigIh5mVBERejZfJYXRuB5xteBh_dvDcCRAPfIisNGstv/exec';

    /**
     * Enable/Disable console logging for debugging
     * Set to false in production
     */
    const DEBUG_MODE = true;

    /**
     * API request timeout in milliseconds
     */
    const REQUEST_TIMEOUT = 30000; // 30 seconds

    /**
     * Retry configuration for failed requests
     */
    const RETRY_CONFIG = {
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        retryOnStatusCodes: [408, 429, 500, 502, 503, 504]
    };

    // ============================================
    // 📅 DATE & TIME CONFIGURATION
    // ============================================

    /**
     * Default date format for display
     */
    const DATE_FORMAT = 'YYYY-MM-DD';

    /**
     * Default time format for display
     */
    const TIME_FORMAT = 'HH:mm';

    /**
     * Locale for date/time formatting
     */
    const LOCALE = 'en-US';

    // ============================================
    // 🎨 UI CONFIGURATION
    // ============================================

    /**
     * Toast notification duration in milliseconds
     */
    const TOAST_DURATION = 3000;

    /**
     * Loading spinner delay before showing (prevents flashing for quick loads)
     */
    const LOADING_DELAY = 200;

    /**
     * Pagination settings
     */
    const PAGINATION = {
        defaultPageSize: 10,
        pageSizeOptions: [10, 25, 50, 100]
    };

    // ============================================
    // 📊 CHART CONFIGURATION
    // ============================================

    /**
     * Default chart colors
     */
    const CHART_COLORS = {
        primary: '#3B82F6',    // Blue
        success: '#10B981',    // Green
        warning: '#F59E0B',    // Amber
        danger: '#EF4444',     // Red
        info: '#6366F1',       // Indigo
        secondary: '#6B7280',  // Gray
        // Extended palette
        palette: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
            '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'
        ]
    };

    // ============================================
    // 🔐 STATUS CONSTANTS
    // ============================================

    /**
     * Member status options
     */
    const MEMBER_STATUS = {
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        ON_LEAVE: 'On Leave',
        TERMINATED: 'Terminated'
    };

    /**
     * Attendance status options
     */
    const ATTENDANCE_STATUS = {
        ON_TIME: 'On Time',
        LATE: 'Late',
        ABSENT: 'Absent',
        HALF_DAY: 'Half Day',
        ON_LEAVE: 'On Leave',
        HOLIDAY: 'Holiday'
    };

    /**
     * Task status options
     */
    const TASK_STATUS = {
        PENDING: 'Pending',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        OVERDUE: 'Overdue',
        CANCELLED: 'Cancelled'
    };

    // ============================================
    // 🛠️ HELPER METHODS
    // ============================================

    /**
     * Logger function that respects DEBUG_MODE
     */
    const log = (...args) => {
        if (DEBUG_MODE) {
            console.log('[SquidX]', ...args);
        }
    };

    /**
     * Error logger
     */
    const logError = (...args) => {
        if (DEBUG_MODE) {
            console.error('[SquidX ERROR]', ...args);
        }
    };

    /**
     * Warning logger
     */
    const logWarn = (...args) => {
        if (DEBUG_MODE) {
            console.warn('[SquidX WARN]', ...args);
        }
    };

    // ============================================
    // 📤 EXPORT CONFIGURATION
    // ============================================

    return {
        // Core
        SCRIPT_URL,
        DEBUG_MODE,
        REQUEST_TIMEOUT,
        RETRY_CONFIG,

        // Date/Time
        DATE_FORMAT,
        TIME_FORMAT,
        LOCALE,

        // UI
        TOAST_DURATION,
        LOADING_DELAY,
        PAGINATION,
        CHART_COLORS,

        // Constants
        MEMBER_STATUS,
        ATTENDANCE_STATUS,
        TASK_STATUS,

        // Helpers
        log,
        logError,
        logWarn
    };

})();

// Make CONFIG globally available
window.CONFIG = CONFIG;