/**
 * SquidX HRM — Settings Page Controller
 * =======================================
 * Handles all settings page functionality including:
 * - Loading settings from Google Sheets
 * - Saving settings back to Google Sheets
 * - Validating all input fields
 * - Detecting unsaved changes
 * - Resetting to defaults
 * 
 * Dependencies:
 *   - jQuery
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const SettingsPage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * Current settings object loaded from API
     */
    let settings = {};

    /**
     * Original settings snapshot for change detection
     */
    let originalSettings = {};

    /**
     * Flag to track if there are unsaved changes
     */
    let hasUnsavedChanges = false;

    /**
     * Flag to prevent double submissions
     */
    let isSaving = false;

    /**
     * Flag to track if initial load is complete
     */
    let isInitialized = false;

    // ============================================
    // 🔧 CONFIGURATION & DEFAULTS
    // ============================================

    /**
     * Default settings values
     */
    const DEFAULT_SETTINGS = {
        StartTime: '09:00',
        LateGracePeriod: '10',
        WorkingDays: 'Mon|Tue|Wed|Thu|Fri',
        WorkingHoursPerDay: '8',
        PaidLeavePerMonth: '2',
        CompanyName: 'SquidX',
        CompanyLogo: '',
        BreakDuration: '60',
        AllowHalfDay: 'Yes',
        AutoCalculateStatus: 'Yes'
    };

    /**
     * Valid day abbreviations
     */
    const VALID_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /**
     * Day name mappings for normalization
     */
    const DAY_MAPPINGS = {
        'sun': 'Sun', 'sunday': 'Sun',
        'mon': 'Mon', 'monday': 'Mon',
        'tue': 'Tue', 'tuesday': 'Tue',
        'wed': 'Wed', 'wednesday': 'Wed',
        'thu': 'Thu', 'thursday': 'Thu',
        'fri': 'Fri', 'friday': 'Fri',
        'sat': 'Sat', 'saturday': 'Sat'
    };

    // ============================================
    // 🎯 DOM SELECTORS
    // ============================================

    const SELECTORS = {
        // Form
        settingsForm: '#settingsForm',
        
        // Work Schedule Settings
        startTime: '#startTime',
        lateGracePeriod: '#lateGracePeriod',
        workingDays: '#workingDays',
        workingHoursPerDay: '#workingHoursPerDay',
        breakDuration: '#breakDuration',
        
        // Leave Settings
        paidLeavePerMonth: '#paidLeavePerMonth',
        
        // Company Settings
        companyName: '#companyName',
        companyLogo: '#companyLogo',
        logoPreview: '#logoPreview',
        
        // Feature Toggles
        allowHalfDay: '#allowHalfDay',
        autoCalculateStatus: '#autoCalculateStatus',
        
        // Day Checkboxes (alternative UI)
        dayCheckboxes: '.day-checkbox',
        
        // Buttons
        btnSaveSettings: '#btnSaveSettings',
        btnResetDefaults: '#btnResetDefaults',
        btnCancelChanges: '#btnCancelChanges',
        
        // Status Indicators
        unsavedBadge: '#unsavedBadge',
        saveStatus: '#saveStatus',
        
        // Containers
        settingsContainer: '#settingsContainer',
        loadingOverlay: '#settingsLoadingOverlay'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the settings page
     */
    const init = async () => {
        CONFIG.log('Initializing Settings Page...');
        
        try {
            // Show loading state
            showLoading(true);
            
            // Load settings from API
            await loadSettings();
            
            // Populate UI with loaded settings
            loadSettingsToUI();
            
            // Setup event listeners
            bindEventListeners();
            
            // Setup navigation warning
            setupNavigationWarning();
            
            // Mark as initialized
            isInitialized = true;
            
            // Hide loading
            showLoading(false);
            
            CONFIG.log('Settings Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Settings Page:', error);
            showLoading(false);
            Utils.showToast('Failed to load settings. Using defaults.', 'error');
            
            // Load defaults on error
            settings = { ...DEFAULT_SETTINGS };
            originalSettings = { ...DEFAULT_SETTINGS };
            loadSettingsToUI();
            bindEventListeners();
            isInitialized = true;
        }
    };

    /**
     * Load settings from API
     */
    const loadSettings = async () => {
        try {
            const response = await API.getSettings();
            
            // Merge with defaults to ensure all keys exist
            settings = {
                ...DEFAULT_SETTINGS,
                ...response
            };
            
            // Normalize working days format
            if (settings.WorkingDays) {
                settings.WorkingDays = normalizeWorkingDays(settings.WorkingDays);
            }
            
            // Store original for change detection
            originalSettings = JSON.parse(JSON.stringify(settings));
            
            CONFIG.log('Settings loaded:', settings);
            
        } catch (error) {
            CONFIG.logError('Failed to load settings:', error);
            throw error;
        }
    };

    // ============================================
    // 🎨 UI POPULATION
    // ============================================

    /**
     * Populate all UI inputs with settings values
     */
    const loadSettingsToUI = () => {
        // Work Schedule
        $(SELECTORS.startTime).val(settings.StartTime || DEFAULT_SETTINGS.StartTime);
        $(SELECTORS.lateGracePeriod).val(settings.LateGracePeriod || DEFAULT_SETTINGS.LateGracePeriod);
        $(SELECTORS.workingHoursPerDay).val(settings.WorkingHoursPerDay || DEFAULT_SETTINGS.WorkingHoursPerDay);
        $(SELECTORS.breakDuration).val(settings.BreakDuration || DEFAULT_SETTINGS.BreakDuration);
        
        // Working Days
        const workingDays = settings.WorkingDays || DEFAULT_SETTINGS.WorkingDays;
        $(SELECTORS.workingDays).val(workingDays);
        updateDayCheckboxes(workingDays);
        
        // Leave Settings
        $(SELECTORS.paidLeavePerMonth).val(settings.PaidLeavePerMonth || DEFAULT_SETTINGS.PaidLeavePerMonth);
        
        // Company Settings
        $(SELECTORS.companyName).val(settings.CompanyName || DEFAULT_SETTINGS.CompanyName);
        $(SELECTORS.companyLogo).val(settings.CompanyLogo || '');
        updateLogoPreview(settings.CompanyLogo);
        
        // Feature Toggles
        setToggleValue(SELECTORS.allowHalfDay, settings.AllowHalfDay);
        setToggleValue(SELECTORS.autoCalculateStatus, settings.AutoCalculateStatus);
        
        // Clear any error states
        clearAllErrors();
        
        // Reset unsaved changes state
        hasUnsavedChanges = false;
        updateUnsavedIndicator();
        updateSaveButton(false);
    };

    /**
     * Update day checkboxes based on working days string
     */
    const updateDayCheckboxes = (workingDaysStr) => {
        const days = workingDaysStr.split('|').map(d => d.trim());
        
        $(SELECTORS.dayCheckboxes).each(function() {
            const day = $(this).data('day') || $(this).val();
            $(this).prop('checked', days.includes(day));
        });
    };

    /**
     * Set toggle/checkbox value from Yes/No string
     */
    const setToggleValue = (selector, value) => {
        const isChecked = value === 'Yes' || value === 'true' || value === true;
        $(selector).prop('checked', isChecked);
    };

    /**
     * Get toggle value as Yes/No string
     */
    const getToggleValue = (selector) => {
        return $(selector).prop('checked') ? 'Yes' : 'No';
    };

    /**
     * Update logo preview image
     */
    const updateLogoPreview = (url) => {
        const $preview = $(SELECTORS.logoPreview);
        
        if (url && validateURL(url)) {
            $preview.attr('src', url).removeClass('hidden');
            $preview.off('error').on('error', function() {
                $(this).addClass('hidden');
            });
        } else {
            $preview.addClass('hidden');
        }
    };

    // ============================================
    // ✅ VALIDATION FUNCTIONS
    // ============================================

    /**
     * Validates time format (HH:MM in 24-hour format)
     * @param {string} str - Time string to validate
     * @returns {boolean} True if valid
     */
    const validateTime = (str) => {
        if (!str || typeof str !== 'string') return false;
        
        // Normalize the time first
        const normalized = normalizeTime(str);
        if (!normalized) return false;
        
        // Check format
        const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        return regex.test(normalized);
    };

    /**
     * Normalizes time string to HH:MM format
     * @param {string} str - Time string (e.g., "9:5" becomes "09:05")
     * @returns {string|null} Normalized time or null if invalid
     */
    const normalizeTime = (str) => {
        if (!str || typeof str !== 'string') return null;
        
        str = str.trim();
        
        // Match various formats
        const match = str.match(/^(\d{1,2}):(\d{1,2})$/);
        if (!match) return null;
        
        let hours = parseInt(match[1], 10);
        let minutes = parseInt(match[2], 10);
        
        // Validate ranges
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }
        
        // Pad with zeros
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    /**
     * Validates URL format
     * @param {string} url - URL string to validate
     * @returns {boolean} True if valid or empty
     */
    const validateURL = (url) => {
        if (!url || url.trim() === '') return true; // Empty is valid
        
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (e) {
            // Try regex fallback for basic validation
            const regex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
            return regex.test(url);
        }
    };

    /**
     * Validates working days string
     * @param {string} str - Working days string (e.g., "Mon|Tue|Wed")
     * @returns {Object} { valid: boolean, error: string|null, days: string[] }
     */
    const validateWorkingDays = (str) => {
        if (!str || typeof str !== 'string') {
            return { valid: false, error: 'Working days cannot be empty', days: [] };
        }
        
        // Split by various delimiters
        const parts = str.split(/[|,;\s]+/).filter(Boolean);
        
        if (parts.length === 0) {
            return { valid: false, error: 'At least one working day is required', days: [] };
        }
        
        const normalizedDays = [];
        const invalidDays = [];
        
        parts.forEach(part => {
            const normalized = normalizeDayName(part.trim());
            if (normalized) {
                if (!normalizedDays.includes(normalized)) {
                    normalizedDays.push(normalized);
                }
            } else {
                invalidDays.push(part);
            }
        });
        
        if (invalidDays.length > 0) {
            return {
                valid: false,
                error: `Invalid day abbreviations: ${invalidDays.join(', ')}. Use: Sun, Mon, Tue, Wed, Thu, Fri, Sat`,
                days: normalizedDays
            };
        }
        
        return { valid: true, error: null, days: normalizedDays };
    };

    /**
     * Normalizes a single day name to standard format
     * @param {string} day - Day name/abbreviation
     * @returns {string|null} Normalized day (e.g., "Mon") or null if invalid
     */
    const normalizeDayName = (day) => {
        if (!day) return null;
        
        const lower = day.toLowerCase().trim();
        
        // Direct mapping
        if (DAY_MAPPINGS[lower]) {
            return DAY_MAPPINGS[lower];
        }
        
        // Check if it's already a valid abbreviation (case-insensitive)
        const found = VALID_DAYS.find(d => d.toLowerCase() === lower);
        if (found) return found;
        
        // Check if first 3 characters match
        const prefix = lower.substring(0, 3);
        const match = VALID_DAYS.find(d => d.toLowerCase() === prefix);
        if (match) return match;
        
        return null;
    };

    /**
     * Normalizes working days string to standard format
     * @param {string} str - Working days input
     * @returns {string} Normalized string (e.g., "Mon|Tue|Wed")
     */
    const normalizeWorkingDays = (str) => {
        if (!str) return DEFAULT_SETTINGS.WorkingDays;
        
        const result = validateWorkingDays(str);
        
        if (result.days.length === 0) {
            return DEFAULT_SETTINGS.WorkingDays;
        }
        
        // Sort days in week order
        const sorted = result.days.sort((a, b) => {
            return VALID_DAYS.indexOf(a) - VALID_DAYS.indexOf(b);
        });
        
        return sorted.join('|');
    };

    /**
     * Validates numeric field
     * @param {string|number} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value (optional)
     * @returns {boolean} True if valid
     */
    const validateNumber = (value, min = 0, max = null) => {
        const num = parseInt(value, 10);
        
        if (isNaN(num)) return false;
        if (num < min) return false;
        if (max !== null && num > max) return false;
        
        return true;
    };

    /**
     * Validates all settings and returns errors
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    const validateAllSettings = () => {
        const errors = [];
        
        // Clear previous errors
        clearAllErrors();
        
        // Validate Start Time
        const startTime = $(SELECTORS.startTime).val();
        if (!validateTime(startTime)) {
            errors.push('Start Time must be in 24-hour format HH:MM (e.g., 09:00)');
            markFieldError(SELECTORS.startTime);
        }
        
        // Validate Late Grace Period
        const graceperiod = $(SELECTORS.lateGracePeriod).val();
        if (!validateNumber(graceperiod, 0, 120)) {
            errors.push('Late Grace Period must be a number between 0 and 120 minutes');
            markFieldError(SELECTORS.lateGracePeriod);
        }
        
        // Validate Working Days
        const workingDays = $(SELECTORS.workingDays).val();
        const daysValidation = validateWorkingDays(workingDays);
        if (!daysValidation.valid) {
            errors.push(daysValidation.error);
            markFieldError(SELECTORS.workingDays);
        }
        
        // Validate Working Hours Per Day
        const workHours = $(SELECTORS.workingHoursPerDay).val();
        if (!validateNumber(workHours, 1, 24)) {
            errors.push('Working Hours Per Day must be between 1 and 24');
            markFieldError(SELECTORS.workingHoursPerDay);
        }
        
        // Validate Break Duration
        const breakDuration = $(SELECTORS.breakDuration).val();
        if (breakDuration && !validateNumber(breakDuration, 0, 480)) {
            errors.push('Break Duration must be between 0 and 480 minutes');
            markFieldError(SELECTORS.breakDuration);
        }
        
        // Validate Paid Leave Per Month
        const paidLeave = $(SELECTORS.paidLeavePerMonth).val();
        if (!validateNumber(paidLeave, 0, 31)) {
            errors.push('Paid Leave Per Month must be between 0 and 31 days');
            markFieldError(SELECTORS.paidLeavePerMonth);
        }
        
        // Validate Company Logo URL
        const logoUrl = $(SELECTORS.companyLogo).val();
        if (logoUrl && !validateURL(logoUrl)) {
            errors.push('Company Logo must be a valid URL (https://...)');
            markFieldError(SELECTORS.companyLogo);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    };

    /**
     * Mark a field as having an error
     */
    const markFieldError = (selector) => {
        $(selector).addClass('border-red-500 ring-2 ring-red-200');
        $(selector).closest('.form-group, .setting-group')?.find('.error-text')?.removeClass('hidden');
    };

    /**
     * Clear error state from a field
     */
    const clearFieldError = (selector) => {
        $(selector).removeClass('border-red-500 ring-2 ring-red-200');
        $(selector).closest('.form-group, .setting-group')?.find('.error-text')?.addClass('hidden');
    };

    /**
     * Clear all error states
     */
    const clearAllErrors = () => {
        $('input, select, textarea').removeClass('border-red-500 ring-2 ring-red-200');
        $('.error-text').addClass('hidden');
    };

    // ============================================
    // 📥 COLLECT & SAVE SETTINGS
    // ============================================

    /**
     * Collect all settings from UI into an object
     * @returns {Object} Settings object ready for API
     */
    const collectSettingsFromUI = () => {
        // Get working days from checkboxes or input
        let workingDays = '';
        const $checkboxes = $(SELECTORS.dayCheckboxes).filter(':checked');
        
        if ($checkboxes.length > 0) {
            // Use checkboxes if they exist and are used
            const days = [];
            $checkboxes.each(function() {
                days.push($(this).data('day') || $(this).val());
            });
            workingDays = days.join('|');
        } else {
            // Fall back to text input
            workingDays = normalizeWorkingDays($(SELECTORS.workingDays).val());
        }
        
        // Normalize start time
        const startTime = normalizeTime($(SELECTORS.startTime).val()) || DEFAULT_SETTINGS.StartTime;
        
        return {
            StartTime: startTime,
            LateGracePeriod: $(SELECTORS.lateGracePeriod).val() || DEFAULT_SETTINGS.LateGracePeriod,
            WorkingDays: workingDays || DEFAULT_SETTINGS.WorkingDays,
            WorkingHoursPerDay: $(SELECTORS.workingHoursPerDay).val() || DEFAULT_SETTINGS.WorkingHoursPerDay,
            PaidLeavePerMonth: $(SELECTORS.paidLeavePerMonth).val() || DEFAULT_SETTINGS.PaidLeavePerMonth,
            CompanyName: $(SELECTORS.companyName).val() || DEFAULT_SETTINGS.CompanyName,
            CompanyLogo: $(SELECTORS.companyLogo).val() || '',
            BreakDuration: $(SELECTORS.breakDuration).val() || DEFAULT_SETTINGS.BreakDuration,
            AllowHalfDay: getToggleValue(SELECTORS.allowHalfDay),
            AutoCalculateStatus: getToggleValue(SELECTORS.autoCalculateStatus)
        };
    };

    /**
     * Save settings to API
     */
    const saveSettings = async () => {
        // Prevent double submission
        if (isSaving) {
            CONFIG.log('Save already in progress');
            return;
        }
        
        // Validate all fields
        const validation = validateAllSettings();
        
        if (!validation.valid) {
            // Show first error as toast
            Utils.showToast(validation.errors[0], 'error');
            return;
        }
        
        // Collect settings
        const settingsToSave = collectSettingsFromUI();
        
        try {
            isSaving = true;
            updateSaveButton(true, 'Saving...');
            
            // Call API
            await API.updateSettings(settingsToSave);
            
            // Update local state
            settings = { ...settingsToSave };
            originalSettings = JSON.parse(JSON.stringify(settings));
            
            // Reset unsaved changes
            hasUnsavedChanges = false;
            updateUnsavedIndicator();
            
            // Show success
            Utils.showToast('Settings updated successfully!', 'success');
            
            CONFIG.log('Settings saved:', settings);
            
        } catch (error) {
            CONFIG.logError('Failed to save settings:', error);
            Utils.showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(false);
        }
    };

    /**
     * Reset all settings to defaults
     */
    const resetDefaults = async () => {
        const confirmed = await Utils.showConfirm(
            'This will reset all settings to their default values. You will still need to click Save to apply the changes.',
            'Reset to Defaults?'
        );
        
        if (!confirmed) return;
        
        // Load defaults into UI
        settings = { ...DEFAULT_SETTINGS };
        loadSettingsToUI();
        
        // Mark as having unsaved changes
        hasUnsavedChanges = true;
        updateUnsavedIndicator();
        updateSaveButton(false);
        
        Utils.showToast('Defaults restored. Click Save to apply.', 'info');
    };

    /**
     * Cancel changes and reload original settings
     */
    const cancelChanges = async () => {
        if (!hasUnsavedChanges) return;
        
        const confirmed = await Utils.showConfirm(
            'Discard all unsaved changes?',
            'Cancel Changes'
        );
        
        if (!confirmed) return;
        
        // Restore original settings
        settings = JSON.parse(JSON.stringify(originalSettings));
        loadSettingsToUI();
        
        Utils.showToast('Changes discarded', 'info');
    };

    // ============================================
    // 🔔 UNSAVED CHANGES DETECTION
    // ============================================

    /**
     * Check if current settings differ from original
     * @returns {boolean} True if there are unsaved changes
     */
    const checkForChanges = () => {
        const current = collectSettingsFromUI();
        
        for (const key of Object.keys(current)) {
            const currentVal = String(current[key] || '').trim();
            const originalVal = String(originalSettings[key] || '').trim();
            
            if (currentVal !== originalVal) {
                return true;
            }
        }
        
        return false;
    };

    /**
     * Mark that there are unsaved changes
     */
    const markUnsavedChanges = () => {
        if (!isInitialized) return; // Don't mark during initial load
        
        hasUnsavedChanges = checkForChanges();
        updateUnsavedIndicator();
        updateSaveButton(false);
    };

    /**
     * Update the unsaved changes indicator
     */
    const updateUnsavedIndicator = () => {
        const $badge = $(SELECTORS.unsavedBadge);
        const $cancelBtn = $(SELECTORS.btnCancelChanges);
        
        if (hasUnsavedChanges) {
            $badge.removeClass('hidden').addClass('animate-pulse');
            $cancelBtn.prop('disabled', false).removeClass('opacity-50');
        } else {
            $badge.addClass('hidden').removeClass('animate-pulse');
            $cancelBtn.prop('disabled', true).addClass('opacity-50');
        }
    };

    /**
     * Update save button state
     */
    const updateSaveButton = (loading = false, text = null) => {
        const $btn = $(SELECTORS.btnSaveSettings);
        
        if (loading) {
            $btn.prop('disabled', true);
            $btn.html(`
                <svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${text || 'Saving...'}
            `);
        } else {
            $btn.prop('disabled', !hasUnsavedChanges);
            $btn.html(`
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Save Settings
            `);
            
            if (hasUnsavedChanges) {
                $btn.removeClass('opacity-50');
            } else {
                $btn.addClass('opacity-50');
            }
        }
    };

    /**
     * Setup navigation warning for unsaved changes
     */
    const setupNavigationWarning = () => {
        // Warn before leaving page with unsaved changes
        $(window).on('beforeunload', function(e) {
            if (hasUnsavedChanges) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                e.returnValue = message;
                return message;
            }
        });
        
        // Intercept navigation links
        $('a[href]').on('click', function(e) {
            if (hasUnsavedChanges) {
                const href = $(this).attr('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    e.preventDefault();
                    
                    Utils.showConfirm(
                        'You have unsaved changes. Leave without saving?',
                        'Unsaved Changes'
                    ).then(confirmed => {
                        if (confirmed) {
                            hasUnsavedChanges = false;
                            window.location.href = href;
                        }
                    });
                }
            }
        });
    };

    // ============================================
    // ⏳ LOADING STATE
    // ============================================

    /**
     * Show or hide loading overlay
     */
    const showLoading = (show) => {
        const $overlay = $(SELECTORS.loadingOverlay);
        const $container = $(SELECTORS.settingsContainer);
        
        if (show) {
            $overlay.removeClass('hidden');
            $container.addClass('opacity-50 pointer-events-none');
        } else {
            $overlay.addClass('hidden');
            $container.removeClass('opacity-50 pointer-events-none');
        }
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Bind all event listeners
     */
    const bindEventListeners = () => {
        // Save button
        $(SELECTORS.btnSaveSettings).off('click').on('click', function(e) {
            e.preventDefault();
            saveSettings();
        });
        
        // Reset defaults button
        $(SELECTORS.btnResetDefaults).off('click').on('click', function(e) {
            e.preventDefault();
            resetDefaults();
        });
        
        // Cancel changes button
        $(SELECTORS.btnCancelChanges).off('click').on('click', function(e) {
            e.preventDefault();
            cancelChanges();
        });
        
        // Form submission prevention
        $(SELECTORS.settingsForm).off('submit').on('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
        
        // Track changes on all inputs
        const inputSelector = `${SELECTORS.startTime}, ${SELECTORS.lateGracePeriod}, ${SELECTORS.workingDays}, 
                              ${SELECTORS.workingHoursPerDay}, ${SELECTORS.breakDuration}, ${SELECTORS.paidLeavePerMonth}, 
                              ${SELECTORS.companyName}, ${SELECTORS.companyLogo}`;
        
        $(inputSelector).off('input change').on('input change', function() {
            clearFieldError(this);
            markUnsavedChanges();
        });
        
        // Toggle changes
        $(`${SELECTORS.allowHalfDay}, ${SELECTORS.autoCalculateStatus}`).off('change').on('change', function() {
            markUnsavedChanges();
        });
        
        // Day checkboxes
        $(SELECTORS.dayCheckboxes).off('change').on('change', function() {
            // Sync with text input
            const days = [];
            $(SELECTORS.dayCheckboxes).filter(':checked').each(function() {
                days.push($(this).data('day') || $(this).val());
            });
            $(SELECTORS.workingDays).val(days.join('|'));
            markUnsavedChanges();
        });
        
        // Logo preview update
        $(SELECTORS.companyLogo).off('blur').on('blur', function() {
            const url = $(this).val();
            updateLogoPreview(url);
        });
        
        // Time input normalization on blur
        $(SELECTORS.startTime).off('blur').on('blur', function() {
            const normalized = normalizeTime($(this).val());
            if (normalized) {
                $(this).val(normalized);
            }
        });
        
        // Keyboard shortcuts
        $(document).off('keydown.settings').on('keydown.settings', function(e) {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && !isSaving) {
                    saveSettings();
                }
            }
            
            // Escape to cancel
            if (e.key === 'Escape' && hasUnsavedChanges) {
                cancelChanges();
            }
        });
    };

    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        saveSettings,
        resetDefaults,
        loadSettings,
        
        // Expose for testing
        validateTime,
        validateURL,
        validateWorkingDays,
        normalizeWorkingDays,
        normalizeTime,
        
        // State getters
        getSettings: () => ({ ...settings }),
        hasUnsavedChanges: () => hasUnsavedChanges,
        isInitialized: () => isInitialized
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    SettingsPage.init();
});