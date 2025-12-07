/**
 * Settings Page Logic
 * Admin-only page for managing system configuration
 * Handles office hours, working days, leave policies, holidays, and system preferences
 */

(function() {
    'use strict';

    // ============================================
    // SETTINGS PAGE CONTROLLER
    // ============================================

    const SettingsPage = {
        // State
        user: null,
        settings: {},
        originalSettings: {},
        holidays: [],
        hasUnsavedChanges: false,
        auditLog: [],

        // Default settings
        defaults: {
            StartTime: '09:00',
            EndTime: '18:00',
            WorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
            PaidLeavePerMonth: 1.5,
            LateGracePeriod: 15,
            WorkingHoursPerDay: 8,
            Holidays: '',
            OvertimeEnabled: 'false',
            OvertimeRate: 1.5,
            MinimumWorkHours: 4,
            AutoPunchOut: 'false',
            AutoPunchOutTime: '23:59',
            NotifyLateArrivals: 'true',
            NotifyAbsences: 'true',
            LeaveApprovalRequired: 'true',
            MaxConsecutiveLeaveDays: 14,
            CompanyName: 'HR Management System',
            CompanyEmail: '',
            CompanyPhone: '',
            CompanyAddress: '',
            Timezone: 'Asia/Kolkata',
            DateFormat: 'DD/MM/YYYY',
            TimeFormat: '24h'
        },

        // Days of week
        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

        /**
         * Initialize the page
         */
        init: function() {
            console.log('⚙️ Initializing Settings Page...');

            // Require admin authentication
            if (!Auth.requireAuth()) {
                return;
            }

            this.user = Auth.getCurrentUser();

            if (!this.user) {
                Auth.logout();
                return;
            }

            // Check admin role
            if (!Auth.isAdmin()) {
                window.location.href = 'unauthorized.html';
                return;
            }

            // Cache elements
            this.cacheElements();

            // Bind events
            this.bindEvents();

            // Load components
            this.loadComponents();

            // Load settings
            this.loadSettings();

            // Setup before unload warning
            this.setupBeforeUnload();

            console.log('✅ Settings Page initialized');
        },

        /**
         * Cache DOM elements
         */
        cacheElements: function() {
            this.elements = {
                // Forms
                settingsForm: $('#settings-form'),
                officeHoursForm: $('#office-hours-form'),
                leaveForm: $('#leave-settings-form'),
                notificationsForm: $('#notifications-form'),
                companyForm: $('#company-settings-form'),

                // Office Hours
                startTime: $('#start-time'),
                endTime: $('#end-time'),
                lateGracePeriod: $('#late-grace-period'),
                workingHoursPerDay: $('#working-hours-per-day'),
                workingDaysContainer: $('#working-days-container'),

                // Leave Settings
                paidLeavePerMonth: $('#paid-leave-per-month'),
                maxConsecutiveDays: $('#max-consecutive-days'),
                leaveApprovalRequired: $('#leave-approval-required'),

                // Overtime
                overtimeEnabled: $('#overtime-enabled'),
                overtimeRate: $('#overtime-rate'),
                overtimeSettings: $('#overtime-settings'),

                // Auto Punch Out
                autoPunchOut: $('#auto-punch-out'),
                autoPunchOutTime: $('#auto-punch-out-time'),
                autoPunchOutSettings: $('#auto-punch-out-settings'),

                // Notifications
                notifyLateArrivals: $('#notify-late-arrivals'),
                notifyAbsences: $('#notify-absences'),

                // Company Info
                companyName: $('#company-name'),
                companyEmail: $('#company-email'),
                companyPhone: $('#company-phone'),
                companyAddress: $('#company-address'),

                // Display Preferences
                timezone: $('#timezone'),
                dateFormat: $('#date-format'),
                timeFormat: $('#time-format'),

                // Holidays
                holidaysContainer: $('#holidays-container'),
                holidaysList: $('#holidays-list'),
                addHolidayBtn: $('#add-holiday-btn'),
                holidayDate: $('#holiday-date'),
                holidayName: $('#holiday-name'),

                // Actions
                saveBtn: $('#save-settings-btn'),
                resetBtn: $('#reset-settings-btn'),
                exportBtn: $('#export-settings-btn'),
                importBtn: $('#import-settings-btn'),

                // Tabs
                tabButtons: $('.settings-tab-btn'),
                tabPanels: $('.settings-tab-panel'),

                // Audit Log
                auditLogContainer: $('#audit-log-container'),

                // Status
                unsavedIndicator: $('#unsaved-indicator'),
                lastSaved: $('#last-saved'),

                // Loading
                loadingOverlay: $('#loading-overlay'),
                saveLoading: $('#save-loading')
            };
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            const self = this;

            // Tab switching
            $(document).on('click', '.settings-tab-btn', function() {
                const tab = $(this).data('tab');
                self.switchTab(tab);
            });

            // Form input changes
            $(document).on('change input', '#settings-form input, #settings-form select, #settings-form textarea', function() {
                self.markAsUnsaved();
            });

            // Working days checkboxes
            $(document).on('change', '.working-day-checkbox', function() {
                self.updateWorkingDays();
                self.markAsUnsaved();
            });

            // Overtime toggle
            $(document).on('change', '#overtime-enabled', function() {
                self.toggleOvertimeSettings();
                self.markAsUnsaved();
            });

            // Auto punch out toggle
            $(document).on('change', '#auto-punch-out', function() {
                self.toggleAutoPunchOutSettings();
                self.markAsUnsaved();
            });

            // Add holiday
            $(document).on('click', '#add-holiday-btn', function() {
                self.addHoliday();
            });

            // Add holiday on Enter
            $(document).on('keypress', '#holiday-name', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    self.addHoliday();
                }
            });

            // Remove holiday
            $(document).on('click', '.remove-holiday-btn', function() {
                const date = $(this).data('date');
                self.removeHoliday(date);
            });

            // Save settings
            $(document).on('click', '#save-settings-btn', function() {
                self.saveSettings();
            });

            // Reset settings
            $(document).on('click', '#reset-settings-btn', function() {
                self.confirmResetSettings();
            });

            // Reset to defaults
            $(document).on('click', '#reset-defaults-btn', function() {
                self.confirmResetToDefaults();
            });

            // Export settings
            $(document).on('click', '#export-settings-btn', function() {
                self.exportSettings();
            });

            // Import settings
            $(document).on('click', '#import-settings-btn', function() {
                $('#import-file-input').click();
            });

            $(document).on('change', '#import-file-input', function(e) {
                self.importSettings(e.target.files[0]);
            });

            // Quick presets
            $(document).on('click', '.preset-btn', function() {
                const preset = $(this).data('preset');
                self.applyPreset(preset);
            });

            // Time validation
            $(document).on('change', '#start-time, #end-time', function() {
                self.validateTimeRange();
            });

            // Numeric input validation
            $(document).on('input', 'input[type="number"]', function() {
                self.validateNumericInput($(this));
            });

            // View audit log
            $(document).on('click', '#view-audit-log-btn', function() {
                self.showAuditLog();
            });

            // Test notification
            $(document).on('click', '#test-notification-btn', function() {
                self.testNotification();
            });

            // Keyboard shortcuts
            $(document).on('keydown', function(e) {
                // Ctrl/Cmd + S to save
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (self.hasUnsavedChanges) {
                        self.saveSettings();
                    }
                }
                // Escape to close modals
                if (e.key === 'Escape') {
                    self.hideModals();
                }
            });

            // Close modals
            $(document).on('click', '.close-modal, .modal-backdrop', function() {
                self.hideModals();
            });

            // Refresh audit log
            $(document).on('click', '#refresh-audit-log', function() {
                self.loadAuditLog();
            });

            // Clear cache
            $(document).on('click', '#clear-cache-btn', function() {
                self.clearCache();
            });
        },

        /**
         * Load components
         */
        loadComponents: function() {
            const self = this;

            Utils.component.load('#navbar-container', 'components/navbar.html', function() {
                self.updateNavbar();
            });

            Utils.component.load('#sidebar-container', 'components/sidebar.html', function() {
                self.updateSidebar();
            });

            Utils.component.load('#footer-container', 'components/footer.html');
        },

        /**
         * Update navbar
         */
        updateNavbar: function() {
            $('#nav-user-name').text(this.user.name || 'Admin');
            $('#nav-user-role').text('Administrator');
        },

        /**
         * Update sidebar
         */
        updateSidebar: function() {
            $('.sidebar-link').removeClass('active bg-primary-50 text-primary-600');
            $('.sidebar-link[href="settings.html"]').addClass('active bg-primary-50 text-primary-600');
            $('.admin-only').removeClass('hidden');
        },

        /**
         * Load settings from API
         */
        loadSettings: function() {
            const self = this;

            this.showLoading();

            API.settings.get()
                .then(function(response) {
                    if (response.success) {
                        self.settings = { ...self.defaults, ...response.data };
                        self.originalSettings = { ...self.settings };
                        self.parseHolidays();
                        self.renderSettings();
                        self.loadAuditLog();
                        self.updateLastSaved();
                    } else {
                        Utils.toast.error('Failed to load settings');
                        self.settings = { ...self.defaults };
                        self.renderSettings();
                    }
                })
                .catch(function(error) {
                    console.error('Settings load error:', error);
                    Utils.toast.error('Failed to load settings');
                    self.settings = { ...self.defaults };
                    self.renderSettings();
                })
                .finally(function() {
                    self.hideLoading();
                });
        },

        /**
         * Parse holidays from comma-separated string
         */
        parseHolidays: function() {
            const holidaysStr = this.settings.Holidays || '';
            this.holidays = [];

            if (holidaysStr) {
                const parts = holidaysStr.split(',');
                parts.forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed) {
                        // Format: YYYY-MM-DD:Holiday Name or just YYYY-MM-DD
                        const colonIndex = trimmed.indexOf(':');
                        if (colonIndex > 0) {
                            this.holidays.push({
                                date: trimmed.substring(0, colonIndex),
                                name: trimmed.substring(colonIndex + 1)
                            });
                        } else {
                            this.holidays.push({
                                date: trimmed,
                                name: 'Holiday'
                            });
                        }
                    }
                });
            }

            // Sort by date
            this.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        },

        /**
         * Render all settings to form
         */
        renderSettings: function() {
            const settings = this.settings;

            // Office Hours
            $('#start-time').val(settings.StartTime || '09:00');
            $('#end-time').val(settings.EndTime || '18:00');
            $('#late-grace-period').val(settings.LateGracePeriod || 15);
            $('#working-hours-per-day').val(settings.WorkingHoursPerDay || 8);

            // Working Days
            this.renderWorkingDays();

            // Leave Settings
            $('#paid-leave-per-month').val(settings.PaidLeavePerMonth || 1.5);
            $('#max-consecutive-days').val(settings.MaxConsecutiveLeaveDays || 14);
            $('#leave-approval-required').prop('checked', settings.LeaveApprovalRequired === 'true');

            // Overtime
            $('#overtime-enabled').prop('checked', settings.OvertimeEnabled === 'true');
            $('#overtime-rate').val(settings.OvertimeRate || 1.5);
            this.toggleOvertimeSettings();

            // Auto Punch Out
            $('#auto-punch-out').prop('checked', settings.AutoPunchOut === 'true');
            $('#auto-punch-out-time').val(settings.AutoPunchOutTime || '23:59');
            this.toggleAutoPunchOutSettings();

            // Minimum Work Hours
            $('#minimum-work-hours').val(settings.MinimumWorkHours || 4);

            // Notifications
            $('#notify-late-arrivals').prop('checked', settings.NotifyLateArrivals === 'true');
            $('#notify-absences').prop('checked', settings.NotifyAbsences === 'true');

            // Company Info
            $('#company-name').val(settings.CompanyName || '');
            $('#company-email').val(settings.CompanyEmail || '');
            $('#company-phone').val(settings.CompanyPhone || '');
            $('#company-address').val(settings.CompanyAddress || '');

            // Display Preferences
            $('#timezone').val(settings.Timezone || 'Asia/Kolkata');
            $('#date-format').val(settings.DateFormat || 'DD/MM/YYYY');
            $('#time-format').val(settings.TimeFormat || '24h');

            // Holidays
            this.renderHolidays();

            // Reset unsaved state
            this.hasUnsavedChanges = false;
            this.updateUnsavedIndicator();
        },

        /**
         * Render working days checkboxes
         */
        renderWorkingDays: function() {
            const container = $('#working-days-container');
            container.empty();

            const workingDaysStr = this.settings.WorkingDays || '';
            const workingDays = workingDaysStr.split(',').map(d => d.trim());

            this.daysOfWeek.forEach(day => {
                const isChecked = workingDays.includes(day);
                const shortDay = day.substring(0, 3);

                container.append(`
                    <label class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="checkbox" 
                               class="working-day-checkbox w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                               value="${day}"
                               ${isChecked ? 'checked' : ''}>
                        <span class="text-sm font-medium text-gray-700">${shortDay}</span>
                    </label>
                `);
            });
        },

        /**
         * Update working days setting from checkboxes
         */
        updateWorkingDays: function() {
            const selectedDays = [];
            $('.working-day-checkbox:checked').each(function() {
                selectedDays.push($(this).val());
            });
            this.settings.WorkingDays = selectedDays.join(',');
        },

        /**
         * Render holidays list
         */
        renderHolidays: function() {
            const container = $('#holidays-list');
            container.empty();

            if (this.holidays.length === 0) {
                container.html(`
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-calendar-alt text-3xl mb-2"></i>
                        <p>No holidays configured</p>
                        <p class="text-sm">Add holidays using the form above</p>
                    </div>
                `);
                return;
            }

            // Group by year
            const byYear = {};
            this.holidays.forEach(h => {
                const year = h.date.substring(0, 4);
                if (!byYear[year]) byYear[year] = [];
                byYear[year].push(h);
            });

            // Render by year
            Object.keys(byYear).sort().reverse().forEach(year => {
                container.append(`
                    <div class="mb-4">
                        <h4 class="text-sm font-semibold text-gray-500 mb-2">${year}</h4>
                        <div class="space-y-2" id="holidays-${year}"></div>
                    </div>
                `);

                byYear[year].forEach(holiday => {
                    const formattedDate = Utils.date.format(holiday.date, 'long');
                    const isPast = new Date(holiday.date) < new Date();

                    $(`#holidays-${year}`).append(`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg ${isPast ? 'opacity-60' : ''}">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                    <i class="fas fa-calendar-day text-primary-600"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">${Utils.string.escape(holiday.name)}</p>
                                    <p class="text-sm text-gray-500">${formattedDate}</p>
                                </div>
                            </div>
                            <button class="remove-holiday-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    data-date="${holiday.date}" title="Remove">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `);
                });
            });

            // Update count
            $('#holidays-count').text(this.holidays.length);
        },

        /**
         * Add a new holiday
         */
        addHoliday: function() {
            const date = $('#holiday-date').val();
            const name = $('#holiday-name').val().trim();

            if (!date) {
                Utils.toast.error('Please select a date');
                $('#holiday-date').focus();
                return;
            }

            if (!name) {
                Utils.toast.error('Please enter a holiday name');
                $('#holiday-name').focus();
                return;
            }

            // Check for duplicate
            const exists = this.holidays.find(h => h.date === date);
            if (exists) {
                Utils.toast.error('A holiday already exists on this date');
                return;
            }

            // Add to list
            this.holidays.push({ date, name });
            this.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Update settings
            this.updateHolidaysString();

            // Clear inputs
            $('#holiday-date').val('');
            $('#holiday-name').val('');

            // Re-render
            this.renderHolidays();
            this.markAsUnsaved();

            Utils.toast.success('Holiday added');
        },

        /**
         * Remove a holiday
         */
        removeHoliday: function(date) {
            const holiday = this.holidays.find(h => h.date === date);
            if (!holiday) return;

            Utils.modal.confirm({
                title: 'Remove Holiday',
                message: `Are you sure you want to remove "${holiday.name}" on ${Utils.date.format(date, 'long')}?`,
                confirmText: 'Remove',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: () => {
                    this.holidays = this.holidays.filter(h => h.date !== date);
                    this.updateHolidaysString();
                    this.renderHolidays();
                    this.markAsUnsaved();
                    Utils.toast.success('Holiday removed');
                }
            });
        },

        /**
         * Update holidays string from array
         */
        updateHolidaysString: function() {
            this.settings.Holidays = this.holidays
                .map(h => `${h.date}:${h.name}`)
                .join(',');
        },

        /**
         * Toggle overtime settings visibility
         */
        toggleOvertimeSettings: function() {
            const isEnabled = $('#overtime-enabled').is(':checked');
            const container = $('#overtime-settings');
            
            if (isEnabled) {
                container.removeClass('hidden').addClass('animate-fade-in');
            } else {
                container.addClass('hidden');
            }
        },

        /**
         * Toggle auto punch out settings visibility
         */
        toggleAutoPunchOutSettings: function() {
            const isEnabled = $('#auto-punch-out').is(':checked');
            const container = $('#auto-punch-out-settings');
            
            if (isEnabled) {
                container.removeClass('hidden').addClass('animate-fade-in');
            } else {
                container.addClass('hidden');
            }
        },

        /**
         * Validate time range
         */
        validateTimeRange: function() {
            const startTime = $('#start-time').val();
            const endTime = $('#end-time').val();

            if (startTime && endTime) {
                const start = this.timeToMinutes(startTime);
                const end = this.timeToMinutes(endTime);

                if (end <= start) {
                    $('#end-time').addClass('border-red-500');
                    $('#time-error').removeClass('hidden').text('End time must be after start time');
                    return false;
                } else {
                    $('#end-time').removeClass('border-red-500');
                    $('#time-error').addClass('hidden');
                    
                    // Calculate working hours
                    const hours = (end - start) / 60;
                    $('#calculated-hours').text(`${hours.toFixed(1)} hours`);
                }
            }
            return true;
        },

        /**
         * Convert time string to minutes
         */
        timeToMinutes: function(time) {
            const [hours, mins] = time.split(':').map(Number);
            return hours * 60 + mins;
        },

        /**
         * Validate numeric input
         */
        validateNumericInput: function(input) {
            const min = parseFloat(input.attr('min')) || 0;
            const max = parseFloat(input.attr('max')) || Infinity;
            let value = parseFloat(input.val()) || 0;

            if (value < min) {
                input.val(min);
            } else if (value > max) {
                input.val(max);
            }
        },

        /**
         * Apply a preset configuration
         */
        applyPreset: function(preset) {
            const presets = {
                'standard': {
                    StartTime: '09:00',
                    EndTime: '18:00',
                    WorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
                    LateGracePeriod: 15,
                    WorkingHoursPerDay: 8,
                    PaidLeavePerMonth: 1.5
                },
                'flexible': {
                    StartTime: '10:00',
                    EndTime: '19:00',
                    WorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
                    LateGracePeriod: 30,
                    WorkingHoursPerDay: 8,
                    PaidLeavePerMonth: 2
                },
                'sixday': {
                    StartTime: '09:00',
                    EndTime: '17:00',
                    WorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
                    LateGracePeriod: 15,
                    WorkingHoursPerDay: 7,
                    PaidLeavePerMonth: 1.5
                },
                'remote': {
                    StartTime: '09:00',
                    EndTime: '18:00',
                    WorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
                    LateGracePeriod: 60,
                    WorkingHoursPerDay: 8,
                    PaidLeavePerMonth: 2,
                    OvertimeEnabled: 'false',
                    AutoPunchOut: 'true',
                    AutoPunchOutTime: '22:00'
                }
            };

            if (!presets[preset]) {
                Utils.toast.error('Unknown preset');
                return;
            }

            Utils.modal.confirm({
                title: 'Apply Preset',
                message: `This will update your settings to the "${preset}" preset. Continue?`,
                confirmText: 'Apply',
                onConfirm: () => {
                    Object.assign(this.settings, presets[preset]);
                    this.renderSettings();
                    this.markAsUnsaved();
                    Utils.toast.success(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`);
                }
            });
        },

        /**
         * Switch settings tab
         */
        switchTab: function(tab) {
            // Update tab buttons
            $('.settings-tab-btn').removeClass('border-primary-500 text-primary-600 bg-primary-50')
                .addClass('border-transparent text-gray-500 hover:text-gray-700');
            $(`.settings-tab-btn[data-tab="${tab}"]`).removeClass('border-transparent text-gray-500 hover:text-gray-700')
                .addClass('border-primary-500 text-primary-600 bg-primary-50');

            // Update tab panels
            $('.settings-tab-panel').addClass('hidden');
            $(`#${tab}-panel`).removeClass('hidden').addClass('animate-fade-in');
        },

        /**
         * Mark form as having unsaved changes
         */
        markAsUnsaved: function() {
            this.hasUnsavedChanges = true;
            this.updateUnsavedIndicator();
        },

        /**
         * Update unsaved changes indicator
         */
        updateUnsavedIndicator: function() {
            if (this.hasUnsavedChanges) {
                $('#unsaved-indicator').removeClass('hidden');
                $('#save-settings-btn').addClass('animate-pulse ring-2 ring-primary-300');
            } else {
                $('#unsaved-indicator').addClass('hidden');
                $('#save-settings-btn').removeClass('animate-pulse ring-2 ring-primary-300');
            }
        },

        /**
         * Collect settings from form
         */
        collectSettings: function() {
            // Update working days
            this.updateWorkingDays();

            return {
                // Office Hours
                StartTime: $('#start-time').val(),
                EndTime: $('#end-time').val(),
                WorkingDays: this.settings.WorkingDays,
                LateGracePeriod: parseInt($('#late-grace-period').val()) || 15,
                WorkingHoursPerDay: parseInt($('#working-hours-per-day').val()) || 8,
                MinimumWorkHours: parseInt($('#minimum-work-hours').val()) || 4,

                // Leave Settings
                PaidLeavePerMonth: parseFloat($('#paid-leave-per-month').val()) || 1.5,
                MaxConsecutiveLeaveDays: parseInt($('#max-consecutive-days').val()) || 14,
                LeaveApprovalRequired: $('#leave-approval-required').is(':checked') ? 'true' : 'false',

                // Overtime
                OvertimeEnabled: $('#overtime-enabled').is(':checked') ? 'true' : 'false',
                OvertimeRate: parseFloat($('#overtime-rate').val()) || 1.5,

                // Auto Punch Out
                AutoPunchOut: $('#auto-punch-out').is(':checked') ? 'true' : 'false',
                AutoPunchOutTime: $('#auto-punch-out-time').val() || '23:59',

                // Notifications
                NotifyLateArrivals: $('#notify-late-arrivals').is(':checked') ? 'true' : 'false',
                NotifyAbsences: $('#notify-absences').is(':checked') ? 'true' : 'false',

                // Company Info
                CompanyName: $('#company-name').val().trim(),
                CompanyEmail: $('#company-email').val().trim(),
                CompanyPhone: $('#company-phone').val().trim(),
                CompanyAddress: $('#company-address').val().trim(),

                // Display Preferences
                Timezone: $('#timezone').val(),
                DateFormat: $('#date-format').val(),
                TimeFormat: $('#time-format').val(),

                // Holidays
                Holidays: this.settings.Holidays || ''
            };
        },

        /**
         * Validate settings before save
         */
        validateSettings: function(settings) {
            const errors = [];

            // Validate time range
            if (!this.validateTimeRange()) {
                errors.push('Invalid time range');
            }

            // Validate working days
            if (!settings.WorkingDays || settings.WorkingDays.split(',').length === 0) {
                errors.push('At least one working day must be selected');
            }

            // Validate numeric values
            if (settings.LateGracePeriod < 0 || settings.LateGracePeriod > 120) {
                errors.push('Late grace period must be between 0 and 120 minutes');
            }

            if (settings.PaidLeavePerMonth < 0 || settings.PaidLeavePerMonth > 5) {
                errors.push('Paid leave per month must be between 0 and 5 days');
            }

            if (settings.WorkingHoursPerDay < 1 || settings.WorkingHoursPerDay > 24) {
                errors.push('Working hours per day must be between 1 and 24');
            }

            // Validate email format
            if (settings.CompanyEmail && !this.isValidEmail(settings.CompanyEmail)) {
                errors.push('Invalid company email format');
            }

            return errors;
        },

        /**
         * Check if email is valid
         */
        isValidEmail: function(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        /**
         * Save settings
         */
        saveSettings: function() {
            const self = this;

            // Collect settings
            const settings = this.collectSettings();

            // Validate
            const errors = this.validateSettings(settings);
            if (errors.length > 0) {
                Utils.toast.error(errors[0]);
                return;
            }

            // Show loading
            const saveBtn = $('#save-settings-btn');
            saveBtn.prop('disabled', true)
                .html('<i class="fas fa-spinner fa-spin mr-2"></i>Saving...');

            API.settings.update({
                adminId: this.user.employeeId,
                settings: settings
            })
            .then(function(response) {
                if (response.success) {
                    self.settings = settings;
                    self.originalSettings = { ...settings };
                    self.hasUnsavedChanges = false;
                    self.updateUnsavedIndicator();
                    self.updateLastSaved();
                    self.loadAuditLog();
                    
                    Utils.toast.success('Settings saved successfully');
                } else {
                    Utils.toast.error(response.error || 'Failed to save settings');
                }
            })
            .catch(function(error) {
                console.error('Save settings error:', error);
                Utils.toast.error('Failed to save settings');
            })
            .finally(function() {
                saveBtn.prop('disabled', false)
                    .html('<i class="fas fa-save mr-2"></i>Save Settings');
            });
        },

        /**
         * Confirm reset settings
         */
        confirmResetSettings: function() {
            if (!this.hasUnsavedChanges) {
                Utils.toast.info('No changes to reset');
                return;
            }

            Utils.modal.confirm({
                title: 'Reset Changes',
                message: 'Are you sure you want to discard all unsaved changes?',
                confirmText: 'Reset',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: () => {
                    this.settings = { ...this.originalSettings };
                    this.parseHolidays();
                    this.renderSettings();
                    this.hasUnsavedChanges = false;
                    this.updateUnsavedIndicator();
                    Utils.toast.success('Changes discarded');
                }
            });
        },

        /**
         * Confirm reset to defaults
         */
        confirmResetToDefaults: function() {
            Utils.modal.confirm({
                title: 'Reset to Defaults',
                message: 'Are you sure you want to reset all settings to their default values? This cannot be undone.',
                confirmText: 'Reset to Defaults',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: () => {
                    this.settings = { ...this.defaults };
                    this.holidays = [];
                    this.renderSettings();
                    this.markAsUnsaved();
                    Utils.toast.success('Settings reset to defaults');
                }
            });
        },

        /**
         * Export settings to JSON file
         */
        exportSettings: function() {
            const settings = this.collectSettings();
            const data = {
                exportDate: new Date().toISOString(),
                exportedBy: this.user.employeeId,
                settings: settings
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `hr-settings-${Utils.date.format(new Date(), 'iso')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.toast.success('Settings exported');
        },

        /**
         * Import settings from JSON file
         */
        importSettings: function(file) {
            const self = this;

            if (!file) return;

            if (!file.name.endsWith('.json')) {
                Utils.toast.error('Please select a JSON file');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.settings) {
                        Utils.toast.error('Invalid settings file');
                        return;
                    }

                    Utils.modal.confirm({
                        title: 'Import Settings',
                        message: `Import settings from ${file.name}? This will overwrite your current settings.`,
                        confirmText: 'Import',
                        onConfirm: () => {
                            self.settings = { ...self.defaults, ...data.settings };
                            self.parseHolidays();
                            self.renderSettings();
                            self.markAsUnsaved();
                            Utils.toast.success('Settings imported successfully');
                        }
                    });
                } catch (error) {
                    console.error('Import error:', error);
                    Utils.toast.error('Failed to parse settings file');
                }
            };

            reader.onerror = function() {
                Utils.toast.error('Failed to read file');
            };

            reader.readAsText(file);

            // Reset file input
            $('#import-file-input').val('');
        },

        /**
         * Load audit log
         */
        loadAuditLog: function() {
            const self = this;

            API.audit.list({ action: 'SETTINGS_UPDATE', limit: 20 })
                .then(function(response) {
                    if (response.success) {
                        self.auditLog = response.data;
                        self.renderAuditLogPreview();
                    }
                })
                .catch(function(error) {
                    console.error('Audit log error:', error);
                });
        },

        /**
         * Render audit log preview
         */
        renderAuditLogPreview: function() {
            const container = $('#audit-log-preview');
            if (!container.length) return;

            container.empty();

            if (this.auditLog.length === 0) {
                container.html('<p class="text-gray-500 text-sm">No recent changes</p>');
                return;
            }

            this.auditLog.slice(0, 5).forEach(log => {
                container.append(`
                    <div class="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                        <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <i class="fas fa-cog text-primary-600 text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-900 truncate">Settings updated</p>
                            <p class="text-xs text-gray-500">
                                ${log.employeeName || 'Admin'} • ${Utils.date.timeAgo(log.Timestamp)}
                            </p>
                        </div>
                    </div>
                `);
            });
        },

        /**
         * Show full audit log modal
         */
        showAuditLog: function() {
            const container = $('#audit-log-full');
            container.empty();

            if (this.auditLog.length === 0) {
                container.html(`
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-history text-3xl mb-2"></i>
                        <p>No settings changes recorded</p>
                    </div>
                `);
            } else {
                this.auditLog.forEach(log => {
                    let details = '';
                    try {
                        const detailsObj = JSON.parse(log.Details || '{}');
                        details = Object.keys(detailsObj).slice(0, 3).join(', ');
                        if (Object.keys(detailsObj).length > 3) {
                            details += '...';
                        }
                    } catch (e) {
                        details = 'Multiple settings';
                    }

                    container.append(`
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-3">
                            <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-cog text-primary-600"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center justify-between">
                                    <p class="font-medium text-gray-900">${log.employeeName || 'Admin'}</p>
                                    <span class="text-xs text-gray-500">${Utils.date.format(log.Timestamp, 'full')}</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-1">Updated: ${details || 'Settings'}</p>
                            </div>
                        </div>
                    `);
                });
            }

            Utils.modal.show('audit-log-modal');
        },

        /**
         * Update last saved timestamp
         */
        updateLastSaved: function() {
            $('#last-saved').text(`Last saved: ${Utils.date.format(new Date(), 'time')}`);
        },

        /**
         * Test notification
         */
        testNotification: function() {
            Utils.toast.success('Test notification - Settings are working correctly!');
        },

        /**
         * Clear cache
         */
        clearCache: function() {
            Utils.modal.confirm({
                title: 'Clear Cache',
                message: 'This will clear all cached data. You may need to refresh the page after.',
                confirmText: 'Clear Cache',
                onConfirm: () => {
                    // Clear localStorage except auth
                    const authData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
                    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
                    
                    localStorage.clear();
                    
                    if (authData) localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, authData);
                    if (userData) localStorage.setItem(CONFIG.STORAGE_KEYS.USER, userData);

                    // Clear sessionStorage except auth
                    const sessionAuth = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
                    const sessionUser = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER);
                    
                    sessionStorage.clear();
                    
                    if (sessionAuth) sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, sessionAuth);
                    if (sessionUser) sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER, sessionUser);

                    Utils.toast.success('Cache cleared successfully');
                }
            });
        },

        /**
         * Setup before unload warning
         */
        setupBeforeUnload: function() {
            const self = this;

            $(window).on('beforeunload', function(e) {
                if (self.hasUnsavedChanges) {
                    const message = 'You have unsaved changes. Are you sure you want to leave?';
                    e.returnValue = message;
                    return message;
                }
            });
        },

        /**
         * Hide all modals
         */
        hideModals: function() {
            Utils.modal.hide('audit-log-modal');
        },

        /**
         * Show loading overlay
         */
        showLoading: function() {
            $('#loading-overlay').removeClass('hidden');
        },

        /**
         * Hide loading overlay
         */
        hideLoading: function() {
            $('#loading-overlay').addClass('hidden');
        },

        /**
         * Cleanup
         */
        destroy: function() {
            $(window).off('beforeunload');
        }
    };

    // ============================================
    // INITIALIZE
    // ============================================

    $(document).ready(function() {
        SettingsPage.init();
    });

    $(window).on('beforeunload', function() {
        SettingsPage.destroy();
    });

    window.SettingsPage = SettingsPage;

})();