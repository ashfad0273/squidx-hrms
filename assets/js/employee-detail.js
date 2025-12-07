/**
 * Employee Detail Page Logic
 * Comprehensive employee profile view with tabs for attendance, leave, performance, and ratings
 * Admin-only page with full employee management capabilities
 */

(function() {
    'use strict';

    // ============================================
    // EMPLOYEE DETAIL PAGE CONTROLLER
    // ============================================

    const EmployeeDetailPage = {
        // State
        user: null,
        employeeId: null,
        employee: null,
        activeTab: 'overview',
        
        // Data
        attendanceData: [],
        leaveData: [],
        performanceData: [],
        ratingsData: [],
        activityLog: [],

        // Charts
        charts: {},

        // Filters
        filters: {
            attendance: {
                startDate: '',
                endDate: '',
                status: ''
            },
            leave: {
                year: new Date().getFullYear(),
                status: ''
            },
            performance: {
                status: '',
                startDate: '',
                endDate: ''
            }
        },

        // Pagination
        pagination: {
            attendance: { page: 1, perPage: 10 },
            leave: { page: 1, perPage: 10 },
            performance: { page: 1, perPage: 10 },
            ratings: { page: 1, perPage: 5 }
        },

        /**
         * Initialize the page
         */
        init: function() {
            console.log('👤 Initializing Employee Detail Page...');

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

            // Get employee ID from URL
            this.employeeId = Utils.url.getParam('id');
            
            if (!this.employeeId) {
                Utils.toast.error('No employee specified');
                window.location.href = 'admin-dashboard.html';
                return;
            }

            // Get initial tab from URL
            const tabParam = Utils.url.getParam('tab');
            if (tabParam && ['overview', 'attendance', 'leave', 'performance', 'ratings', 'activity'].includes(tabParam)) {
                this.activeTab = tabParam;
            }

            // Set default date filters
            this.setDefaultFilters();

            // Cache elements
            this.cacheElements();

            // Bind events
            this.bindEvents();

            // Load components
            this.loadComponents();

            // Load employee data
            this.loadEmployeeData();

            console.log('✅ Employee Detail Page initialized for:', this.employeeId);
        },

        /**
         * Set default date filters
         */
        setDefaultFilters: function() {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            this.filters.attendance.startDate = Utils.date.format(firstDay, 'iso');
            this.filters.attendance.endDate = Utils.date.format(lastDay, 'iso');

            this.filters.performance.startDate = Utils.date.format(new Date(now.getFullYear(), 0, 1), 'iso');
            this.filters.performance.endDate = Utils.date.format(now, 'iso');
        },

        /**
         * Cache DOM elements
         */
        cacheElements: function() {
            this.elements = {
                // Profile section
                profileCard: $('#profile-card'),
                employeeName: $('#employee-name'),
                employeeRole: $('#employee-role'),
                employeeDepartment: $('#employee-department'),
                employeeAvatar: $('#employee-avatar'),
                employeeAvatarPlaceholder: $('#employee-avatar-placeholder'),
                employeeStatus: $('#employee-status'),
                employeeId: $('#employee-id-display'),
                employeeEmail: $('#employee-email'),
                employeePhone: $('#employee-phone'),
                joinDate: $('#join-date'),
                birthday: $('#birthday'),

                // Tabs
                tabButtons: $('.tab-btn'),
                tabPanels: $('.tab-panel'),

                // Quick stats
                quickStats: $('#quick-stats'),

                // Content containers
                overviewContent: $('#overview-content'),
                attendanceContent: $('#attendance-content'),
                leaveContent: $('#leave-content'),
                performanceContent: $('#performance-content'),
                ratingsContent: $('#ratings-content'),
                activityContent: $('#activity-content'),

                // Action buttons
                editProfileBtn: $('#edit-profile-btn'),
                resetPasswordBtn: $('#reset-password-btn'),
                toggleStatusBtn: $('#toggle-status-btn'),
                deleteEmployeeBtn: $('#delete-employee-btn'),
                backBtn: $('#back-btn'),

                // Modals
                editProfileModal: $('#edit-profile-modal'),
                resetPasswordModal: $('#reset-password-modal'),
                addRatingModal: $('#add-rating-modal'),
                assignTaskModal: $('#assign-task-modal'),

                // Loading
                loadingOverlay: $('#loading-overlay'),
                contentLoading: $('#content-loading')
            };
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            const self = this;

            // Tab switching
            $(document).on('click', '.tab-btn', function() {
                const tab = $(this).data('tab');
                self.switchTab(tab);
            });

            // Back button
            $(document).on('click', '#back-btn', function() {
                window.history.back();
            });

            // Edit profile
            $(document).on('click', '#edit-profile-btn', function() {
                self.showEditProfileModal();
            });

            // Edit profile form submit
            $(document).on('submit', '#edit-profile-form', function(e) {
                e.preventDefault();
                self.saveProfile();
            });

            // Reset password
            $(document).on('click', '#reset-password-btn', function() {
                self.showResetPasswordModal();
            });

            // Reset password form submit
            $(document).on('submit', '#reset-password-form', function(e) {
                e.preventDefault();
                self.processResetPassword();
            });

            // Toggle employee status (activate/deactivate)
            $(document).on('click', '#toggle-status-btn', function() {
                self.confirmToggleStatus();
            });

            // Delete employee
            $(document).on('click', '#delete-employee-btn', function() {
                self.confirmDeleteEmployee();
            });

            // Attendance filters
            $(document).on('change', '#att-start-date, #att-end-date, #att-status-filter', function() {
                self.filters.attendance.startDate = $('#att-start-date').val();
                self.filters.attendance.endDate = $('#att-end-date').val();
                self.filters.attendance.status = $('#att-status-filter').val();
                self.loadAttendanceData();
            });

            // Attendance quick filters
            $(document).on('click', '.att-quick-filter', function() {
                const range = $(this).data('range');
                self.applyAttendanceQuickFilter(range);
            });

            // Leave filters
            $(document).on('change', '#leave-year-filter, #leave-status-filter', function() {
                self.filters.leave.year = $('#leave-year-filter').val();
                self.filters.leave.status = $('#leave-status-filter').val();
                self.loadLeaveData();
            });

            // Performance filters
            $(document).on('change', '#perf-status-filter', function() {
                self.filters.performance.status = $(this).val();
                self.loadPerformanceData();
            });

            // Approve/Reject leave
            $(document).on('click', '.approve-leave-btn', function() {
                const requestId = $(this).data('request-id');
                self.approveLeave(requestId);
            });

            $(document).on('click', '.reject-leave-btn', function() {
                const requestId = $(this).data('request-id');
                self.showRejectLeaveModal(requestId);
            });

            // Add rating button
            $(document).on('click', '#add-rating-btn', function() {
                self.showAddRatingModal();
            });

            // Add rating form submit
            $(document).on('submit', '#add-rating-form', function(e) {
                e.preventDefault();
                self.saveRating();
            });

            // Assign task button
            $(document).on('click', '#assign-task-btn', function() {
                self.showAssignTaskModal();
            });

            // Assign task form submit
            $(document).on('submit', '#assign-task-form', function(e) {
                e.preventDefault();
                self.saveTask();
            });

            // Update task score
            $(document).on('click', '.update-score-btn', function() {
                const taskId = $(this).data('task-id');
                self.showUpdateScoreModal(taskId);
            });

            // Export buttons
            $(document).on('click', '#export-attendance-btn', function() {
                self.exportAttendance();
            });

            $(document).on('click', '#export-performance-btn', function() {
                self.exportPerformance();
            });

            // Print report
            $(document).on('click', '#print-report-btn', function() {
                self.printEmployeeReport();
            });

            // Pagination
            $(document).on('click', '.detail-page-btn:not([disabled])', function() {
                const page = $(this).data('page');
                const type = $(this).data('type');
                self.goToPage(type, page);
            });

            // Star rating input in modals
            $(document).on('click', '.star-input i', function() {
                const container = $(this).closest('.star-input');
                const value = $(this).data('value');
                const inputName = container.data('input');
                
                self.setStarRating(container, value);
                $(`#${inputName}`).val(value);
            });

            $(document).on('mouseenter', '.star-input i', function() {
                const container = $(this).closest('.star-input');
                const value = $(this).data('value');
                self.highlightStars(container, value);
            });

            $(document).on('mouseleave', '.star-input', function() {
                const currentValue = parseInt($(this).data('current')) || 0;
                self.setStarRating($(this), currentValue);
            });

            // Close modals
            $(document).on('click', '.close-modal, .modal-backdrop', function() {
                self.hideModals();
            });

            // Escape key
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideModals();
                }
            });

            // Refresh data
            $(document).on('click', '#refresh-btn', function() {
                self.refreshAllData();
            });

            // Send email
            $(document).on('click', '#send-email-btn', function() {
                if (self.employee && self.employee.Email) {
                    window.location.href = `mailto:${self.employee.Email}`;
                }
            });

            // Call phone
            $(document).on('click', '#call-phone-btn', function() {
                if (self.employee && self.employee.Phone) {
                    window.location.href = `tel:${self.employee.Phone}`;
                }
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
            // No specific sidebar item for employee detail
            $('.admin-only').removeClass('hidden');
        },

        /**
         * Load employee data
         */
        loadEmployeeData: function() {
            const self = this;

            this.showLoading();

            API.employees.get(this.employeeId)
                .then(function(response) {
                    if (response.success) {
                        self.employee = response.data;
                        self.renderProfile();
                        self.loadTabData();
                        self.updateBreadcrumb();
                    } else {
                        Utils.toast.error('Employee not found');
                        window.location.href = 'admin-dashboard.html';
                    }
                })
                .catch(function(error) {
                    console.error('Error loading employee:', error);
                    Utils.toast.error('Failed to load employee data');
                })
                .finally(function() {
                    self.hideLoading();
                });
        },

        /**
         * Render employee profile
         */
        renderProfile: function() {
            const emp = this.employee;
            if (!emp) return;

            // Basic info
            $('#employee-name').text(emp.Name || 'Unknown');
            $('#employee-role').text(emp.Role || 'Employee');
            $('#employee-department').text(emp.Department || 'N/A');
            $('#employee-id-display').text(emp.EmployeeID);
            $('#employee-email').text(emp.Email || 'Not provided');
            $('#employee-phone').text(emp.Phone || 'Not provided');
            $('#join-date').text(emp.JoinDate ? Utils.date.format(emp.JoinDate, 'long') : 'N/A');
            $('#birthday').text(emp.Birthday ? Utils.date.format(emp.Birthday, 'long') : 'N/A');

            // Avatar
            if (emp.PhotoURL) {
                $('#employee-avatar').attr('src', emp.PhotoURL).removeClass('hidden');
                $('#employee-avatar-placeholder').addClass('hidden');
            } else {
                $('#employee-avatar').addClass('hidden');
                $('#employee-avatar-placeholder')
                    .text(Utils.string.initials(emp.Name || 'U'))
                    .removeClass('hidden');
            }

            // Status badge
            const isActive = emp.Status !== 'Inactive';
            $('#employee-status')
                .text(isActive ? 'Active' : 'Inactive')
                .removeClass('bg-green-100 text-green-800 bg-red-100 text-red-800')
                .addClass(isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');

            // Toggle status button text
            $('#toggle-status-btn')
                .html(isActive 
                    ? '<i class="fas fa-user-slash mr-2"></i>Deactivate' 
                    : '<i class="fas fa-user-check mr-2"></i>Activate')
                .removeClass('text-red-600 hover:bg-red-50 text-green-600 hover:bg-green-50')
                .addClass(isActive 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-green-600 hover:bg-green-50');

            // Calculate tenure
            if (emp.JoinDate) {
                const joinDate = new Date(emp.JoinDate);
                const now = new Date();
                const years = now.getFullYear() - joinDate.getFullYear();
                const months = now.getMonth() - joinDate.getMonth();
                
                let tenure = '';
                if (years > 0) tenure += `${years} year${years > 1 ? 's' : ''} `;
                if (months > 0 || years === 0) tenure += `${Math.abs(months)} month${Math.abs(months) !== 1 ? 's' : ''}`;
                
                $('#employee-tenure').text(tenure.trim() || 'Less than a month');
            }

            // Set page title
            document.title = `${emp.Name} - Employee Details | HR Management`;
        },

        /**
         * Update breadcrumb
         */
        updateBreadcrumb: function() {
            $('#breadcrumb-employee-name').text(this.employee?.Name || 'Employee');
        },

        /**
         * Load data for current tab
         */
        loadTabData: function() {
            // Load all data initially for overview
            this.loadQuickStats();
            
            // Load specific tab data
            switch (this.activeTab) {
                case 'overview':
                    this.loadOverviewData();
                    break;
                case 'attendance':
                    this.loadAttendanceData();
                    break;
                case 'leave':
                    this.loadLeaveData();
                    break;
                case 'performance':
                    this.loadPerformanceData();
                    break;
                case 'ratings':
                    this.loadRatingsData();
                    break;
                case 'activity':
                    this.loadActivityLog();
                    break;
            }

            // Activate correct tab
            this.activateTab(this.activeTab);
        },

        /**
         * Switch tab
         */
        switchTab: function(tab) {
            this.activeTab = tab;
            this.activateTab(tab);

            // Update URL without reload
            Utils.url.setParam('tab', tab);

            // Load tab data if not already loaded
            this.loadTabSpecificData(tab);
        },

        /**
         * Activate tab UI
         */
        activateTab: function(tab) {
            // Update tab buttons
            $('.tab-btn').removeClass('border-primary-500 text-primary-600').addClass('border-transparent text-gray-500');
            $(`.tab-btn[data-tab="${tab}"]`).removeClass('border-transparent text-gray-500').addClass('border-primary-500 text-primary-600');

            // Update tab panels
            $('.tab-panel').addClass('hidden');
            $(`#${tab}-panel`).removeClass('hidden');
        },

        /**
         * Load tab specific data
         */
        loadTabSpecificData: function(tab) {
            switch (tab) {
                case 'overview':
                    this.loadOverviewData();
                    break;
                case 'attendance':
                    if (this.attendanceData.length === 0) this.loadAttendanceData();
                    break;
                case 'leave':
                    if (this.leaveData.length === 0) this.loadLeaveData();
                    break;
                case 'performance':
                    if (this.performanceData.length === 0) this.loadPerformanceData();
                    break;
                case 'ratings':
                    if (this.ratingsData.length === 0) this.loadRatingsData();
                    break;
                case 'activity':
                    if (this.activityLog.length === 0) this.loadActivityLog();
                    break;
            }
        },

        /**
         * Load quick stats
         */
        loadQuickStats: function() {
            const self = this;

            // Load attendance summary
            API.attendance.summary({ employeeId: this.employeeId })
                .then(function(response) {
                    if (response.success) {
                        self.renderQuickStats(response.data);
                    }
                });

            // Load leave balance
            API.leave.balance({ employeeId: this.employeeId })
                .then(function(response) {
                    if (response.success) {
                        self.renderLeaveQuickStat(response.data);
                    }
                });
        },

        /**
         * Render quick stats
         */
        renderQuickStats: function(stats) {
            $('#stat-attendance-rate').text((stats.attendanceRate || 0) + '%');
            $('#stat-punctuality-rate').text((stats.punctualityRate || 0) + '%');
            $('#stat-total-hours').text((stats.totalHours || 0).toFixed(1) + ' hrs');
            $('#stat-present-days').text(stats.totalDays || 0);
            $('#stat-late-days').text(stats.lateDays || 0);
            $('#stat-absent-days').text(stats.absentDays || 0);
        },

        /**
         * Render leave quick stat
         */
        renderLeaveQuickStat: function(balance) {
            $('#stat-leave-remaining').text(balance.remaining || 0);
            $('#stat-leave-used').text(balance.used || 0);
            $('#stat-leave-total').text(balance.total || 0);
        },

        /**
         * Load overview data
         */
        loadOverviewData: function() {
            const self = this;

            // Load recent attendance
            API.attendance.employee({ 
                employeeId: this.employeeId, 
                limit: 5 
            })
            .then(function(response) {
                if (response.success) {
                    self.renderRecentAttendance(response.data);
                }
            });

            // Load recent performance
            API.performance.employee({ employeeId: this.employeeId })
                .then(function(response) {
                    if (response.success) {
                        self.renderOverviewPerformance(response.data);
                    }
                });

            // Load latest rating
            API.ratings.employee({ employeeId: this.employeeId })
                .then(function(response) {
                    if (response.success) {
                        self.renderOverviewRating(response.data);
                    }
                });
        },

        /**
         * Render recent attendance in overview
         */
        renderRecentAttendance: function(data) {
            const container = $('#recent-attendance-list');
            container.empty();

            if (!data || data.length === 0) {
                container.html('<p class="text-gray-500 text-center py-4">No recent attendance records</p>');
                return;
            }

            data.slice(0, 5).forEach(function(record) {
                const statusClass = record.LoginStatus === 'Late' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800';

                container.append(`
                    <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                            <p class="font-medium text-gray-900">${Utils.date.format(record.Date, 'short')}</p>
                            <p class="text-sm text-gray-500">${record.PunchIn || '--:--'} - ${record.PunchOut || '--:--'}</p>
                        </div>
                        <div class="text-right">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                                ${record.LoginStatus || '-'}
                            </span>
                            <p class="text-sm text-gray-500 mt-1">${(record.HoursWorked || 0).toFixed(1)} hrs</p>
                        </div>
                    </div>
                `);
            });
        },

        /**
         * Render overview performance
         */
        renderOverviewPerformance: function(data) {
            if (!data || !data.statistics) return;

            const stats = data.statistics;

            $('#overview-tasks-completed').text(stats.completed || 0);
            $('#overview-tasks-pending').text(stats.pending || 0);
            $('#overview-completion-rate').text((stats.completionRate || 0) + '%');

            // Render progress ring
            const completionRate = stats.completionRate || 0;
            const circumference = 2 * Math.PI * 40;
            const offset = circumference - (completionRate / 100) * circumference;
            
            $('#completion-ring-progress')
                .attr('stroke-dasharray', circumference)
                .attr('stroke-dashoffset', offset);
        },

        /**
         * Render overview rating
         */
        renderOverviewRating: function(data) {
            const container = $('#overview-rating');
            
            if (!data || !data.latest) {
                container.html('<p class="text-gray-500 text-center">No ratings yet</p>');
                return;
            }

            const rating = data.latest;
            const avg = ((rating.Quality + rating.Punctuality + rating.Reliability + rating.Deadlines) / 4).toFixed(1);

            container.html(`
                <div class="text-center">
                    <div class="text-4xl font-bold text-primary-600">${avg}</div>
                    <div class="flex justify-center mt-2">
                        ${this.generateStarsHTML(parseFloat(avg))}
                    </div>
                    <p class="text-sm text-gray-500 mt-2">Period: ${this.formatPeriod(rating.Period)}</p>
                </div>
                <div class="mt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Quality</span>
                        <span class="font-medium">${rating.Quality}/5</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Punctuality</span>
                        <span class="font-medium">${rating.Punctuality}/5</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Reliability</span>
                        <span class="font-medium">${rating.Reliability}/5</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Deadlines</span>
                        <span class="font-medium">${rating.Deadlines}/5</span>
                    </div>
                </div>
            `);
        },

        /**
         * Load attendance data
         */
        loadAttendanceData: function() {
            const self = this;

            this.showContentLoading();

            const params = {
                employeeId: this.employeeId,
                startDate: this.filters.attendance.startDate,
                endDate: this.filters.attendance.endDate
            };

            if (this.filters.attendance.status) {
                params.loginStatus = this.filters.attendance.status;
            }

            API.attendance.list(params)
                .then(function(response) {
                    if (response.success) {
                        self.attendanceData = response.data;
                        self.renderAttendanceTable();
                        self.renderAttendanceStats();
                        self.initAttendanceChart();
                    }
                })
                .catch(function(error) {
                    console.error('Error loading attendance:', error);
                    Utils.toast.error('Failed to load attendance data');
                })
                .finally(function() {
                    self.hideContentLoading();
                });
        },

        /**
         * Render attendance table
         */
        renderAttendanceTable: function() {
            const container = $('#attendance-table-body');
            container.empty();

            const { page, perPage } = this.pagination.attendance;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.attendanceData.slice(start, end);

            if (pageData.length === 0) {
                container.html(`
                    <tr>
                        <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                            <i class="fas fa-calendar-times text-3xl mb-2"></i>
                            <p>No attendance records found for the selected period</p>
                        </td>
                    </tr>
                `);
                this.renderPagination('attendance', 0);
                return;
            }

            pageData.forEach(function(record, index) {
                const statusClass = record.LoginStatus === 'Late' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800';

                const hoursWorked = parseFloat(record.HoursWorked) || 0;

                container.append(`
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${start + index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${Utils.date.format(record.Date, 'short')}</div>
                            <div class="text-xs text-gray-500">${Utils.date.format(record.Date, 'weekday')}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <i class="fas fa-sign-in-alt text-green-500 mr-1"></i>
                            ${record.PunchIn || '--:--'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <i class="fas fa-sign-out-alt text-orange-500 mr-1"></i>
                            ${record.PunchOut || '--:--'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                                ${record.LoginStatus || '-'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${hoursWorked.toFixed(2)} hrs
                        </td>
                    </tr>
                `);
            });

            this.renderPagination('attendance', this.attendanceData.length);
        },

        /**
         * Render attendance stats
         */
        renderAttendanceStats: function() {
            const data = this.attendanceData;

            const total = data.length;
            const onTime = data.filter(r => r.LoginStatus === 'OnTime').length;
            const late = data.filter(r => r.LoginStatus === 'Late').length;
            const totalHours = data.reduce((sum, r) => sum + (parseFloat(r.HoursWorked) || 0), 0);

            $('#att-total-days').text(total);
            $('#att-ontime-days').text(onTime);
            $('#att-late-days').text(late);
            $('#att-total-hours').text(totalHours.toFixed(1));
            $('#att-avg-hours').text(total > 0 ? (totalHours / total).toFixed(1) : '0');
            $('#att-punctuality-rate').text(total > 0 ? Math.round((onTime / total) * 100) + '%' : '0%');
        },

        /**
         * Initialize attendance chart
         */
        initAttendanceChart: function() {
            const ctx = document.getElementById('attendance-detail-chart');
            if (!ctx) return;

            if (this.charts.attendance) {
                this.charts.attendance.destroy();
            }

            // Group by week
            const weekData = {};
            this.attendanceData.forEach(record => {
                const date = new Date(record.Date);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = Utils.date.format(weekStart, 'iso');

                if (!weekData[weekKey]) {
                    weekData[weekKey] = { hours: 0, count: 0 };
                }
                weekData[weekKey].hours += parseFloat(record.HoursWorked) || 0;
                weekData[weekKey].count++;
            });

            const labels = Object.keys(weekData).sort().slice(-8);
            const hoursData = labels.map(week => weekData[week]?.hours || 0);

            this.charts.attendance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(w => 'Week of ' + Utils.date.format(w, 'short')),
                    datasets: [{
                        label: 'Hours Worked',
                        data: hoursData,
                        backgroundColor: '#3B82F6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },

        /**
         * Apply attendance quick filter
         */
        applyAttendanceQuickFilter: function(range) {
            const now = new Date();
            let startDate, endDate;

            switch (range) {
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    startDate = Utils.date.format(weekStart, 'iso');
                    endDate = Utils.date.format(now, 'iso');
                    break;
                case 'month':
                    startDate = Utils.date.format(new Date(now.getFullYear(), now.getMonth(), 1), 'iso');
                    endDate = Utils.date.format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'iso');
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = Utils.date.format(new Date(now.getFullYear(), quarter * 3, 1), 'iso');
                    endDate = Utils.date.format(new Date(now.getFullYear(), quarter * 3 + 3, 0), 'iso');
                    break;
                case 'year':
                    startDate = Utils.date.format(new Date(now.getFullYear(), 0, 1), 'iso');
                    endDate = Utils.date.format(now, 'iso');
                    break;
            }

            this.filters.attendance.startDate = startDate;
            this.filters.attendance.endDate = endDate;
            $('#att-start-date').val(startDate);
            $('#att-end-date').val(endDate);

            this.loadAttendanceData();
        },

        /**
         * Load leave data
         */
        loadLeaveData: function() {
            const self = this;

            this.showContentLoading();

            API.leave.employee({ 
                employeeId: this.employeeId,
                year: this.filters.leave.year,
                status: this.filters.leave.status || undefined
            })
            .then(function(response) {
                if (response.success) {
                    self.leaveData = response.data.leaves || [];
                    self.leaveBalance = response.data.balance;
                    self.renderLeaveTable();
                    self.renderLeaveStats();
                }
            })
            .catch(function(error) {
                console.error('Error loading leave:', error);
            })
            .finally(function() {
                self.hideContentLoading();
            });
        },

        /**
         * Render leave table
         */
        renderLeaveTable: function() {
            const container = $('#leave-table-body');
            container.empty();

            const { page, perPage } = this.pagination.leave;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.leaveData.slice(start, end);

            if (pageData.length === 0) {
                container.html(`
                    <tr>
                        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                            <i class="fas fa-calendar-check text-3xl mb-2"></i>
                            <p>No leave records found</p>
                        </td>
                    </tr>
                `);
                this.renderPagination('leave', 0);
                return;
            }

            const self = this;

            pageData.forEach(function(leave, index) {
                const statusColors = {
                    'Approved': 'bg-green-100 text-green-800',
                    'Pending': 'bg-yellow-100 text-yellow-800',
                    'Rejected': 'bg-red-100 text-red-800',
                    'Cancelled': 'bg-gray-100 text-gray-800'
                };

                const typeColors = {
                    'Paid': 'bg-blue-100 text-blue-800',
                    'Unpaid': 'bg-gray-100 text-gray-800',
                    'Sick': 'bg-red-100 text-red-800',
                    'Emergency': 'bg-purple-100 text-purple-800'
                };

                container.append(`
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${start + index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${typeColors[leave.Type] || 'bg-gray-100 text-gray-800'}">
                                ${leave.Type}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Utils.date.format(leave.StartDate, 'short')}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Utils.date.format(leave.EndDate, 'short')}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${leave.TotalDays || 1} day${leave.TotalDays > 1 ? 's' : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColors[leave.Status] || 'bg-gray-100 text-gray-800'}">
                                ${leave.Status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            ${leave.Status === 'Pending' ? `
                                <button class="approve-leave-btn p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        data-request-id="${leave.RequestID}" title="Approve">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="reject-leave-btn p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        data-request-id="${leave.RequestID}" title="Reject">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : `
                                <span class="text-xs text-gray-400">
                                    ${leave.ApprovedBy ? 'by ' + leave.ApprovedBy : '-'}
                                </span>
                            `}
                        </td>
                    </tr>
                `);
            });

            this.renderPagination('leave', this.leaveData.length);
        },

        /**
         * Render leave stats
         */
        renderLeaveStats: function() {
            const balance = this.leaveBalance || {};

            $('#leave-total').text(balance.total || 0);
            $('#leave-used').text(balance.used || 0);
            $('#leave-remaining').text(balance.remaining || 0);
            $('#leave-pending').text(balance.pending || 0);

            // Progress bar
            const usedPercent = balance.total > 0 ? (balance.used / balance.total) * 100 : 0;
            $('#leave-progress-bar').css('width', usedPercent + '%');
        },

        /**
         * Approve leave
         */
        approveLeave: function(requestId) {
            const self = this;

            Utils.modal.confirm({
                title: 'Approve Leave',
                message: 'Are you sure you want to approve this leave request?',
                confirmText: 'Approve',
                confirmClass: 'bg-green-600 hover:bg-green-700',
                onConfirm: function() {
                    API.leave.approve({
                        adminId: self.user.employeeId,
                        requestId: requestId
                    })
                    .then(function(response) {
                        if (response.success) {
                            Utils.toast.success('Leave approved');
                            self.loadLeaveData();
                        } else {
                            Utils.toast.error(response.error || 'Failed to approve leave');
                        }
                    })
                    .catch(function(error) {
                        Utils.toast.error(error.message || 'Failed to approve leave');
                    });
                }
            });
        },

        /**
         * Show reject leave modal
         */
        showRejectLeaveModal: function(requestId) {
            $('#reject-request-id').val(requestId);
            $('#rejection-reason').val('');
            Utils.modal.show('reject-leave-modal');
        },

        /**
         * Load performance data
         */
        loadPerformanceData: function() {
            const self = this;

            this.showContentLoading();

            API.performance.employee({ 
                employeeId: this.employeeId,
                status: this.filters.performance.status || undefined
            })
            .then(function(response) {
                if (response.success) {
                    self.performanceData = response.data.tasks || [];
                    self.performanceStats = response.data.statistics;
                    self.renderPerformanceTable();
                    self.renderPerformanceStats();
                    self.initPerformanceChart();
                }
            })
            .catch(function(error) {
                console.error('Error loading performance:', error);
            })
            .finally(function() {
                self.hideContentLoading();
            });
        },

        /**
         * Render performance table
         */
        renderPerformanceTable: function() {
            const container = $('#performance-table-body');
            container.empty();

            const { page, perPage } = this.pagination.performance;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.performanceData.slice(start, end);

            if (pageData.length === 0) {
                container.html(`
                    <tr>
                        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                            <i class="fas fa-tasks text-3xl mb-2"></i>
                            <p>No tasks found</p>
                        </td>
                    </tr>
                `);
                this.renderPagination('performance', 0);
                return;
            }

            pageData.forEach(function(task, index) {
                const statusColors = {
                    'Completed': 'bg-green-100 text-green-800',
                    'Pending': 'bg-yellow-100 text-yellow-800',
                    'In Progress': 'bg-blue-100 text-blue-800',
                    'Overdue': 'bg-red-100 text-red-800'
                };

                const isOverdue = task.isOverdue || (task.Status !== 'Completed' && new Date(task.DueDate) < new Date());
                const displayStatus = isOverdue && task.Status !== 'Completed' ? 'Overdue' : task.Status;

                container.append(`
                    <tr class="hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${start + index + 1}</td>
                        <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900">${Utils.string.escape(task.Task)}</div>
                            ${task.Description ? `<div class="text-xs text-gray-500 truncate max-w-xs">${Utils.string.escape(task.Description)}</div>` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${Utils.date.format(task.DueDate, 'short')}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${task.CompletedDate ? Utils.date.format(task.CompletedDate, 'short') : '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColors[displayStatus] || 'bg-gray-100 text-gray-800'}">
                                ${displayStatus}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${task.Score ? task.Score + '/10' : '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            <button class="update-score-btn p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    data-task-id="${task.TaskID}" title="Update Score">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });

            this.renderPagination('performance', this.performanceData.length);
        },

        /**
         * Render performance stats
         */
        renderPerformanceStats: function() {
            const stats = this.performanceStats || {};

            $('#perf-total-tasks').text(stats.total || 0);
            $('#perf-completed').text(stats.completed || 0);
            $('#perf-pending').text(stats.pending || 0);
            $('#perf-overdue').text(stats.overdue || 0);
            $('#perf-completion-rate').text((stats.completionRate || 0) + '%');
            $('#perf-ontime-rate').text((stats.onTimeRate || 0) + '%');
            $('#perf-avg-score').text((stats.averageScore || 0).toFixed(1));
        },

        /**
         * Initialize performance chart
         */
        initPerformanceChart: function() {
            const ctx = document.getElementById('performance-detail-chart');
            if (!ctx) return;

            if (this.charts.performance) {
                this.charts.performance.destroy();
            }

            const stats = this.performanceStats || {};

            this.charts.performance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Pending', 'Overdue'],
                    datasets: [{
                        data: [stats.completed || 0, stats.pending || 0, stats.overdue || 0],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        /**
         * Show assign task modal
         */
        showAssignTaskModal: function() {
            $('#assign-task-form')[0].reset();
            $('#task-due-date').attr('min', Utils.date.format(new Date(), 'iso'));
            Utils.modal.show('assign-task-modal');
        },

        /**
         * Save task
         */
        saveTask: function() {
            const self = this;

            const data = {
                adminId: this.user.employeeId,
                employeeId: this.employeeId,
                task: $('#task-name').val().trim(),
                description: $('#task-description').val().trim(),
                dueDate: $('#task-due-date').val(),
                notes: $('#task-notes').val().trim()
            };

            if (!data.task || !data.dueDate) {
                Utils.toast.error('Task name and due date are required');
                return;
            }

            const submitBtn = $('#assign-task-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Assigning...');

            API.performance.assign(data)
                .then(function(response) {
                    if (response.success) {
                        Utils.toast.success('Task assigned successfully');
                        Utils.modal.hide('assign-task-modal');
                        self.loadPerformanceData();
                    } else {
                        Utils.toast.error(response.error || 'Failed to assign task');
                    }
                })
                .catch(function(error) {
                    Utils.toast.error(error.message || 'Failed to assign task');
                })
                .finally(function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-plus mr-2"></i>Assign Task');
                });
        },

        /**
         * Load ratings data
         */
        loadRatingsData: function() {
            const self = this;

            this.showContentLoading();

            API.ratings.employee({ employeeId: this.employeeId })
                .then(function(response) {
                    if (response.success) {
                        self.ratingsData = response.data.ratings || [];
                        self.latestRating = response.data.latest;
                        self.ratingsAverages = response.data.averages;
                        self.renderRatingsSection();
                        self.initRatingsChart();
                    }
                })
                .catch(function(error) {
                    console.error('Error loading ratings:', error);
                })
                .finally(function() {
                    self.hideContentLoading();
                });
        },

        /**
         * Render ratings section
         */
        renderRatingsSection: function() {
            // Render averages
            if (this.ratingsAverages) {
                const avg = this.ratingsAverages;
                const overall = ((avg.quality + avg.punctuality + avg.reliability + avg.deadlines) / 4).toFixed(1);

                $('#ratings-overall').text(overall);
                $('#ratings-overall-stars').html(this.generateStarsHTML(parseFloat(overall)));
                
                $('#ratings-quality').text(avg.quality.toFixed(1));
                $('#ratings-punctuality').text(avg.punctuality.toFixed(1));
                $('#ratings-reliability').text(avg.reliability.toFixed(1));
                $('#ratings-deadlines').text(avg.deadlines.toFixed(1));
            }

            // Render ratings list
            const container = $('#ratings-timeline');
            container.empty();

            if (this.ratingsData.length === 0) {
                container.html(`
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-star text-3xl mb-2"></i>
                        <p>No ratings recorded yet</p>
                    </div>
                `);
                return;
            }

            const self = this;

            this.ratingsData.forEach(function(rating) {
                const avg = ((rating.Quality + rating.Punctuality + rating.Reliability + rating.Deadlines) / 4).toFixed(1);

                container.append(`
                    <div class="bg-gray-50 rounded-xl p-4 mb-4">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <span class="text-sm font-medium text-gray-900">${self.formatPeriod(rating.Period)}</span>
                                <p class="text-xs text-gray-500">${Utils.date.format(rating.RatedOn, 'short')}</p>
                            </div>
                            <div class="text-right">
                                <span class="text-2xl font-bold text-primary-600">${avg}</span>
                                <div class="flex">${self.generateStarsHTML(parseFloat(avg))}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Quality</span>
                                <span class="text-sm font-medium">${rating.Quality}/5</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Punctuality</span>
                                <span class="text-sm font-medium">${rating.Punctuality}/5</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Reliability</span>
                                <span class="text-sm font-medium">${rating.Reliability}/5</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Deadlines</span>
                                <span class="text-sm font-medium">${rating.Deadlines}/5</span>
                            </div>
                        </div>
                        ${rating.Notes ? `
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <p class="text-sm text-gray-600"><i class="fas fa-comment mr-1"></i> ${Utils.string.escape(rating.Notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                `);
            });
        },

        /**
         * Initialize ratings chart
         */
        initRatingsChart: function() {
            const ctx = document.getElementById('ratings-detail-chart');
            if (!ctx) return;

            if (this.charts.ratings) {
                this.charts.ratings.destroy();
            }

            if (!this.ratingsAverages) return;

            const avg = this.ratingsAverages;

            this.charts.ratings = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Quality', 'Punctuality', 'Reliability', 'Deadlines'],
                    datasets: [{
                        label: 'Average Rating',
                        data: [avg.quality, avg.punctuality, avg.reliability, avg.deadlines],
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 5,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },

        /**
         * Show add rating modal
         */
        showAddRatingModal: function() {
            $('#add-rating-form')[0].reset();
            
            // Set current period
            const now = new Date();
            const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            $('#rating-period').val(currentPeriod);

            // Reset star inputs
            ['quality', 'punctuality', 'reliability', 'deadlines'].forEach(cat => {
                this.setStarRating($(`#star-${cat}`), 0);
                $(`#rating-${cat}`).val('');
            });

            Utils.modal.show('add-rating-modal');
        },

        /**
         * Save rating
         */
        saveRating: function() {
            const self = this;

            const data = {
                adminId: this.user.employeeId,
                employeeId: this.employeeId,
                period: $('#rating-period').val(),
                quality: parseInt($('#rating-quality').val()) || 0,
                punctuality: parseInt($('#rating-punctuality').val()) || 0,
                reliability: parseInt($('#rating-reliability').val()) || 0,
                deadlines: parseInt($('#rating-deadlines').val()) || 0,
                notes: $('#rating-notes').val().trim()
            };

            if (!data.quality && !data.punctuality && !data.reliability && !data.deadlines) {
                Utils.toast.error('Please provide at least one rating');
                return;
            }

            const submitBtn = $('#add-rating-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Saving...');

            API.ratings.add(data)
                .then(function(response) {
                    if (response.success) {
                        Utils.toast.success('Rating added successfully');
                        Utils.modal.hide('add-rating-modal');
                        self.loadRatingsData();
                        self.loadQuickStats();
                    } else {
                        Utils.toast.error(response.error || 'Failed to add rating');
                    }
                })
                .catch(function(error) {
                    Utils.toast.error(error.message || 'Failed to add rating');
                })
                .finally(function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-save mr-2"></i>Save Rating');
                });
        },

        /**
         * Load activity log
         */
        loadActivityLog: function() {
            const self = this;

            this.showContentLoading();

            API.audit.list({ employeeId: this.employeeId, limit: 50 })
                .then(function(response) {
                    if (response.success) {
                        self.activityLog = response.data;
                        self.renderActivityLog();
                    }
                })
                .catch(function(error) {
                    console.error('Error loading activity:', error);
                })
                .finally(function() {
                    self.hideContentLoading();
                });
        },

        /**
         * Render activity log
         */
        renderActivityLog: function() {
            const container = $('#activity-log-list');
            container.empty();

            if (this.activityLog.length === 0) {
                container.html(`
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-history text-3xl mb-2"></i>
                        <p>No activity recorded</p>
                    </div>
                `);
                return;
            }

            const actionIcons = {
                'LOGIN': 'fa-sign-in-alt text-blue-500',
                'LOGOUT': 'fa-sign-out-alt text-gray-500',
                'PUNCH_IN': 'fa-clock text-green-500',
                'PUNCH_OUT': 'fa-clock text-orange-500',
                'LEAVE_REQUEST': 'fa-calendar-plus text-purple-500',
                'LEAVE_APPROVE': 'fa-check-circle text-green-500',
                'LEAVE_REJECT': 'fa-times-circle text-red-500',
                'TASK_COMPLETE': 'fa-tasks text-blue-500',
                'RATING_ADD': 'fa-star text-yellow-500',
                'PASSWORD_RESET': 'fa-key text-red-500'
            };

            this.activityLog.forEach(function(log) {
                const icon = actionIcons[log.Action] || 'fa-circle text-gray-400';

                container.append(`
                    <div class="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-900">
                                ${EmployeeDetailPage.formatAction(log.Action)}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                ${Utils.date.format(log.Timestamp, 'full')} • ${Utils.date.timeAgo(log.Timestamp)}
                            </p>
                        </div>
                    </div>
                `);
            });
        },

        /**
         * Format action
         */
        formatAction: function(action) {
            const actions = {
                'LOGIN': 'Logged in to the system',
                'LOGOUT': 'Logged out',
                'PUNCH_IN': 'Punched in for the day',
                'PUNCH_OUT': 'Punched out',
                'LEAVE_REQUEST': 'Submitted a leave request',
                'LEAVE_APPROVE': 'Leave request was approved',
                'LEAVE_REJECT': 'Leave request was rejected',
                'LEAVE_CANCEL': 'Cancelled leave request',
                'TASK_COMPLETE': 'Completed a task',
                'TASK_ASSIGN': 'Was assigned a new task',
                'RATING_ADD': 'Received a new rating',
                'PASSWORD_RESET': 'Password was reset',
                'EMPLOYEE_UPDATE': 'Profile was updated'
            };
            return actions[action] || action.replace(/_/g, ' ').toLowerCase();
        },

        /**
         * Render pagination
         */
        renderPagination: function(type, total) {
            const container = $(`#${type}-pagination`);
            if (!container.length) return;

            container.empty();

            const { page, perPage } = this.pagination[type];
            const totalPages = Math.ceil(total / perPage);

            if (total === 0 || totalPages <= 1) return;

            let html = '<div class="flex items-center gap-1">';

            html += `
                <button class="detail-page-btn px-3 py-1 rounded-lg border ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
                        data-type="${type}" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;

            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                    html += `
                        <button class="detail-page-btn px-3 py-1 rounded-lg ${i === page ? 'bg-primary-600 text-white' : 'border hover:bg-gray-100'}"
                                data-type="${type}" data-page="${i}">${i}</button>
                    `;
                } else if (i === page - 2 || i === page + 2) {
                    html += '<span class="px-2">...</span>';
                }
            }

            html += `
                <button class="detail-page-btn px-3 py-1 rounded-lg border ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
                        data-type="${type}" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;

            html += '</div>';
            container.html(html);
        },

        /**
         * Go to page
         */
        goToPage: function(type, page) {
            this.pagination[type].page = page;
            
            switch (type) {
                case 'attendance':
                    this.renderAttendanceTable();
                    break;
                case 'leave':
                    this.renderLeaveTable();
                    break;
                case 'performance':
                    this.renderPerformanceTable();
                    break;
            }
        },

        /**
         * Show edit profile modal
         */
        showEditProfileModal: function() {
            const emp = this.employee;
            if (!emp) return;

            $('#edit-name').val(emp.Name || '');
            $('#edit-email').val(emp.Email || '');
            $('#edit-phone').val(emp.Phone || '');
            $('#edit-department').val(emp.Department || '');
            $('#edit-role').val(emp.Role || '');
            $('#edit-photo-url').val(emp.PhotoURL || '');

            Utils.modal.show('edit-profile-modal');
        },

        /**
         * Save profile
         */
        saveProfile: function() {
            const self = this;

            const updates = {
                name: $('#edit-name').val().trim(),
                email: $('#edit-email').val().trim(),
                phone: $('#edit-phone').val().trim(),
                department: $('#edit-department').val().trim(),
                role: $('#edit-role').val().trim(),
                photoURL: $('#edit-photo-url').val().trim()
            };

            if (!updates.name) {
                Utils.toast.error('Name is required');
                return;
            }

            const submitBtn = $('#edit-profile-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Saving...');

            API.employees.update({
                adminId: this.user.employeeId,
                employeeId: this.employeeId,
                updates: updates
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Profile updated successfully');
                    Utils.modal.hide('edit-profile-modal');
                    self.loadEmployeeData();
                } else {
                    Utils.toast.error(response.error || 'Failed to update profile');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to update profile');
            })
            .finally(function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-save mr-2"></i>Save Changes');
            });
        },

        /**
         * Show reset password modal
         */
        showResetPasswordModal: function() {
            $('#new-password').val('');
            $('#confirm-password').val('');
            Utils.modal.show('reset-password-modal');
        },

        /**
         * Process reset password
         */
        processResetPassword: function() {
            const self = this;

            const newPassword = $('#new-password').val();
            const confirmPassword = $('#confirm-password').val();

            if (newPassword.length < 6) {
                Utils.toast.error('Password must be at least 6 characters');
                return;
            }

            if (newPassword !== confirmPassword) {
                Utils.toast.error('Passwords do not match');
                return;
            }

            const submitBtn = $('#reset-password-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Resetting...');

            API.auth.resetPassword({
                adminId: this.user.employeeId,
                employeeId: this.employeeId,
                newPassword: newPassword
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Password reset successfully');
                    Utils.modal.hide('reset-password-modal');
                } else {
                    Utils.toast.error(response.error || 'Failed to reset password');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to reset password');
            })
            .finally(function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-key mr-2"></i>Reset Password');
            });
        },

        /**
         * Confirm toggle status
         */
        confirmToggleStatus: function() {
            const self = this;
            const isActive = this.employee.Status !== 'Inactive';

            Utils.modal.confirm({
                title: isActive ? 'Deactivate Employee' : 'Activate Employee',
                message: isActive 
                    ? 'Are you sure you want to deactivate this employee? They will no longer be able to log in.'
                    : 'Are you sure you want to activate this employee? They will be able to log in again.',
                confirmText: isActive ? 'Deactivate' : 'Activate',
                confirmClass: isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
                onConfirm: function() {
                    self.toggleEmployeeStatus();
                }
            });
        },

        /**
         * Toggle employee status
         */
        toggleEmployeeStatus: function() {
            const self = this;
            const isActive = this.employee.Status !== 'Inactive';

            const apiCall = isActive 
                ? API.employees.deactivate({ adminId: this.user.employeeId, employeeId: this.employeeId })
                : API.employees.reactivate({ adminId: this.user.employeeId, employeeId: this.employeeId });

            apiCall
                .then(function(response) {
                    if (response.success) {
                        Utils.toast.success(isActive ? 'Employee deactivated' : 'Employee activated');
                        self.loadEmployeeData();
                    } else {
                        Utils.toast.error(response.error || 'Failed to update status');
                    }
                })
                .catch(function(error) {
                    Utils.toast.error(error.message || 'Failed to update status');
                });
        },

        /**
         * Confirm delete employee
         */
        confirmDeleteEmployee: function() {
            const self = this;

            Utils.modal.confirm({
                title: 'Delete Employee',
                message: 'Are you sure you want to permanently delete this employee? This action cannot be undone and all associated data will be lost.',
                confirmText: 'Delete Permanently',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: function() {
                    self.deleteEmployee();
                }
            });
        },

        /**
         * Delete employee
         */
        deleteEmployee: function() {
            API.employees.delete({
                adminId: this.user.employeeId,
                employeeId: this.employeeId
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Employee deleted successfully');
                    window.location.href = 'admin-dashboard.html';
                } else {
                    Utils.toast.error(response.error || 'Failed to delete employee');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to delete employee');
            });
        },

        /**
         * Export attendance
         */
        exportAttendance: function() {
            if (this.attendanceData.length === 0) {
                Utils.toast.warning('No attendance data to export');
                return;
            }

            const csv = Utils.export.toCSV(this.attendanceData, 
                ['Date', 'PunchIn', 'PunchOut', 'LoginStatus', 'HoursWorked'],
                ['Date', 'Punch In', 'Punch Out', 'Status', 'Hours Worked']
            );

            Utils.export.download(csv, `attendance-${this.employee.Name}-${Utils.date.format(new Date(), 'iso')}.csv`, 'text/csv');
            Utils.toast.success('Attendance exported');
        },

        /**
         * Export performance
         */
        exportPerformance: function() {
            if (this.performanceData.length === 0) {
                Utils.toast.warning('No performance data to export');
                return;
            }

            const csv = Utils.export.toCSV(this.performanceData,
                ['Task', 'DueDate', 'CompletedDate', 'Status', 'Score'],
                ['Task', 'Due Date', 'Completed Date', 'Status', 'Score']
            );

            Utils.export.download(csv, `performance-${this.employee.Name}-${Utils.date.format(new Date(), 'iso')}.csv`, 'text/csv');
            Utils.toast.success('Performance exported');
        },

        /**
         * Print employee report
         */
        printEmployeeReport: function() {
            // Generate comprehensive report
            const emp = this.employee;
            const content = `
                <html>
                <head>
                    <title>Employee Report - ${emp.Name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #1e40af; }
                        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <h1>Employee Report</h1>
                    <div class="section">
                        <h2>Profile</h2>
                        <p><strong>Name:</strong> ${emp.Name}</p>
                        <p><strong>ID:</strong> ${emp.EmployeeID}</p>
                        <p><strong>Department:</strong> ${emp.Department || 'N/A'}</p>
                        <p><strong>Role:</strong> ${emp.Role || 'N/A'}</p>
                        <p><strong>Email:</strong> ${emp.Email || 'N/A'}</p>
                        <p><strong>Join Date:</strong> ${Utils.date.format(emp.JoinDate, 'long')}</p>
                    </div>
                    <p style="color: #666; font-size: 12px;">Generated on ${Utils.date.format(new Date(), 'full')}</p>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.print();
        },

        /**
         * Refresh all data
         */
        refreshAllData: function() {
            this.loadEmployeeData();
            Utils.toast.success('Data refreshed');
        },

        /**
         * Set star rating
         */
        setStarRating: function(container, value) {
            container.data('current', value);
            container.find('i').each(function() {
                const starValue = $(this).data('value');
                if (starValue <= value) {
                    $(this).removeClass('far text-gray-300').addClass('fas text-yellow-400');
                } else {
                    $(this).removeClass('fas text-yellow-400').addClass('far text-gray-300');
                }
            });
        },

        /**
         * Highlight stars
         */
        highlightStars: function(container, value) {
            container.find('i').each(function() {
                const starValue = $(this).data('value');
                $(this).toggleClass('fas text-yellow-400', starValue <= value)
                       .toggleClass('far text-gray-300', starValue > value);
            });
        },

        /**
         * Generate stars HTML
         */
        generateStarsHTML: function(rating) {
            let html = '';
            for (let i = 1; i <= 5; i++) {
                if (rating >= i) {
                    html += '<i class="fas fa-star text-yellow-400 text-sm"></i>';
                } else if (rating >= i - 0.5) {
                    html += '<i class="fas fa-star-half-alt text-yellow-400 text-sm"></i>';
                } else {
                    html += '<i class="far fa-star text-gray-300 text-sm"></i>';
                }
            }
            return html;
        },

        /**
         * Format period
         */
        formatPeriod: function(period) {
            if (!period) return '-';
            const [year, month] = period.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        },

        /**
         * Hide modals
         */
        hideModals: function() {
            Utils.modal.hide('edit-profile-modal');
            Utils.modal.hide('reset-password-modal');
            Utils.modal.hide('add-rating-modal');
            Utils.modal.hide('assign-task-modal');
            Utils.modal.hide('reject-leave-modal');
        },

        /**
         * Show loading
         */
        showLoading: function() {
            $('#loading-overlay').removeClass('hidden');
        },

        /**
         * Hide loading
         */
        hideLoading: function() {
            $('#loading-overlay').addClass('hidden');
        },

        /**
         * Show content loading
         */
        showContentLoading: function() {
            $('#content-loading').removeClass('hidden');
        },

        /**
         * Hide content loading
         */
        hideContentLoading: function() {
            $('#content-loading').addClass('hidden');
        },

        /**
         * Cleanup
         */
        destroy: function() {
            Object.values(this.charts).forEach(function(chart) {
                if (chart) chart.destroy();
            });
        }
    };

    // ============================================
    // INITIALIZE
    // ============================================

    $(document).ready(function() {
        EmployeeDetailPage.init();
    });

    $(window).on('beforeunload', function() {
        EmployeeDetailPage.destroy();
    });

    window.EmployeeDetailPage = EmployeeDetailPage;

})();