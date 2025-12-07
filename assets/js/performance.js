/**
 * Performance Page Logic
 * Handles task management, performance tracking, and analytics
 * for both employees and admins
 */

(function() {
    'use strict';

    // ============================================
    // PERFORMANCE PAGE CONTROLLER
    // ============================================

    const PerformancePage = {
        // State
        user: null,
        isAdmin: false,
        tasks: [],
        filteredTasks: [],
        employees: [],
        statistics: null,
        selectedTask: null,

        // Filters
        filters: {
            status: '',
            employeeId: '',
            department: '',
            startDate: '',
            endDate: '',
            search: '',
            priority: ''
        },

        // Pagination
        pagination: {
            page: 1,
            perPage: 15,
            total: 0
        },

        // Sorting
        sorting: {
            column: 'DueDate',
            direction: 'asc'
        },

        // Chart instance
        charts: {},

        /**
         * Initialize the page
         */
        init: function() {
            console.log('📈 Initializing Performance Page...');

            if (!Auth.requireAuth()) {
                return;
            }

            this.user = Auth.getCurrentUser();
            this.isAdmin = Auth.isAdmin();

            if (!this.user) {
                Auth.logout();
                return;
            }

            // Set default date range
            this.setDefaultDateRange();

            // Cache elements
            this.cacheElements();

            // Bind events
            this.bindEvents();

            // Load components
            this.loadComponents();

            // Load initial data
            this.loadInitialData();

            console.log('✅ Performance Page initialized');
        },

        /**
         * Set default date range (last 3 months)
         */
        setDefaultDateRange: function() {
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            
            this.filters.startDate = Utils.date.format(threeMonthsAgo, 'iso');
            this.filters.endDate = Utils.date.format(now, 'iso');
        },

        /**
         * Cache DOM elements
         */
        cacheElements: function() {
            this.elements = {
                // Stats cards
                totalTasks: $('#total-tasks'),
                completedTasks: $('#completed-tasks'),
                pendingTasks: $('#pending-tasks'),
                overdueTasks: $('#overdue-tasks'),
                completionRate: $('#completion-rate'),
                onTimeRate: $('#ontime-rate'),
                avgScore: $('#avg-score'),

                // Filters
                statusFilter: $('#status-filter'),
                employeeFilter: $('#employee-filter'),
                departmentFilter: $('#department-filter'),
                startDateInput: $('#start-date'),
                endDateInput: $('#end-date'),
                searchInput: $('#search-input'),

                // Table
                tableBody: $('#tasks-table-body'),

                // Charts
                performanceChartCanvas: $('#performance-chart-canvas'),
                trendChartCanvas: $('#trend-chart-canvas'),

                // Pagination
                paginationContainer: $('#pagination-container'),
                pageInfo: $('#page-info'),

                // Modals
                assignTaskModal: $('#assign-task-modal'),
                viewTaskModal: $('#view-task-modal'),
                scoreTaskModal: $('#score-task-modal'),

                // Loading
                loadingOverlay: $('#loading-overlay'),
                tableLoading: $('#table-loading')
            };
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            const self = this;

            // Filter changes
            $(document).on('change', '#status-filter', function() {
                self.filters.status = $(this).val();
                self.applyFilters();
            });

            $(document).on('change', '#employee-filter', function() {
                self.filters.employeeId = $(this).val();
                self.applyFilters();
            });

            $(document).on('change', '#department-filter', function() {
                self.filters.department = $(this).val();
                self.applyFilters();
            });

            // Date filter
            $(document).on('change', '#start-date, #end-date', function() {
                self.filters.startDate = $('#start-date').val();
                self.filters.endDate = $('#end-date').val();
                self.loadTasks();
            });

            // Search
            $(document).on('input', '#search-input', Utils.debounce(function() {
                self.filters.search = $(this).val().trim();
                self.applyFilters();
            }, 300));

            // Quick status filters
            $(document).on('click', '.status-quick-filter', function() {
                const status = $(this).data('status');
                self.filters.status = status;
                $('#status-filter').val(status);
                self.applyFilters();

                // Update active state
                $('.status-quick-filter').removeClass('ring-2 ring-primary-500');
                $(this).addClass('ring-2 ring-primary-500');
            });

            // Sort headers
            $(document).on('click', '.sortable-header', function() {
                const column = $(this).data('column');
                self.handleSort(column);
            });

            // Pagination
            $(document).on('click', '.page-btn', function() {
                if (!$(this).prop('disabled')) {
                    const page = $(this).data('page');
                    self.goToPage(page);
                }
            });

            // Assign task button (admin)
            $(document).on('click', '#assign-task-btn', function() {
                self.showAssignTaskModal();
            });

            // Assign task form submit
            $(document).on('submit', '#assign-task-form', function(e) {
                e.preventDefault();
                self.handleAssignTask();
            });

            // View task details
            $(document).on('click', '.view-task-btn', function(e) {
                e.stopPropagation();
                const taskId = $(this).data('task-id');
                self.showTaskDetails(taskId);
            });

            // Task row click
            $(document).on('click', '.task-row', function() {
                const taskId = $(this).data('task-id');
                self.showTaskDetails(taskId);
            });

            // Complete task button
            $(document).on('click', '#complete-task-btn, .complete-task-btn', function(e) {
                e.stopPropagation();
                const taskId = $(this).data('task-id') || self.selectedTask?.TaskID;
                if (taskId) {
                    self.handleCompleteTask(taskId);
                }
            });

            // Score task button (admin)
            $(document).on('click', '.score-task-btn', function(e) {
                e.stopPropagation();
                const taskId = $(this).data('task-id');
                self.showScoreModal(taskId);
            });

            // Score form submit
            $(document).on('submit', '#score-task-form', function(e) {
                e.preventDefault();
                self.handleScoreTask();
            });

            // Edit task button (admin)
            $(document).on('click', '.edit-task-btn', function(e) {
                e.stopPropagation();
                const taskId = $(this).data('task-id');
                self.showEditTaskModal(taskId);
            });

            // Delete task button (admin)
            $(document).on('click', '.delete-task-btn', function(e) {
                e.stopPropagation();
                const taskId = $(this).data('task-id');
                self.handleDeleteTask(taskId);
            });

            // Bulk actions
            $(document).on('click', '#select-all-tasks', function() {
                const isChecked = $(this).prop('checked');
                $('.task-checkbox').prop('checked', isChecked);
                self.updateBulkActionState();
            });

            $(document).on('change', '.task-checkbox', function() {
                self.updateBulkActionState();
            });

            // Export
            $(document).on('click', '#export-btn', function() {
                self.exportTasks();
            });

            // Refresh
            $(document).on('click', '#refresh-btn', function() {
                self.refresh();
            });

            // Clear filters
            $(document).on('click', '#clear-filters-btn', function() {
                self.clearFilters();
            });

            // Modal close
            $(document).on('click', '.close-modal, .modal-backdrop', function() {
                self.hideModals();
            });

            // Escape key
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideModals();
                }
            });

            // View toggle
            $(document).on('click', '.view-toggle-btn', function() {
                const view = $(this).data('view');
                self.toggleView(view);
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
            $('#nav-user-name').text(this.user.name || 'User');
            $('#nav-user-role').text(this.user.role || 'Employee');
        },

        /**
         * Update sidebar
         */
        updateSidebar: function() {
            $('.sidebar-link').removeClass('active bg-primary-50 text-primary-600');
            $('.sidebar-link[href="performance.html"]').addClass('active bg-primary-50 text-primary-600');
            
            if (this.isAdmin) {
                $('.admin-only').removeClass('hidden');
            }
        },

        /**
         * Load initial data
         */
        loadInitialData: function() {
            const self = this;

            this.showLoading();

            const promises = [this.loadTasks()];

            if (this.isAdmin) {
                promises.push(this.loadEmployees());
            }

            Promise.all(promises)
                .then(function() {
                    self.setupUI();
                    self.initCharts();
                })
                .catch(function(error) {
                    console.error('Error loading data:', error);
                    Utils.toast.error('Failed to load data');
                })
                .finally(function() {
                    self.hideLoading();
                });
        },

        /**
         * Load tasks
         */
        loadTasks: function() {
            const self = this;

            this.showTableLoading();

            const params = {
                startDate: this.filters.startDate,
                endDate: this.filters.endDate
            };

            // For employees, only load their own tasks
            if (!this.isAdmin) {
                params.employeeId = this.user.employeeId;
            } else if (this.filters.employeeId) {
                params.employeeId = this.filters.employeeId;
            }

            if (this.filters.status) {
                params.status = this.filters.status;
            }

            if (this.filters.department) {
                params.department = this.filters.department;
            }

            return API.performance.list(params)
                .then(function(response) {
                    if (response.success) {
                        self.tasks = response.data;
                        self.applyFilters();
                        self.calculateStatistics();
                    } else {
                        Utils.toast.error('Failed to load tasks');
                    }
                })
                .catch(function(error) {
                    console.error('Tasks load error:', error);
                    Utils.toast.error('Failed to load tasks');
                })
                .finally(function() {
                    self.hideTableLoading();
                });
        },

        /**
         * Load employees (admin only)
         */
        loadEmployees: function() {
            const self = this;

            return API.employees.list({ status: 'Active' })
                .then(function(response) {
                    if (response.success) {
                        self.employees = response.data;
                        self.populateEmployeeFilter();
                        self.populateDepartmentFilter();
                    }
                });
        },

        /**
         * Setup UI based on role
         */
        setupUI: function() {
            // Set date inputs
            this.elements.startDateInput.val(this.filters.startDate);
            this.elements.endDateInput.val(this.filters.endDate);

            if (this.isAdmin) {
                $('.admin-only').removeClass('hidden');
                $('#page-title').text('Performance Management');
                $('#page-subtitle').text('Track and manage team performance');
            } else {
                $('.admin-only').addClass('hidden');
                $('#page-title').text('My Tasks');
                $('#page-subtitle').text('Track your assigned tasks and performance');
            }
        },

        /**
         * Populate employee filter
         */
        populateEmployeeFilter: function() {
            const select = $('#employee-filter');
            if (!select.length) return;

            select.find('option:not(:first)').remove();

            this.employees
                .sort((a, b) => a.Name.localeCompare(b.Name))
                .forEach(function(emp) {
                    select.append(`<option value="${emp.EmployeeID}">${emp.Name}</option>`);
                });
        },

        /**
         * Populate department filter
         */
        populateDepartmentFilter: function() {
            const select = $('#department-filter');
            if (!select.length) return;

            const departments = [...new Set(this.employees.map(e => e.Department).filter(Boolean))];
            
            select.find('option:not(:first)').remove();

            departments.sort().forEach(function(dept) {
                select.append(`<option value="${dept}">${dept}</option>`);
            });
        },

        /**
         * Calculate statistics
         */
        calculateStatistics: function() {
            const tasks = this.tasks;

            const total = tasks.length;
            const completed = tasks.filter(t => t.Status === 'Completed').length;
            const pending = tasks.filter(t => t.Status === 'Pending' || t.Status === 'In Progress').length;
            const overdue = tasks.filter(t => t.isOverdue).length;

            // On-time completion rate
            const completedTasks = tasks.filter(t => t.Status === 'Completed');
            const onTimeCompleted = completedTasks.filter(t => {
                if (!t.CompletedDate || !t.DueDate) return false;
                return new Date(t.CompletedDate) <= new Date(t.DueDate);
            }).length;
            const onTimeRate = completedTasks.length > 0 
                ? Math.round((onTimeCompleted / completedTasks.length) * 100) 
                : 0;

            // Completion rate
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Average score
            const scoredTasks = tasks.filter(t => t.Score);
            const avgScore = scoredTasks.length > 0
                ? scoredTasks.reduce((sum, t) => sum + parseFloat(t.Score), 0) / scoredTasks.length
                : 0;

            this.statistics = {
                total,
                completed,
                pending,
                overdue,
                completionRate,
                onTimeRate,
                avgScore: Math.round(avgScore * 10) / 10
            };

            this.renderStatistics();
        },

        /**
         * Render statistics
         */
        renderStatistics: function() {
            const stats = this.statistics;
            if (!stats) return;

            // Animate counters
            this.animateCounter('#total-tasks', stats.total);
            this.animateCounter('#completed-tasks', stats.completed);
            this.animateCounter('#pending-tasks', stats.pending);
            this.animateCounter('#overdue-tasks', stats.overdue);

            // Rates
            $('#completion-rate').text(stats.completionRate + '%');
            $('#ontime-rate').text(stats.onTimeRate + '%');
            $('#avg-score').text(stats.avgScore.toFixed(1));

            // Progress bars
            $('#completion-rate-bar').css('width', stats.completionRate + '%');
            $('#ontime-rate-bar').css('width', stats.onTimeRate + '%');

            // Color coding for overdue
            if (stats.overdue > 0) {
                $('#overdue-tasks').addClass('text-red-600');
                $('#overdue-warning').removeClass('hidden').text(`${stats.overdue} task${stats.overdue > 1 ? 's' : ''} overdue`);
            } else {
                $('#overdue-tasks').removeClass('text-red-600');
                $('#overdue-warning').addClass('hidden');
            }
        },

        /**
         * Animate counter
         */
        animateCounter: function(selector, target) {
            const element = $(selector);
            const current = parseInt(element.text()) || 0;
            
            $({ count: current }).animate({ count: target }, {
                duration: 500,
                easing: 'swing',
                step: function() {
                    element.text(Math.round(this.count));
                },
                complete: function() {
                    element.text(target);
                }
            });
        },

        /**
         * Apply filters
         */
        applyFilters: function() {
            let filtered = [...this.tasks];

            // Search filter
            if (this.filters.search) {
                const search = this.filters.search.toLowerCase();
                filtered = filtered.filter(task =>
                    (task.Task && task.Task.toLowerCase().includes(search)) ||
                    (task.Description && task.Description.toLowerCase().includes(search)) ||
                    (task.employeeName && task.employeeName.toLowerCase().includes(search)) ||
                    (task.EmployeeID && task.EmployeeID.toLowerCase().includes(search))
                );
            }

            // Sort
            filtered = this.sortData(filtered);

            this.filteredTasks = filtered;
            this.pagination.total = filtered.length;
            this.pagination.page = 1;

            this.renderTable();
            this.updateCharts();
        },

        /**
         * Sort data
         */
        sortData: function(data) {
            const { column, direction } = this.sorting;
            const multiplier = direction === 'asc' ? 1 : -1;

            return data.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];

                // Handle dates
                if (column === 'DueDate' || column === 'CompletedDate' || column === 'AssignedOn') {
                    valA = valA ? new Date(valA) : new Date('9999-12-31');
                    valB = valB ? new Date(valB) : new Date('9999-12-31');
                }

                // Handle numbers
                if (column === 'Score') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                }

                // Handle strings
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = (valB || '').toLowerCase();
                }

                if (valA < valB) return -1 * multiplier;
                if (valA > valB) return 1 * multiplier;
                return 0;
            });
        },

        /**
         * Handle sort
         */
        handleSort: function(column) {
            if (this.sorting.column === column) {
                this.sorting.direction = this.sorting.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.sorting.column = column;
                this.sorting.direction = 'asc';
            }

            this.updateSortIndicators();
            this.applyFilters();
        },

        /**
         * Update sort indicators
         */
        updateSortIndicators: function() {
            $('.sortable-header .sort-icon').removeClass('fa-sort-up fa-sort-down text-primary-600').addClass('fa-sort text-gray-300');
            
            const header = $(`.sortable-header[data-column="${this.sorting.column}"]`);
            const icon = header.find('.sort-icon');
            
            icon.removeClass('fa-sort text-gray-300');
            icon.addClass(this.sorting.direction === 'asc' ? 'fa-sort-up text-primary-600' : 'fa-sort-down text-primary-600');
        },

        /**
         * Render tasks table
         */
        renderTable: function() {
            const container = this.elements.tableBody;
            container.empty();

            const { page, perPage } = this.pagination;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.filteredTasks.slice(start, end);

            if (pageData.length === 0) {
                container.html(`
                    <tr>
                        <td colspan="${this.isAdmin ? 9 : 7}" class="px-6 py-12 text-center text-gray-500">
                            <i class="fas fa-tasks text-4xl mb-3"></i>
                            <p class="text-lg font-medium">No tasks found</p>
                            <p class="text-sm mt-1">Try adjusting your filters</p>
                        </td>
                    </tr>
                `);
                this.renderPagination();
                return;
            }

            const self = this;

            pageData.forEach(function(task, index) {
                const rowNum = start + index + 1;
                
                // Status styling
                const statusStyles = {
                    'Completed': 'bg-green-100 text-green-800',
                    'Pending': 'bg-yellow-100 text-yellow-800',
                    'In Progress': 'bg-blue-100 text-blue-800',
                    'Cancelled': 'bg-gray-100 text-gray-800'
                };
                const statusClass = statusStyles[task.Status] || 'bg-gray-100 text-gray-800';

                // Overdue styling
                const isOverdue = task.isOverdue;
                const rowClass = isOverdue ? 'bg-red-50 border-l-4 border-red-500' : '';

                // Due date styling
                const dueDate = task.DueDate ? new Date(task.DueDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let dueDateClass = 'text-gray-500';
                if (dueDate && task.Status !== 'Completed') {
                    if (dueDate < today) {
                        dueDateClass = 'text-red-600 font-medium';
                    } else if (dueDate.getTime() === today.getTime()) {
                        dueDateClass = 'text-orange-600 font-medium';
                    } else if (dueDate <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)) {
                        dueDateClass = 'text-yellow-600';
                    }
                }

                // Score display
                const score = task.Score ? parseFloat(task.Score).toFixed(1) : '-';
                const scoreClass = task.Score 
                    ? (task.Score >= 4 ? 'text-green-600' : task.Score >= 3 ? 'text-yellow-600' : 'text-red-600')
                    : 'text-gray-400';

                container.append(`
                    <tr class="task-row hover:bg-gray-50 cursor-pointer transition-colors ${rowClass}" data-task-id="${task.TaskID}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${self.isAdmin ? `<input type="checkbox" class="task-checkbox rounded border-gray-300 text-primary-600 focus:ring-primary-500" data-task-id="${task.TaskID}">` : rowNum}
                        </td>
                        ${self.isAdmin ? `
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-medium">
                                        ${Utils.string.initials(task.employeeName || 'U')}
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm font-medium text-gray-900">${Utils.string.escape(task.employeeName || '-')}</p>
                                        <p class="text-xs text-gray-500">${task.department || ''}</p>
                                    </div>
                                </div>
                            </td>
                        ` : ''}
                        <td class="px-6 py-4">
                            <div class="max-w-xs">
                                <p class="text-sm font-medium text-gray-900 truncate" title="${Utils.string.escape(task.Task)}">
                                    ${Utils.string.escape(task.Task)}
                                </p>
                                ${task.Description ? `
                                    <p class="text-xs text-gray-500 truncate mt-0.5" title="${Utils.string.escape(task.Description)}">
                                        ${Utils.string.escape(task.Description)}
                                    </p>
                                ` : ''}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap ${dueDateClass}">
                            <div class="text-sm">
                                ${task.DueDate ? Utils.date.format(task.DueDate, 'short') : '-'}
                                ${isOverdue ? '<i class="fas fa-exclamation-circle ml-1 text-red-500"></i>' : ''}
                            </div>
                            ${task.DueDate ? `<div class="text-xs text-gray-400">${Utils.date.timeAgo(task.DueDate)}</div>` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${task.CompletedDate ? Utils.date.format(task.CompletedDate, 'short') : '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                                ${task.Status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${scoreClass}">
                            ${score !== '-' ? `
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-star text-yellow-400 text-xs"></i>
                                    ${score}
                                </div>
                            ` : score}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            <div class="flex items-center justify-end gap-1">
                                ${task.Status !== 'Completed' && !self.isAdmin ? `
                                    <button class="complete-task-btn p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                            data-task-id="${task.TaskID}" title="Mark Complete">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : ''}
                                ${self.isAdmin ? `
                                    ${task.Status === 'Completed' && !task.Score ? `
                                        <button class="score-task-btn p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" 
                                                data-task-id="${task.TaskID}" title="Score Task">
                                            <i class="fas fa-star"></i>
                                        </button>
                                    ` : ''}
                                    <button class="edit-task-btn p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                                            data-task-id="${task.TaskID}" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-task-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                            data-task-id="${task.TaskID}" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                                <button class="view-task-btn p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                                        data-task-id="${task.TaskID}" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
            });

            this.renderPagination();
        },

        /**
         * Render pagination
         */
        renderPagination: function() {
            const container = $('#pagination-container');
            container.empty();

            const { page, perPage, total } = this.pagination;
            const totalPages = Math.ceil(total / perPage);

            if (total === 0) {
                $('#page-info').text('No records');
                return;
            }

            const start = (page - 1) * perPage + 1;
            const end = Math.min(page * perPage, total);
            $('#page-info').text(`Showing ${start}-${end} of ${total} tasks`);

            if (totalPages <= 1) return;

            let html = '<div class="flex items-center gap-1">';

            // Previous
            html += `
                <button class="page-btn px-3 py-2 rounded-lg border ${page === 1 ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-100'}"
                        data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;

            // Page numbers
            for (let i = 1; i <= Math.min(totalPages, 5); i++) {
                const pageNum = i <= 3 ? i : (i === 4 && totalPages > 5 ? '...' : totalPages - (5 - i));
                if (pageNum === '...') {
                    html += '<span class="px-2 text-gray-400">...</span>';
                } else {
                    html += `
                        <button class="page-btn px-3 py-2 rounded-lg border ${pageNum === page ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-100'}"
                                data-page="${pageNum}">${pageNum}</button>
                    `;
                }
            }

            // Next
            html += `
                <button class="page-btn px-3 py-2 rounded-lg border ${page === totalPages ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-100'}"
                        data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;

            html += '</div>';
            container.html(html);
        },

        /**
         * Go to page
         */
        goToPage: function(page) {
            this.pagination.page = page;
            this.renderTable();
            
            $('html, body').animate({
                scrollTop: $('#tasks-table').offset().top - 100
            }, 300);
        },

        /**
         * Initialize charts
         */
        initCharts: function() {
            this.initPerformanceChart();
            this.initTrendChart();
        },

        /**
         * Initialize performance doughnut chart
         */
        initPerformanceChart: function() {
            const ctx = document.getElementById('performance-chart-canvas');
            if (!ctx) return;

            if (this.charts.performance) {
                this.charts.performance.destroy();
            }

            const stats = this.statistics || {};

            this.charts.performance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Pending', 'In Progress', 'Overdue'],
                    datasets: [{
                        data: [
                            stats.completed || 0,
                            this.tasks.filter(t => t.Status === 'Pending').length,
                            this.tasks.filter(t => t.Status === 'In Progress').length,
                            stats.overdue || 0
                        ],
                        backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        },

        /**
         * Initialize trend chart
         */
        initTrendChart: function() {
            const ctx = document.getElementById('trend-chart-canvas');
            if (!ctx) return;

            if (this.charts.trend) {
                this.charts.trend.destroy();
            }

            // Group tasks by month
            const monthlyData = {};
            this.tasks.forEach(task => {
                if (task.CompletedDate) {
                    const month = task.CompletedDate.substring(0, 7);
                    if (!monthlyData[month]) {
                        monthlyData[month] = { completed: 0, onTime: 0 };
                    }
                    monthlyData[month].completed++;
                    if (new Date(task.CompletedDate) <= new Date(task.DueDate)) {
                        monthlyData[month].onTime++;
                    }
                }
            });

            const labels = Object.keys(monthlyData).sort().slice(-6);
            const completedData = labels.map(m => monthlyData[m]?.completed || 0);
            const onTimeData = labels.map(m => monthlyData[m]?.onTime || 0);

            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.map(m => {
                        const [year, month] = m.split('-');
                        return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }),
                    datasets: [
                        {
                            label: 'Completed',
                            data: completedData,
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'On Time',
                            data: onTimeData,
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        /**
         * Update charts
         */
        updateCharts: function() {
            this.initPerformanceChart();
        },

        /**
         * Show assign task modal
         */
        showAssignTaskModal: function() {
            $('#assign-task-form')[0].reset();
            
            // Set minimum due date to today
            const today = Utils.date.format(new Date(), 'iso');
            $('#task-due-date').attr('min', today).val('');

            // Populate employee select
            const employeeSelect = $('#task-employee');
            employeeSelect.find('option:not(:first)').remove();
            
            this.employees.forEach(emp => {
                employeeSelect.append(`<option value="${emp.EmployeeID}">${emp.Name} (${emp.Department || 'N/A'})</option>`);
            });

            Utils.modal.show('assign-task-modal');
        },

        /**
         * Handle assign task
         */
        handleAssignTask: function() {
            const self = this;

            const formData = {
                adminId: this.user.employeeId,
                employeeId: $('#task-employee').val(),
                task: $('#task-title').val().trim(),
                description: $('#task-description').val().trim(),
                dueDate: $('#task-due-date').val(),
                notes: $('#task-notes').val().trim()
            };

            // Validation
            if (!formData.employeeId || !formData.task || !formData.dueDate) {
                Utils.toast.error('Please fill in all required fields');
                return;
            }

            const submitBtn = $('#assign-task-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Assigning...');

            API.performance.assign(formData)
                .then(function(response) {
                    if (response.success) {
                        Utils.toast.success('Task assigned successfully');
                        Utils.modal.hide('assign-task-modal');
                        self.loadTasks();
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
         * Show task details modal
         */
        showTaskDetails: function(taskId) {
            const task = this.tasks.find(t => t.TaskID === taskId);
            if (!task) {
                Utils.toast.error('Task not found');
                return;
            }

            this.selectedTask = task;

            // Populate modal
            $('#view-task-title').text(task.Task);
            $('#view-task-employee').text(task.employeeName || task.EmployeeID);
            $('#view-task-department').text(task.department || '-');
            $('#view-task-description').text(task.Description || 'No description provided');
            $('#view-task-due-date').text(task.DueDate ? Utils.date.format(task.DueDate, 'full') : '-');
            $('#view-task-completed-date').text(task.CompletedDate ? Utils.date.format(task.CompletedDate, 'full') : '-');
            $('#view-task-assigned-by').text(task.AssignedBy || '-');
            $('#view-task-assigned-on').text(task.AssignedOn ? Utils.date.format(task.AssignedOn, 'full') : '-');
            $('#view-task-notes').text(task.Notes || '-');

            // Status badge
            const statusStyles = {
                'Completed': 'bg-green-100 text-green-800',
                'Pending': 'bg-yellow-100 text-yellow-800',
                'In Progress': 'bg-blue-100 text-blue-800'
            };
            $('#view-task-status').removeClass().addClass(`px-3 py-1 text-sm font-medium rounded-full ${statusStyles[task.Status] || 'bg-gray-100 text-gray-800'}`).text(task.Status);

            // Score
            if (task.Score) {
                $('#view-task-score').text(parseFloat(task.Score).toFixed(1) + '/5');
                $('#view-task-score-section').removeClass('hidden');
            } else {
                $('#view-task-score-section').addClass('hidden');
            }

            // Overdue warning
            if (task.isOverdue) {
                $('#view-task-overdue-warning').removeClass('hidden');
            } else {
                $('#view-task-overdue-warning').addClass('hidden');
            }

            // Show/hide action buttons based on status and role
            if (task.Status !== 'Completed' && !this.isAdmin) {
                $('#complete-task-btn').data('task-id', taskId).removeClass('hidden');
            } else {
                $('#complete-task-btn').addClass('hidden');
            }

            Utils.modal.show('view-task-modal');
        },

        /**
         * Handle complete task
         */
        handleCompleteTask: function(taskId) {
            const self = this;
            const task = this.tasks.find(t => t.TaskID === taskId);
            
            if (!task) {
                Utils.toast.error('Task not found');
                return;
            }

            Utils.modal.confirm({
                title: 'Complete Task',
                message: `Are you sure you want to mark "${task.Task}" as completed?`,
                confirmText: 'Complete',
                confirmClass: 'bg-green-600 hover:bg-green-700',
                onConfirm: function() {
                    self.processCompleteTask(taskId);
                }
            });
        },

        /**
         * Process complete task
         */
        processCompleteTask: function(taskId) {
            const self = this;

            Utils.toast.info('Marking task as complete...');

            API.performance.complete({
                employeeId: this.user.employeeId,
                taskId: taskId
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Task completed!');
                    self.hideModals();
                    self.loadTasks();
                } else {
                    Utils.toast.error(response.error || 'Failed to complete task');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to complete task');
            });
        },

        /**
         * Show score modal
         */
        showScoreModal: function(taskId) {
            const task = this.tasks.find(t => t.TaskID === taskId);
            if (!task) {
                Utils.toast.error('Task not found');
                return;
            }

            this.selectedTask = task;

            $('#score-task-id').val(taskId);
            $('#score-task-title').text(task.Task);
            $('#score-task-employee').text(task.employeeName || task.EmployeeID);
            $('#task-score').val(task.Score || '');
            $('#score-notes').val(task.Notes || '');

            Utils.modal.show('score-task-modal');
        },

        /**
         * Handle score task
         */
        handleScoreTask: function() {
            const self = this;

            const taskId = $('#score-task-id').val();
            const score = parseFloat($('#task-score').val());
            const notes = $('#score-notes').val().trim();

            if (!score || score < 1 || score > 5) {
                Utils.toast.error('Please enter a valid score between 1 and 5');
                return;
            }

            const submitBtn = $('#score-task-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Saving...');

            API.performance.update({
                adminId: this.user.employeeId,
                taskId: taskId,
                updates: {
                    Score: score,
                    Notes: notes
                }
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Score saved successfully');
                    Utils.modal.hide('score-task-modal');
                    self.loadTasks();
                } else {
                    Utils.toast.error(response.error || 'Failed to save score');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to save score');
            })
            .finally(function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-star mr-2"></i>Save Score');
            });
        },

        /**
         * Show edit task modal
         */
        showEditTaskModal: function(taskId) {
            const task = this.tasks.find(t => t.TaskID === taskId);
            if (!task) {
                Utils.toast.error('Task not found');
                return;
            }

            this.selectedTask = task;

            // Populate employee select
            const employeeSelect = $('#edit-task-employee');
            employeeSelect.find('option:not(:first)').remove();
            this.employees.forEach(emp => {
                employeeSelect.append(`<option value="${emp.EmployeeID}" ${emp.EmployeeID === task.EmployeeID ? 'selected' : ''}>${emp.Name}</option>`);
            });

            $('#edit-task-id').val(taskId);
            $('#edit-task-title').val(task.Task);
            $('#edit-task-description').val(task.Description || '');
            $('#edit-task-due-date').val(task.DueDate || '');
            $('#edit-task-status').val(task.Status);
            $('#edit-task-notes').val(task.Notes || '');

            Utils.modal.show('edit-task-modal');
        },

        /**
         * Handle delete task
         */
        handleDeleteTask: function(taskId) {
            const self = this;
            const task = this.tasks.find(t => t.TaskID === taskId);
            
            if (!task) {
                Utils.toast.error('Task not found');
                return;
            }

            Utils.modal.confirm({
                title: 'Delete Task',
                message: `Are you sure you want to delete "${task.Task}"? This action cannot be undone.`,
                confirmText: 'Delete',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: function() {
                    self.processDeleteTask(taskId);
                }
            });
        },

        /**
         * Process delete task
         */
        processDeleteTask: function(taskId) {
            const self = this;

            Utils.toast.info('Deleting task...');

            API.performance.delete({
                adminId: this.user.employeeId,
                taskId: taskId
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Task deleted');
                    self.loadTasks();
                } else {
                    Utils.toast.error(response.error || 'Failed to delete task');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to delete task');
            });
        },

        /**
         * Update bulk action state
         */
        updateBulkActionState: function() {
            const checkedCount = $('.task-checkbox:checked').length;
            
            if (checkedCount > 0) {
                $('#bulk-actions').removeClass('hidden');
                $('#selected-count').text(checkedCount);
            } else {
                $('#bulk-actions').addClass('hidden');
            }

            // Update select all checkbox
            const totalCheckboxes = $('.task-checkbox').length;
            $('#select-all-tasks').prop('checked', checkedCount === totalCheckboxes && totalCheckboxes > 0);
        },

        /**
         * Clear filters
         */
        clearFilters: function() {
            this.setDefaultDateRange();
            this.filters.status = '';
            this.filters.employeeId = '';
            this.filters.department = '';
            this.filters.search = '';

            $('#status-filter').val('');
            $('#employee-filter').val('');
            $('#department-filter').val('');
            $('#search-input').val('');
            this.elements.startDateInput.val(this.filters.startDate);
            this.elements.endDateInput.val(this.filters.endDate);

            $('.status-quick-filter').removeClass('ring-2 ring-primary-500');

            this.loadTasks();
        },

        /**
         * Export tasks
         */
        exportTasks: function() {
            if (this.filteredTasks.length === 0) {
                Utils.toast.warning('No tasks to export');
                return;
            }

            Utils.toast.info('Generating export...');

            const columns = this.isAdmin
                ? ['TaskID', 'EmployeeID', 'employeeName', 'department', 'Task', 'Description', 'DueDate', 'CompletedDate', 'Status', 'Score', 'Notes']
                : ['TaskID', 'Task', 'Description', 'DueDate', 'CompletedDate', 'Status', 'Score', 'Notes'];

            const csv = Utils.export.toCSV(this.filteredTasks, columns);
            const filename = `performance-tasks-${Utils.date.format(new Date(), 'iso')}.csv`;

            Utils.export.download(csv, filename, 'text/csv');
            Utils.toast.success('Export downloaded');
        },

        /**
         * Refresh data
         */
        refresh: function() {
            const self = this;
            
            $('#refresh-btn i').addClass('animate-spin');
            
            this.loadTasks().finally(function() {
                $('#refresh-btn i').removeClass('animate-spin');
                Utils.toast.success('Data refreshed');
            });
        },

        /**
         * Toggle view
         */
        toggleView: function(view) {
            $('.view-toggle-btn').removeClass('bg-primary-600 text-white').addClass('bg-white text-gray-700');
            $(`.view-toggle-btn[data-view="${view}"]`).removeClass('bg-white text-gray-700').addClass('bg-primary-600 text-white');

            if (view === 'table') {
                $('#table-view').removeClass('hidden');
                $('#kanban-view').addClass('hidden');
            } else if (view === 'kanban') {
                $('#table-view').addClass('hidden');
                $('#kanban-view').removeClass('hidden');
                this.renderKanbanView();
            }
        },

        /**
         * Render kanban view
         */
        renderKanbanView: function() {
            const statuses = ['Pending', 'In Progress', 'Completed'];
            const container = $('#kanban-view');
            
            container.empty();
            container.addClass('grid grid-cols-1 md:grid-cols-3 gap-4');

            const self = this;

            statuses.forEach(function(status) {
                const statusTasks = self.filteredTasks.filter(t => t.Status === status);
                const statusColors = {
                    'Pending': 'border-yellow-400 bg-yellow-50',
                    'In Progress': 'border-blue-400 bg-blue-50',
                    'Completed': 'border-green-400 bg-green-50'
                };

                let tasksHtml = statusTasks.length === 0 
                    ? '<p class="text-gray-400 text-center py-4">No tasks</p>'
                    : statusTasks.map(task => `
                        <div class="bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow task-row" data-task-id="${task.TaskID}">
                            <p class="font-medium text-gray-900 text-sm">${Utils.string.escape(task.Task)}</p>
                            ${self.isAdmin ? `<p class="text-xs text-gray-500 mt-1">${task.employeeName || task.EmployeeID}</p>` : ''}
                            <div class="flex items-center justify-between mt-2 text-xs">
                                <span class="${task.isOverdue ? 'text-red-600' : 'text-gray-500'}">
                                    <i class="far fa-calendar mr-1"></i>${task.DueDate ? Utils.date.format(task.DueDate, 'short') : '-'}
                                </span>
                                ${task.Score ? `
                                    <span class="text-yellow-600">
                                        <i class="fas fa-star mr-1"></i>${parseFloat(task.Score).toFixed(1)}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');

                container.append(`
                    <div class="rounded-xl border-t-4 ${statusColors[status]} p-4">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-gray-800">${status}</h3>
                            <span class="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                                ${statusTasks.length}
                            </span>
                        </div>
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            ${tasksHtml}
                        </div>
                    </div>
                `);
            });
        },

        /**
         * Hide modals
         */
        hideModals: function() {
            Utils.modal.hide('assign-task-modal');
            Utils.modal.hide('view-task-modal');
            Utils.modal.hide('score-task-modal');
            Utils.modal.hide('edit-task-modal');
            this.selectedTask = null;
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
         * Show table loading
         */
        showTableLoading: function() {
            $('#table-loading').removeClass('hidden');
        },

        /**
         * Hide table loading
         */
        hideTableLoading: function() {
            $('#table-loading').addClass('hidden');
        },

        /**
         * Cleanup
         */
        destroy: function() {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
        }
    };

    // ============================================
    // INITIALIZE
    // ============================================

    $(document).ready(function() {
        PerformancePage.init();
    });

    $(window).on('beforeunload', function() {
        PerformancePage.destroy();
    });

    window.PerformancePage = PerformancePage;

})();