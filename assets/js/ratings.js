/**
 * Ratings Page Logic
 * Handles employee ratings management for quality, punctuality, reliability, and deadlines
 * Supports both employee (read-only) and admin (full CRUD) views
 */

(function() {
    'use strict';

    // ============================================
    // RATINGS PAGE CONTROLLER
    // ============================================

    const RatingsPage = {
        // State
        user: null,
        isAdmin: false,
        ratings: [],
        filteredRatings: [],
        employees: [],
        selectedEmployee: null,
        charts: {},

        // Filters
        filters: {
            employeeId: '',
            department: '',
            period: '',
            search: ''
        },

        // Pagination
        pagination: {
            page: 1,
            perPage: 10,
            total: 0
        },

        // Rating categories
        categories: ['Quality', 'Punctuality', 'Reliability', 'Deadlines'],

        // Period options
        periods: [],

        // Edit/Add state
        editingRating: null,
        isAddMode: false,

        /**
         * Initialize the page
         */
        init: function() {
            console.log('⭐ Initializing Ratings Page...');

            if (!Auth.requireAuth()) {
                return;
            }

            this.user = Auth.getCurrentUser();
            this.isAdmin = Auth.isAdmin();

            if (!this.user) {
                Auth.logout();
                return;
            }

            // Generate period options (last 12 months)
            this.generatePeriodOptions();

            // Cache elements
            this.cacheElements();

            // Bind events
            this.bindEvents();

            // Load components
            this.loadComponents();

            // Load initial data
            this.loadInitialData();

            console.log('✅ Ratings Page initialized');
        },

        /**
         * Generate period options for the last 12 months
         */
        generatePeriodOptions: function() {
            const periods = [];
            const now = new Date();

            for (let i = 0; i < 12; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                periods.push({ value, label });
            }

            this.periods = periods;
        },

        /**
         * Cache DOM elements
         */
        cacheElements: function() {
            this.elements = {
                // Filters
                employeeFilter: $('#employee-filter'),
                departmentFilter: $('#department-filter'),
                periodFilter: $('#period-filter'),
                searchInput: $('#search-input'),
                clearFiltersBtn: $('#clear-filters-btn'),

                // Tables and lists
                ratingsTableBody: $('#ratings-table-body'),
                ratingsGrid: $('#ratings-grid'),

                // Stats
                avgQuality: $('#avg-quality'),
                avgPunctuality: $('#avg-punctuality'),
                avgReliability: $('#avg-reliability'),
                avgDeadlines: $('#avg-deadlines'),
                overallAvg: $('#overall-avg'),
                totalRatings: $('#total-ratings'),

                // Charts
                radarChartCanvas: $('#radar-chart-canvas'),
                trendChartCanvas: $('#trend-chart-canvas'),
                distributionChartCanvas: $('#distribution-chart-canvas'),

                // Actions
                addRatingBtn: $('#add-rating-btn'),
                exportBtn: $('#export-btn'),

                // Modals
                ratingModal: $('#rating-modal'),
                ratingForm: $('#rating-form'),
                viewRatingModal: $('#view-rating-modal'),

                // View toggle
                viewToggleBtns: $('.view-toggle-btn'),

                // Employee rating section (for employee view)
                myRatingsSection: $('#my-ratings-section'),
                myRatingsList: $('#my-ratings-list'),

                // Pagination
                paginationContainer: $('#pagination-container'),

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

            // Filter changes
            $(document).on('change', '#employee-filter', function() {
                self.filters.employeeId = $(this).val();
                self.applyFilters();
            });

            $(document).on('change', '#department-filter', function() {
                self.filters.department = $(this).val();
                self.loadRatingsData();
            });

            $(document).on('change', '#period-filter', function() {
                self.filters.period = $(this).val();
                self.applyFilters();
            });

            // Search
            $(document).on('input', '#search-input', Utils.debounce(function() {
                self.filters.search = $(this).val().trim();
                self.applyFilters();
            }, 300));

            // Clear filters
            $(document).on('click', '#clear-filters-btn', function() {
                self.clearFilters();
            });

            // Add rating button
            $(document).on('click', '#add-rating-btn', function() {
                self.showAddRatingModal();
            });

            // Edit rating button
            $(document).on('click', '.edit-rating-btn', function(e) {
                e.stopPropagation();
                const ratingId = $(this).data('rating-id');
                self.showEditRatingModal(ratingId);
            });

            // View rating details
            $(document).on('click', '.rating-card, .rating-row', function() {
                const ratingId = $(this).data('rating-id');
                if (ratingId) {
                    self.showRatingDetails(ratingId);
                }
            });

            // Delete rating button
            $(document).on('click', '.delete-rating-btn', function(e) {
                e.stopPropagation();
                const ratingId = $(this).data('rating-id');
                self.confirmDeleteRating(ratingId);
            });

            // Rating form submission
            $(document).on('submit', '#rating-form', function(e) {
                e.preventDefault();
                self.saveRating();
            });

            // Star rating input
            $(document).on('click', '.star-input i', function() {
                const container = $(this).closest('.star-input');
                const value = $(this).data('value');
                const inputId = container.data('input');
                
                self.setStarRating(container, value);
                $(`#${inputId}`).val(value);
            });

            // Star rating hover
            $(document).on('mouseenter', '.star-input i', function() {
                const container = $(this).closest('.star-input');
                const value = $(this).data('value');
                self.highlightStars(container, value);
            });

            $(document).on('mouseleave', '.star-input', function() {
                const container = $(this);
                const currentValue = parseInt(container.find('input[type="hidden"]').val()) || 0;
                self.setStarRating(container, currentValue);
            });

            // Slider rating input
            $(document).on('input', '.rating-slider', function() {
                const value = $(this).val();
                const display = $(this).siblings('.rating-value');
                display.text(value);
                
                // Update color based on value
                self.updateSliderColor($(this), value);
            });

            // Employee select in modal
            $(document).on('change', '#modal-employee-select', function() {
                self.selectedEmployee = $(this).val();
                self.loadEmployeeCurrentRatings();
            });

            // View toggle
            $(document).on('click', '.view-toggle-btn', function() {
                const view = $(this).data('view');
                self.toggleView(view);
            });

            // Export
            $(document).on('click', '#export-btn', function() {
                self.exportRatings();
            });

            // Pagination
            $(document).on('click', '.page-btn:not([disabled])', function() {
                const page = $(this).data('page');
                self.goToPage(page);
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

            // Refresh
            $(document).on('click', '#refresh-btn', function() {
                self.refreshData();
            });

            // Period quick select
            $(document).on('click', '.period-quick-btn', function() {
                const period = $(this).data('period');
                $('#period-filter').val(period).trigger('change');
                
                $('.period-quick-btn').removeClass('bg-primary-100 text-primary-700').addClass('bg-gray-100 text-gray-600');
                $(this).removeClass('bg-gray-100 text-gray-600').addClass('bg-primary-100 text-primary-700');
            });

            // Employee card click (for quick rating)
            $(document).on('click', '.employee-quick-rate', function() {
                const employeeId = $(this).data('employee-id');
                self.showAddRatingModal(employeeId);
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
            $('.sidebar-link[href="ratings.html"]').addClass('active bg-primary-50 text-primary-600');
            
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

            const promises = [this.loadRatingsData()];

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
                    Utils.toast.error('Failed to load ratings data');
                })
                .finally(function() {
                    self.hideLoading();
                });
        },

        /**
         * Load employees list
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
         * Load ratings data
         */
        loadRatingsData: function() {
            const self = this;

            this.showContentLoading();

            const params = {};

            if (!this.isAdmin) {
                // Employee only sees their own ratings
                params.employeeId = this.user.employeeId;
            } else {
                if (this.filters.department) {
                    params.department = this.filters.department;
                }
            }

            if (this.filters.period) {
                params.period = this.filters.period;
            }

            return API.ratings.list(params)
                .then(function(response) {
                    if (response.success) {
                        self.ratings = response.data;
                        self.applyFilters();
                        self.updateStats();
                        self.updateCharts();
                    } else {
                        Utils.toast.error('Failed to load ratings');
                    }
                })
                .catch(function(error) {
                    console.error('Ratings load error:', error);
                    Utils.toast.error('Failed to load ratings');
                })
                .finally(function() {
                    self.hideContentLoading();
                });
        },

        /**
         * Setup UI based on user role
         */
        setupUI: function() {
            // Populate period filter
            this.populatePeriodFilter();

            // Show/hide elements based on role
            if (this.isAdmin) {
                $('.admin-only').removeClass('hidden');
                $('.employee-only').addClass('hidden');
                $('#page-title').text('Employee Ratings');
                $('#page-description').text('Manage and track employee performance ratings');
            } else {
                $('.admin-only').addClass('hidden');
                $('.employee-only').removeClass('hidden');
                $('#page-title').text('My Ratings');
                $('#page-description').text('View your performance ratings and feedback');
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
                    select.append(`<option value="${emp.EmployeeID}">${Utils.string.escape(emp.Name)} (${emp.EmployeeID})</option>`);
                });

            // Also populate modal employee select
            const modalSelect = $('#modal-employee-select');
            if (modalSelect.length) {
                modalSelect.find('option:not(:first)').remove();
                this.employees.forEach(function(emp) {
                    modalSelect.append(`<option value="${emp.EmployeeID}">${Utils.string.escape(emp.Name)} (${emp.EmployeeID})</option>`);
                });
            }
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
                select.append(`<option value="${dept}">${Utils.string.escape(dept)}</option>`);
            });
        },

        /**
         * Populate period filter
         */
        populatePeriodFilter: function() {
            const select = $('#period-filter');
            if (!select.length) return;

            select.find('option:not(:first)').remove();

            this.periods.forEach(function(period) {
                select.append(`<option value="${period.value}">${period.label}</option>`);
            });
        },

        /**
         * Apply filters
         */
        applyFilters: function() {
            let filtered = [...this.ratings];

            // Employee filter
            if (this.filters.employeeId) {
                filtered = filtered.filter(r => r.EmployeeID === this.filters.employeeId);
            }

            // Period filter
            if (this.filters.period) {
                filtered = filtered.filter(r => r.Period === this.filters.period);
            }

            // Search filter
            if (this.filters.search) {
                const search = this.filters.search.toLowerCase();
                filtered = filtered.filter(r => 
                    (r.employeeName && r.employeeName.toLowerCase().includes(search)) ||
                    (r.EmployeeID && r.EmployeeID.toLowerCase().includes(search)) ||
                    (r.Notes && r.Notes.toLowerCase().includes(search))
                );
            }

            // Sort by rating date (newest first)
            filtered.sort((a, b) => {
                if (a.Period !== b.Period) {
                    return b.Period.localeCompare(a.Period);
                }
                return new Date(b.RatedOn) - new Date(a.RatedOn);
            });

            this.filteredRatings = filtered;
            this.pagination.total = filtered.length;
            this.pagination.page = 1;

            this.renderRatings();
            this.updateStats();
        },

        /**
         * Clear filters
         */
        clearFilters: function() {
            this.filters = {
                employeeId: '',
                department: '',
                period: '',
                search: ''
            };

            $('#employee-filter').val('');
            $('#department-filter').val('');
            $('#period-filter').val('');
            $('#search-input').val('');

            this.loadRatingsData();
        },

        /**
         * Render ratings
         */
        renderRatings: function() {
            const currentView = $('.view-toggle-btn.bg-primary-600').data('view') || 'grid';
            
            if (currentView === 'grid') {
                this.renderGridView();
            } else {
                this.renderTableView();
            }

            this.renderPagination();
        },

        /**
         * Render grid view
         */
        renderGridView: function() {
            const container = $('#ratings-grid');
            container.empty().removeClass('hidden');
            $('#ratings-table-container').addClass('hidden');

            const { page, perPage } = this.pagination;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.filteredRatings.slice(start, end);

            if (pageData.length === 0) {
                container.html(this.getEmptyState());
                return;
            }

            const self = this;

            pageData.forEach(function(rating) {
                const avgRating = self.calculateAverage(rating);
                const employee = self.employees.find(e => e.EmployeeID === rating.EmployeeID);

                container.append(`
                    <div class="rating-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer"
                         data-rating-id="${rating.RatingID}">
                        
                        <!-- Header -->
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                                    ${Utils.string.initials(rating.employeeName || 'U')}
                                </div>
                                <div>
                                    <h3 class="font-semibold text-gray-900">${Utils.string.escape(rating.employeeName || 'Unknown')}</h3>
                                    <p class="text-sm text-gray-500">${rating.EmployeeID}</p>
                                </div>
                            </div>
                            ${self.isAdmin ? `
                                <div class="flex items-center gap-1">
                                    <button class="edit-rating-btn p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            data-rating-id="${rating.RatingID}" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-rating-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            data-rating-id="${rating.RatingID}" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Period Badge -->
                        <div class="mb-4">
                            <span class="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                ${self.formatPeriod(rating.Period)}
                            </span>
                        </div>

                        <!-- Overall Rating -->
                        <div class="flex items-center justify-center mb-4">
                            <div class="text-center">
                                <div class="text-4xl font-bold ${self.getRatingColorClass(avgRating)}">${avgRating.toFixed(1)}</div>
                                <div class="flex justify-center mt-1">
                                    ${self.generateStarsHTML(avgRating)}
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Overall Rating</p>
                            </div>
                        </div>

                        <!-- Rating Breakdown -->
                        <div class="space-y-3">
                            ${self.categories.map(cat => `
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">${cat}</span>
                                    <div class="flex items-center gap-2">
                                        <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div class="h-full ${self.getRatingBgClass(rating[cat])} rounded-full transition-all duration-500"
                                                 style="width: ${(rating[cat] / 5) * 100}%"></div>
                                        </div>
                                        <span class="text-sm font-medium ${self.getRatingColorClass(rating[cat])}">${rating[cat]}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Footer -->
                        <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <span>
                                <i class="fas fa-user mr-1"></i>
                                Rated by: ${rating.RatedBy || 'Admin'}
                            </span>
                            <span>
                                <i class="fas fa-clock mr-1"></i>
                                ${Utils.date.timeAgo(rating.RatedOn)}
                            </span>
                        </div>

                        ${rating.Notes ? `
                            <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-600 line-clamp-2">
                                    <i class="fas fa-comment-alt text-gray-400 mr-1"></i>
                                    ${Utils.string.escape(rating.Notes)}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                `);
            });
        },

        /**
         * Render table view
         */
        renderTableView: function() {
            const container = $('#ratings-table-body');
            container.empty();
            $('#ratings-grid').addClass('hidden');
            $('#ratings-table-container').removeClass('hidden');

            const { page, perPage } = this.pagination;
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const pageData = this.filteredRatings.slice(start, end);

            if (pageData.length === 0) {
                container.html(`
                    <tr>
                        <td colspan="${this.isAdmin ? 10 : 8}" class="px-6 py-12 text-center">
                            ${this.getEmptyState()}
                        </td>
                    </tr>
                `);
                return;
            }

            const self = this;

            pageData.forEach(function(rating, index) {
                const avgRating = self.calculateAverage(rating);
                const rowNum = start + index + 1;

                container.append(`
                    <tr class="rating-row hover:bg-gray-50 transition-colors cursor-pointer" data-rating-id="${rating.RatingID}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rowNum}</td>
                        ${self.isAdmin ? `
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-medium">
                                        ${Utils.string.initials(rating.employeeName || 'U')}
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm font-medium text-gray-900">${Utils.string.escape(rating.employeeName || 'Unknown')}</p>
                                        <p class="text-xs text-gray-500">${rating.EmployeeID}</p>
                                    </div>
                                </div>
                            </td>
                        ` : ''}
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${self.formatPeriod(rating.Period)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-1">
                                ${self.generateMiniStars(rating.Quality)}
                                <span class="text-sm font-medium ml-1">${rating.Quality}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-1">
                                ${self.generateMiniStars(rating.Punctuality)}
                                <span class="text-sm font-medium ml-1">${rating.Punctuality}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-1">
                                ${self.generateMiniStars(rating.Reliability)}
                                <span class="text-sm font-medium ml-1">${rating.Reliability}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-1">
                                ${self.generateMiniStars(rating.Deadlines)}
                                <span class="text-sm font-medium ml-1">${rating.Deadlines}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-bold ${self.getRatingColorClass(avgRating)}">${avgRating.toFixed(1)}</span>
                                ${self.generateMiniStars(avgRating)}
                            </div>
                        </td>
                        ${self.isAdmin ? `
                            <td class="px-6 py-4 whitespace-nowrap text-right">
                                <button class="edit-rating-btn p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        data-rating-id="${rating.RatingID}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-rating-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        data-rating-id="${rating.RatingID}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        ` : ''}
                    </tr>
                `);
            });
        },

        /**
         * Get empty state HTML
         */
        getEmptyState: function() {
            return `
                <div class="text-center text-gray-500 py-12">
                    <i class="fas fa-star text-4xl text-gray-300 mb-3"></i>
                    <p class="text-lg font-medium">No ratings found</p>
                    <p class="text-sm mt-1">
                        ${this.isAdmin 
                            ? 'Start by adding ratings for your employees' 
                            : 'You don\'t have any ratings yet'}
                    </p>
                    ${this.isAdmin ? `
                        <button id="empty-add-rating-btn" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                onclick="RatingsPage.showAddRatingModal()">
                            <i class="fas fa-plus mr-2"></i>Add Rating
                        </button>
                    ` : ''}
                </div>
            `;
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
            $('#page-info').text(`Showing ${start}-${end} of ${total} ratings`);

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
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                    html += `
                        <button class="page-btn px-3 py-2 rounded-lg border ${i === page ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-100'}"
                                data-page="${i}">${i}</button>
                    `;
                } else if (i === page - 2 || i === page + 2) {
                    html += '<span class="px-2 text-gray-400">...</span>';
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
            this.renderRatings();
            
            $('html, body').animate({
                scrollTop: $('#ratings-container').offset().top - 100
            }, 300);
        },

        /**
         * Update statistics
         */
        updateStats: function() {
            const data = this.filteredRatings;
            
            if (data.length === 0) {
                $('#avg-quality').text('-');
                $('#avg-punctuality').text('-');
                $('#avg-reliability').text('-');
                $('#avg-deadlines').text('-');
                $('#overall-avg').text('-');
                $('#total-ratings').text('0');
                return;
            }

            const avgQuality = this.calculateCategoryAverage(data, 'Quality');
            const avgPunctuality = this.calculateCategoryAverage(data, 'Punctuality');
            const avgReliability = this.calculateCategoryAverage(data, 'Reliability');
            const avgDeadlines = this.calculateCategoryAverage(data, 'Deadlines');
            const overallAvg = (avgQuality + avgPunctuality + avgReliability + avgDeadlines) / 4;

            this.animateValue('#avg-quality', avgQuality);
            this.animateValue('#avg-punctuality', avgPunctuality);
            this.animateValue('#avg-reliability', avgReliability);
            this.animateValue('#avg-deadlines', avgDeadlines);
            this.animateValue('#overall-avg', overallAvg);
            $('#total-ratings').text(data.length);

            // Update star displays
            $('#quality-stars').html(this.generateStarsHTML(avgQuality));
            $('#punctuality-stars').html(this.generateStarsHTML(avgPunctuality));
            $('#reliability-stars').html(this.generateStarsHTML(avgReliability));
            $('#deadlines-stars').html(this.generateStarsHTML(avgDeadlines));
            $('#overall-stars').html(this.generateStarsHTML(overallAvg));
        },

        /**
         * Calculate category average
         */
        calculateCategoryAverage: function(data, category) {
            if (data.length === 0) return 0;
            const sum = data.reduce((acc, r) => acc + (parseFloat(r[category]) || 0), 0);
            return sum / data.length;
        },

        /**
         * Calculate average rating for a single record
         */
        calculateAverage: function(rating) {
            const sum = this.categories.reduce((acc, cat) => acc + (parseFloat(rating[cat]) || 0), 0);
            return sum / this.categories.length;
        },

        /**
         * Animate value
         */
        animateValue: function(selector, target) {
            const element = $(selector);
            const duration = 500;
            const start = parseFloat(element.text()) || 0;
            const increment = (target - start) / (duration / 16);
            let current = start;

            const timer = setInterval(function() {
                current += increment;
                if ((increment > 0 && current >= target) || (increment < 0 && current <= target) || increment === 0) {
                    element.text(target.toFixed(1));
                    clearInterval(timer);
                } else {
                    element.text(current.toFixed(1));
                }
            }, 16);
        },

        /**
         * Initialize charts
         */
        initCharts: function() {
            this.initRadarChart();
            this.initTrendChart();
            this.initDistributionChart();
        },

        /**
         * Initialize radar chart
         */
        initRadarChart: function() {
            const ctx = document.getElementById('radar-chart-canvas');
            if (!ctx) return;

            if (this.charts.radar) {
                this.charts.radar.destroy();
            }

            const data = this.filteredRatings;
            
            const avgData = this.categories.map(cat => this.calculateCategoryAverage(data, cat));

            this.charts.radar = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: this.categories,
                    datasets: [{
                        label: 'Average Rating',
                        data: avgData,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 5,
                            min: 0,
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
         * Initialize trend chart
         */
        initTrendChart: function() {
            const ctx = document.getElementById('trend-chart-canvas');
            if (!ctx) return;

            if (this.charts.trend) {
                this.charts.trend.destroy();
            }

            // Group ratings by period
            const periodData = {};
            this.filteredRatings.forEach(rating => {
                if (!periodData[rating.Period]) {
                    periodData[rating.Period] = [];
                }
                periodData[rating.Period].push(rating);
            });

            // Get last 6 periods
            const sortedPeriods = Object.keys(periodData).sort().slice(-6);

            const datasets = this.categories.map((cat, index) => {
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
                return {
                    label: cat,
                    data: sortedPeriods.map(period => {
                        const ratings = periodData[period] || [];
                        return this.calculateCategoryAverage(ratings, cat);
                    }),
                    borderColor: colors[index],
                    backgroundColor: colors[index] + '20',
                    fill: false,
                    tension: 0.4
                };
            });

            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedPeriods.map(p => this.formatPeriod(p)),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            ticks: {
                                stepSize: 1
                            }
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
         * Initialize distribution chart
         */
        initDistributionChart: function() {
            const ctx = document.getElementById('distribution-chart-canvas');
            if (!ctx) return;

            if (this.charts.distribution) {
                this.charts.distribution.destroy();
            }

            // Calculate rating distribution
            const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
            
            this.filteredRatings.forEach(rating => {
                const avg = Math.round(this.calculateAverage(rating));
                if (avg >= 1 && avg <= 5) {
                    distribution[avg - 1]++;
                }
            });

            this.charts.distribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                    datasets: [{
                        label: 'Number of Ratings',
                        data: distribution,
                        backgroundColor: [
                            '#EF4444',
                            '#F97316',
                            '#F59E0B',
                            '#84CC16',
                            '#10B981'
                        ],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
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
         * Update charts
         */
        updateCharts: function() {
            this.initRadarChart();
            this.initTrendChart();
            this.initDistributionChart();
        },

        /**
         * Toggle view
         */
        toggleView: function(view) {
            $('.view-toggle-btn').removeClass('bg-primary-600 text-white').addClass('bg-white text-gray-700 border');
            $(`.view-toggle-btn[data-view="${view}"]`).removeClass('bg-white text-gray-700 border').addClass('bg-primary-600 text-white');

            this.renderRatings();
        },

        /**
         * Show add rating modal
         */
        showAddRatingModal: function(preselectedEmployeeId = null) {
            this.isAddMode = true;
            this.editingRating = null;

            // Reset form
            $('#rating-form')[0].reset();
            $('#modal-title').text('Add New Rating');
            $('#rating-id').val('');

            // Enable employee select
            $('#modal-employee-select').prop('disabled', false);

            if (preselectedEmployeeId) {
                $('#modal-employee-select').val(preselectedEmployeeId);
                this.selectedEmployee = preselectedEmployeeId;
            }

            // Set default period to current month
            const currentPeriod = this.periods[0]?.value;
            $('#modal-period').val(currentPeriod);

            // Reset star inputs
            this.categories.forEach(cat => {
                this.setStarRating($(`#star-${cat.toLowerCase()}`), 0);
                $(`#rating-${cat.toLowerCase()}`).val('');
            });

            Utils.modal.show('rating-modal');
        },

        /**
         * Show edit rating modal
         */
        showEditRatingModal: function(ratingId) {
            const rating = this.ratings.find(r => r.RatingID === ratingId);
            if (!rating) {
                Utils.toast.error('Rating not found');
                return;
            }

            this.isAddMode = false;
            this.editingRating = rating;

            $('#modal-title').text('Edit Rating');
            $('#rating-id').val(rating.RatingID);

            // Set and disable employee select
            $('#modal-employee-select').val(rating.EmployeeID).prop('disabled', true);

            // Set period
            $('#modal-period').val(rating.Period);

            // Set ratings
            this.categories.forEach(cat => {
                const value = rating[cat] || 0;
                this.setStarRating($(`#star-${cat.toLowerCase()}`), value);
                $(`#rating-${cat.toLowerCase()}`).val(value);
            });

            // Set notes
            $('#modal-notes').val(rating.Notes || '');

            Utils.modal.show('rating-modal');
        },

        /**
         * Show rating details modal
         */
        showRatingDetails: function(ratingId) {
            const rating = this.ratings.find(r => r.RatingID === ratingId);
            if (!rating) return;

            const avgRating = this.calculateAverage(rating);
            const employee = this.employees.find(e => e.EmployeeID === rating.EmployeeID);

            const content = `
                <div class="p-6">
                    <!-- Header -->
                    <div class="flex items-center gap-4 mb-6">
                        <div class="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl">
                            ${Utils.string.initials(rating.employeeName || 'U')}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">${Utils.string.escape(rating.employeeName || 'Unknown')}</h3>
                            <p class="text-gray-500">${rating.EmployeeID} • ${employee?.Department || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Period & Overall -->
                    <div class="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p class="text-sm text-gray-500">Rating Period</p>
                            <p class="font-semibold text-gray-900">${this.formatPeriod(rating.Period)}</p>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl font-bold ${this.getRatingColorClass(avgRating)}">${avgRating.toFixed(1)}</div>
                            <div class="flex justify-center">${this.generateStarsHTML(avgRating)}</div>
                        </div>
                    </div>

                    <!-- Detailed Ratings -->
                    <div class="space-y-4 mb-6">
                        ${this.categories.map(cat => `
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg ${this.getCategoryBgClass(cat)} flex items-center justify-center">
                                        <i class="${this.getCategoryIcon(cat)} ${this.getCategoryTextClass(cat)}"></i>
                                    </div>
                                    <span class="font-medium text-gray-700">${cat}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div class="${this.getRatingBgClass(rating[cat])} h-full rounded-full" 
                                             style="width: ${(rating[cat] / 5) * 100}%"></div>
                                    </div>
                                    <span class="font-bold ${this.getRatingColorClass(rating[cat])} w-8 text-right">${rating[cat]}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Notes -->
                    ${rating.Notes ? `
                        <div class="p-4 bg-blue-50 rounded-xl mb-6">
                            <p class="text-sm font-medium text-blue-900 mb-1">
                                <i class="fas fa-comment-alt mr-2"></i>Notes
                            </p>
                            <p class="text-blue-800">${Utils.string.escape(rating.Notes)}</p>
                        </div>
                    ` : ''}

                    <!-- Meta -->
                    <div class="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                        <span><i class="fas fa-user mr-1"></i> Rated by: ${rating.RatedBy || 'Admin'}</span>
                        <span><i class="fas fa-clock mr-1"></i> ${Utils.date.format(rating.RatedOn, 'full')}</span>
                    </div>
                </div>
            `;

            $('#view-rating-content').html(content);
            Utils.modal.show('view-rating-modal');
        },

        /**
         * Save rating
         */
        saveRating: function() {
            const self = this;

            // Validate
            const employeeId = $('#modal-employee-select').val();
            const period = $('#modal-period').val();

            if (!employeeId) {
                Utils.toast.error('Please select an employee');
                return;
            }

            if (!period) {
                Utils.toast.error('Please select a period');
                return;
            }

            // Get ratings
            const ratings = {};
            let hasRating = false;

            this.categories.forEach(cat => {
                const value = parseInt($(`#rating-${cat.toLowerCase()}`).val()) || 0;
                if (value > 0) {
                    ratings[cat.toLowerCase()] = value;
                    hasRating = true;
                }
            });

            if (!hasRating) {
                Utils.toast.error('Please provide at least one rating');
                return;
            }

            const notes = $('#modal-notes').val().trim();

            const submitBtn = $('#rating-form button[type="submit"]');
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Saving...');

            const data = {
                adminId: this.user.employeeId,
                employeeId: employeeId,
                period: period,
                quality: ratings.quality || 0,
                punctuality: ratings.punctuality || 0,
                reliability: ratings.reliability || 0,
                deadlines: ratings.deadlines || 0,
                notes: notes
            };

            let apiCall;

            if (this.isAddMode) {
                apiCall = API.ratings.add(data);
            } else {
                data.ratingId = this.editingRating.RatingID;
                data.updates = {
                    Quality: ratings.quality || 0,
                    Punctuality: ratings.punctuality || 0,
                    Reliability: ratings.reliability || 0,
                    Deadlines: ratings.deadlines || 0,
                    Notes: notes,
                    Period: period
                };
                apiCall = API.ratings.update(data);
            }

            apiCall
                .then(function(response) {
                    if (response.success) {
                        Utils.toast.success(self.isAddMode ? 'Rating added successfully' : 'Rating updated successfully');
                        Utils.modal.hide('rating-modal');
                        self.loadRatingsData();
                    } else {
                        Utils.toast.error(response.error || 'Failed to save rating');
                    }
                })
                .catch(function(error) {
                    Utils.toast.error(error.message || 'Failed to save rating');
                })
                .finally(function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-save mr-2"></i>Save Rating');
                });
        },

        /**
         * Confirm delete rating
         */
        confirmDeleteRating: function(ratingId) {
            const self = this;

            Utils.modal.confirm({
                title: 'Delete Rating',
                message: 'Are you sure you want to delete this rating? This action cannot be undone.',
                confirmText: 'Delete',
                confirmClass: 'bg-red-600 hover:bg-red-700',
                onConfirm: function() {
                    self.deleteRating(ratingId);
                }
            });
        },

        /**
         * Delete rating
         */
        deleteRating: function(ratingId) {
            const self = this;

            Utils.toast.info('Deleting rating...');

            // Note: You may need to add a delete endpoint in your API
            API.request('POST', { 
                action: 'ratings/delete',
                adminId: this.user.employeeId,
                ratingId: ratingId 
            })
            .then(function(response) {
                if (response.success) {
                    Utils.toast.success('Rating deleted successfully');
                    self.loadRatingsData();
                } else {
                    Utils.toast.error(response.error || 'Failed to delete rating');
                }
            })
            .catch(function(error) {
                Utils.toast.error(error.message || 'Failed to delete rating');
            });
        },

        /**
         * Set star rating
         */
        setStarRating: function(container, value) {
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
         * Highlight stars on hover
         */
        highlightStars: function(container, value) {
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
         * Update slider color
         */
        updateSliderColor: function(slider, value) {
            const percent = (value / 5) * 100;
            let color;
            
            if (value < 2) color = '#EF4444';
            else if (value < 3) color = '#F97316';
            else if (value < 4) color = '#F59E0B';
            else color = '#10B981';

            slider.css('background', `linear-gradient(to right, ${color} ${percent}%, #E5E7EB ${percent}%)`);
        },

        /**
         * Generate stars HTML
         */
        generateStarsHTML: function(rating) {
            let html = '';
            for (let i = 1; i <= 5; i++) {
                if (rating >= i) {
                    html += '<i class="fas fa-star text-yellow-400"></i>';
                } else if (rating >= i - 0.5) {
                    html += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
                } else {
                    html += '<i class="far fa-star text-gray-300"></i>';
                }
            }
            return html;
        },

        /**
         * Generate mini stars HTML
         */
        generateMiniStars: function(rating) {
            let html = '<div class="flex gap-0.5">';
            for (let i = 1; i <= 5; i++) {
                if (rating >= i) {
                    html += '<i class="fas fa-star text-yellow-400 text-xs"></i>';
                } else {
                    html += '<i class="far fa-star text-gray-300 text-xs"></i>';
                }
            }
            html += '</div>';
            return html;
        },

        /**
         * Get rating color class
         */
        getRatingColorClass: function(rating) {
            if (rating >= 4) return 'text-green-600';
            if (rating >= 3) return 'text-yellow-600';
            if (rating >= 2) return 'text-orange-600';
            return 'text-red-600';
        },

        /**
         * Get rating background class
         */
        getRatingBgClass: function(rating) {
            if (rating >= 4) return 'bg-green-500';
            if (rating >= 3) return 'bg-yellow-500';
            if (rating >= 2) return 'bg-orange-500';
            return 'bg-red-500';
        },

        /**
         * Get category icon
         */
        getCategoryIcon: function(category) {
            const icons = {
                'Quality': 'fas fa-gem',
                'Punctuality': 'fas fa-clock',
                'Reliability': 'fas fa-shield-alt',
                'Deadlines': 'fas fa-calendar-check'
            };
            return icons[category] || 'fas fa-star';
        },

        /**
         * Get category background class
         */
        getCategoryBgClass: function(category) {
            const classes = {
                'Quality': 'bg-purple-100',
                'Punctuality': 'bg-blue-100',
                'Reliability': 'bg-green-100',
                'Deadlines': 'bg-orange-100'
            };
            return classes[category] || 'bg-gray-100';
        },

        /**
         * Get category text class
         */
        getCategoryTextClass: function(category) {
            const classes = {
                'Quality': 'text-purple-600',
                'Punctuality': 'text-blue-600',
                'Reliability': 'text-green-600',
                'Deadlines': 'text-orange-600'
            };
            return classes[category] || 'text-gray-600';
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
         * Export ratings
         */
        exportRatings: function() {
            if (this.filteredRatings.length === 0) {
                Utils.toast.warning('No data to export');
                return;
            }

            Utils.toast.info('Generating export...');

            const columns = this.isAdmin 
                ? ['EmployeeID', 'employeeName', 'Period', 'Quality', 'Punctuality', 'Reliability', 'Deadlines', 'Notes', 'RatedOn']
                : ['Period', 'Quality', 'Punctuality', 'Reliability', 'Deadlines', 'Notes', 'RatedOn'];

            const headers = this.isAdmin
                ? ['Employee ID', 'Name', 'Period', 'Quality', 'Punctuality', 'Reliability', 'Deadlines', 'Notes', 'Rated On']
                : ['Period', 'Quality', 'Punctuality', 'Reliability', 'Deadlines', 'Notes', 'Rated On'];

            // Add average column
            const dataWithAvg = this.filteredRatings.map(r => ({
                ...r,
                Average: this.calculateAverage(r).toFixed(2)
            }));

            const csv = Utils.export.toCSV(dataWithAvg, [...columns, 'Average'], [...headers, 'Average']);
            const filename = `ratings-export-${Utils.date.format(new Date(), 'iso')}.csv`;

            Utils.export.download(csv, filename, 'text/csv');
            Utils.toast.success('Export downloaded');
        },

        /**
         * Refresh data
         */
        refreshData: function() {
            const self = this;

            $('#refresh-btn i').addClass('animate-spin');
            
            this.loadRatingsData()
                .then(function() {
                    Utils.toast.success('Data refreshed');
                })
                .finally(function() {
                    $('#refresh-btn i').removeClass('animate-spin');
                });
        },

        /**
         * Load employee current ratings (for modal)
         */
        loadEmployeeCurrentRatings: function() {
            if (!this.selectedEmployee) return;

            // Find existing ratings for the selected period
            const period = $('#modal-period').val();
            const existing = this.ratings.find(r => 
                r.EmployeeID === this.selectedEmployee && r.Period === period
            );

            if (existing && this.isAddMode) {
                Utils.toast.warning('A rating already exists for this employee in the selected period. Consider editing it instead.');
            }
        },

        /**
         * Hide modals
         */
        hideModals: function() {
            Utils.modal.hide('rating-modal');
            Utils.modal.hide('view-rating-modal');
            this.editingRating = null;
            this.isAddMode = false;
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
        RatingsPage.init();
    });

    $(window).on('beforeunload', function() {
        RatingsPage.destroy();
    });

    window.RatingsPage = RatingsPage;

})();