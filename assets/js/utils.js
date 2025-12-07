/**
 * SquidX HRM — Utility Functions
 * ================================
 * Common helper functions used across all pages.
 * 
 * Dependencies:
 *   - jQuery
 *   - /config/sheet-config.js
 */

const Utils = (function() {
    'use strict';

    // ============================================
    // 📅 DATE & TIME UTILITIES
    // ============================================

    /**
     * Formats a date to YYYY-MM-DD
     * @param {Date|string} date - Date to format
     * @returns {string} - Formatted date string
     */
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Formats a date for display (e.g., "Jan 15, 2024")
     * @param {Date|string} date - Date to format
     * @returns {string} - Human-readable date string
     */
    const formatDateDisplay = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        return d.toLocaleDateString(CONFIG.LOCALE || 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    /**
     * Formats time to HH:MM
     * @param {string} time - Time string
     * @returns {string} - Formatted time string
     */
    const formatTime = (time) => {
        if (!time) return '';
        
        // If already in HH:MM format, return as-is
        if (/^\d{2}:\d{2}$/.test(time)) return time;
        
        // Try to parse as date
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        
        return time;
    };

    /**
     * Formats time for display (e.g., "9:05 AM")
     * @param {string} time - Time string in HH:MM format
     * @returns {string} - Formatted time with AM/PM
     */
    const formatTimeDisplay = (time) => {
        if (!time) return '';
        
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    };

    /**
     * Gets today's date in YYYY-MM-DD format
     * @returns {string} - Today's date
     */
    const getToday = () => formatDate(new Date());

    /**
     * Gets the day name from a date
     * @param {Date|string} date - Date
     * @returns {string} - Day name (e.g., "Mon", "Tue")
     */
    const getDayName = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    };

    /**
     * Checks if a date is a weekend
     * @param {Date|string} date - Date to check
     * @returns {boolean} - True if weekend
     */
    const isWeekend = (date) => {
        const d = new Date(date);
        return d.getDay() === 0 || d.getDay() === 6;
    };

    /**
     * Gets an array of dates for the last N days
     * @param {number} days - Number of days
     * @returns {Array<string>} - Array of date strings
     */
    const getLastNDays = (days) => {
        const dates = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(formatDate(d));
        }
        
        return dates;
    };

    // ============================================
    // 🔗 URL & NAVIGATION UTILITIES
    // ============================================

    /**
     * Gets a URL parameter by name
     * @param {string} name - Parameter name
     * @returns {string|null} - Parameter value or null
     */
    const getUrlParam = (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    };

    /**
     * Sets a URL parameter without reloading
     * @param {string} name - Parameter name
     * @param {string} value - Parameter value
     */
    const setUrlParam = (name, value) => {
        const url = new URL(window.location.href);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    };

    /**
     * Removes a URL parameter without reloading
     * @param {string} name - Parameter name
     */
    const removeUrlParam = (name) => {
        const url = new URL(window.location.href);
        url.searchParams.delete(name);
        window.history.pushState({}, '', url);
    };

    /**
     * Navigates to a page
     * @param {string} page - Page URL
     * @param {Object} [params] - Optional query parameters
     */
    const navigateTo = (page, params = {}) => {
        let url = page;
        const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        if (queryString) {
            url += `?${queryString}`;
        }
        
        window.location.href = url;
    };

    /**
     * Creates a member link URL
     * @param {string} memberId - Member ID
     * @returns {string} - Link to employee.html with memberId
     */
    const getMemberLink = (memberId) => {
        return `employee.html?memberId=${encodeURIComponent(memberId)}`;
    };

    // ============================================
    // 🎨 UI UTILITIES
    // ============================================

    /**
     * Shows a toast notification
     * @param {string} message - Toast message
     * @param {string} [type='info'] - Toast type (success, error, warning, info)
     * @param {number} [duration] - Duration in milliseconds
     */
    const showToast = (message, type = 'info', duration = null) => {
        const toastDuration = duration || CONFIG.TOAST_DURATION || 3000;
        
        // Remove existing toasts
        $('.squidx-toast').remove();
        
        // Define colors based on type
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-amber-500',
            info: 'bg-blue-500'
        };
        
        const icons = {
            success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
            error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
            warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
            info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        };
        
        const color = colors[type] || colors.info;
        const icon = icons[type] || icons.info;
        
        const toast = $(`
            <div class="squidx-toast fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg text-white ${color} transform translate-x-full transition-transform duration-300">
                <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
                    ${icon}
                </div>
                <div class="ml-3 text-sm font-medium">${escapeHtml(message)}</div>
                <button type="button" class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-white/20 inline-flex h-8 w-8 items-center justify-center" onclick="$(this).parent().remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `);
        
        $('body').append(toast);
        
        // Animate in
        setTimeout(() => {
            toast.removeClass('translate-x-full');
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            toast.addClass('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, toastDuration);
    };

    /**
     * Shows a loading spinner
     * @param {string} [selector='body'] - Container selector
     * @param {string} [message='Loading...'] - Loading message
     */
    const showLoading = (selector = 'body', message = 'Loading...') => {
        const loader = $(`
            <div class="squidx-loader absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                    <p class="mt-3 text-gray-600 font-medium">${escapeHtml(message)}</p>
                </div>
            </div>
        `);
        
        const container = $(selector);
        if (container.css('position') === 'static') {
            container.css('position', 'relative');
        }
        container.append(loader);
    };

    /**
     * Hides the loading spinner
     * @param {string} [selector='body'] - Container selector
     */
    const hideLoading = (selector = 'body') => {
        $(selector).find('.squidx-loader').remove();
    };

    /**
     * Shows a confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} [title='Confirm'] - Dialog title
     * @returns {Promise<boolean>} - Resolves true if confirmed
     */
    const showConfirm = (message, title = 'Confirm') => {
        return new Promise((resolve) => {
            const modal = $(`
                <div class="squidx-confirm-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform scale-95 opacity-0 transition-all duration-200">
                        <div class="p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(title)}</h3>
                            <p class="text-gray-600">${escapeHtml(message)}</p>
                        </div>
                        <div class="flex gap-3 p-4 bg-gray-50 rounded-b-xl">
                            <button class="confirm-cancel flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">Cancel</button>
                            <button class="confirm-ok flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">Confirm</button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            
            // Animate in
            setTimeout(() => {
                modal.find('.bg-white').removeClass('scale-95 opacity-0');
            }, 10);
            
            modal.find('.confirm-ok').on('click', () => {
                modal.remove();
                resolve(true);
            });
            
            modal.find('.confirm-cancel').on('click', () => {
                modal.remove();
                resolve(false);
            });
            
            // Close on backdrop click
            modal.on('click', (e) => {
                if (e.target === modal[0]) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    };

    // ============================================
    // 🔤 STRING UTILITIES
    // ============================================

    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * Truncates text to a specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @returns {string} - Truncated text with ellipsis
     */
    const truncate = (text, length = 50) => {
        if (!text || text.length <= length) return text || '';
        return text.substring(0, length) + '...';
    };

    /**
     * Capitalizes first letter of each word
     * @param {string} text - Text to capitalize
     * @returns {string} - Capitalized text
     */
    const capitalize = (text) => {
        if (!text) return '';
        return text.replace(/\b\w/g, char => char.toUpperCase());
    };

    /**
     * Generates initials from a name
     * @param {string} name - Full name
     * @returns {string} - Initials (max 2 characters)
     */
    const getInitials = (name) => {
        if (!name) return '';
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // ============================================
    // 📊 DATA UTILITIES
    // ============================================

    /**
     * Groups an array by a key
     * @param {Array} array - Array to group
     * @param {string} key - Key to group by
     * @returns {Object} - Grouped object
     */
    const groupBy = (array, key) => {
        return array.reduce((result, item) => {
            const group = item[key] || 'Other';
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    };

    /**
     * Sorts an array by a key
     * @param {Array} array - Array to sort
     * @param {string} key - Key to sort by
     * @param {string} [order='asc'] - Sort order (asc/desc)
     * @returns {Array} - Sorted array
     */
    const sortBy = (array, key, order = 'asc') => {
        return [...array].sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    };

    /**
     * Filters an array by search query
     * @param {Array} array - Array to filter
     * @param {string} query - Search query
     * @param {Array<string>} keys - Keys to search in
     * @returns {Array} - Filtered array
     */
    const searchFilter = (array, query, keys) => {
        if (!query) return array;
        
        const lowerQuery = query.toLowerCase();
        return array.filter(item => {
            return keys.some(key => {
                const value = item[key];
                return value && value.toString().toLowerCase().includes(lowerQuery);
            });
        });
    };

    // ============================================
    // 🖼️ IMAGE UTILITIES
    // ============================================

    /**
     * Gets a placeholder avatar URL
     * @param {string} name - Name for the avatar
     * @returns {string} - Avatar URL
     */
    const getAvatarUrl = (name) => {
        const initials = getInitials(name);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3B82F6&color=fff&size=128`;
    };

    /**
     * Handles image load errors with fallback
     * @param {HTMLImageElement} img - Image element
     * @param {string} [fallback] - Fallback URL or name for placeholder
     */
    const handleImageError = (img, fallback = 'User') => {
        img.onerror = null; // Prevent infinite loop
        img.src = getAvatarUrl(fallback);
    };

    // ============================================
    // 🏷️ STATUS BADGE UTILITIES
    // ============================================

    /**
     * Gets the badge class for an attendance status
     * @param {string} status - Attendance status
     * @returns {string} - Tailwind CSS classes
     */
    const getAttendanceStatusBadge = (status) => {
        const badges = {
            'On Time': 'bg-green-100 text-green-800',
            'Present': 'bg-green-100 text-green-800',
            'Late': 'bg-amber-100 text-amber-800',
            'Absent': 'bg-red-100 text-red-800',
            'Half Day': 'bg-orange-100 text-orange-800',
            'On Leave': 'bg-blue-100 text-blue-800',
            'Holiday': 'bg-purple-100 text-purple-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    /**
     * Gets the badge class for a task status
     * @param {string} status - Task status
     * @returns {string} - Tailwind CSS classes
     */
    const getTaskStatusBadge = (status) => {
        const badges = {
            'Pending': 'bg-gray-100 text-gray-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Completed': 'bg-green-100 text-green-800',
            'Overdue': 'bg-red-100 text-red-800',
            'Cancelled': 'bg-gray-100 text-gray-500'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    /**
     * Gets the badge class for a member status
     * @param {string} status - Member status
     * @returns {string} - Tailwind CSS classes
     */
    const getMemberStatusBadge = (status) => {
        const badges = {
            'Active': 'bg-green-100 text-green-800',
            'Inactive': 'bg-gray-100 text-gray-800',
            'On Leave': 'bg-blue-100 text-blue-800',
            'Terminated': 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    // ============================================
    // 📤 PUBLIC API EXPORT
    // ============================================

    return {
        // Date & Time
        formatDate,
        formatDateDisplay,
        formatTime,
        formatTimeDisplay,
        getToday,
        getDayName,
        isWeekend,
        getLastNDays,

        // URL & Navigation
        getUrlParam,
        setUrlParam,
        removeUrlParam,
        navigateTo,
        getMemberLink,

        // UI
        showToast,
        showLoading,
        hideLoading,
        showConfirm,

        // Strings
        escapeHtml,
        truncate,
        capitalize,
        getInitials,

        // Data
        groupBy,
        sortBy,
        searchFilter,

        // Images
        getAvatarUrl,
        handleImageError,

        // Status Badges
        getAttendanceStatusBadge,
        getTaskStatusBadge,
        getMemberStatusBadge
    };

})();

// Make Utils globally available
window.Utils = Utils;