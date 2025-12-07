/**
 * SquidX HRM — Ratings Page Controller
 * ======================================
 * Handles all employee ratings management including:
 * - Loading and displaying monthly ratings
 * - Rating CRUD operations
 * - Summary statistics and charts
 * - Filtering and searching
 * - Month-based navigation
 * 
 * Dependencies:
 *   - jQuery
 *   - Chart.js
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const RatingsPage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * Currently selected month (YYYY-MM format)
     */
    let selectedMonth = null;

    /**
     * All ratings for the selected month
     */
    let ratings = [];

    /**
     * Filtered ratings based on current filters
     */
    let filteredRatings = [];

    /**
     * All team members
     */
    let members = [];

    /**
     * Application settings
     */
    let settings = {};

    /**
     * Loading state flag
     */
    let isLoading = false;

    /**
     * Saving state flag
     */
    let isSaving = false;

    /**
     * Rating being edited (null for new rating)
     */
    let editingRatingId = null;

    /**
     * Selected employee for trend chart
     */
    let selectedEmployeeForTrend = null;

    /**
     * Chart instances for cleanup
     */
    let charts = {
        distribution: null,
        departmentAvg: null,
        trend: null
    };

    /**
     * Current pagination state
     */
    let pagination = {
        page: 1,
        perPage: 10,
        totalPages: 1
    };

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    /**
     * Score badge configurations
     */
    const SCORE_BADGES = {
        high: { 
            min: 8, 
            bgClass: 'bg-green-100', 
            textClass: 'text-green-800', 
            label: 'Excellent',
            color: '#10B981'
        },
        medium: { 
            min: 5, 
            bgClass: 'bg-yellow-100', 
            textClass: 'text-yellow-800', 
            label: 'Good',
            color: '#F59E0B'
        },
        low: { 
            min: 0, 
            bgClass: 'bg-red-100', 
            textClass: 'text-red-800', 
            label: 'Needs Improvement',
            color: '#EF4444'
        }
    };

    /**
     * Rating categories for detailed breakdown
     */
    const RATING_CATEGORIES = ['quality', 'punctuality', 'reliability', 'deadlines'];

    /**
     * Chart color palette
     */
    const CHART_COLORS = {
        primary: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        secondary: '#6B7280',
        purple: '#8B5CF6',
        pink: '#EC4899'
    };

    /**
     * DOM Selectors
     */
    const SELECTORS = {
        // Page containers
        pageContainer: '#ratingsPageContainer',
        loadingOverlay: '#ratingsLoadingOverlay',
        
        // Month navigation
        selectedMonthDisplay: '#selectedMonthDisplay',
        btnPrevMonth: '#btnPrevMonth',
        btnNextMonth: '#btnNextMonth',
        btnCurrentMonth: '#btnCurrentMonth',
        
        // Summary Cards
        summaryRatedCount: '#summaryRatedCount',
        summaryAverageRating: '#summaryAverageRating',
        summaryHighestScore: '#summaryHighestScore',
        summaryLowestScore: '#summaryLowestScore',
        summaryTotalRatings: '#summaryTotalRatings',
        summaryTrendIndicator: '#summaryTrendIndicator',
        
        // Filters
        filterDepartment: '#filterDepartment',
        filterEmployee: '#filterEmployee',
        filterScoreRange: '#filterScoreRange',
        searchInput: '#searchInput',
        btnClearFilters: '#btnClearFilters',
        
        // Action buttons
        btnAddRating: '#btnAddRating',
        btnRefresh: '#btnRefresh',
        btnExport: '#btnExport',
        
        // Table
        ratingsTableContainer: '#ratingsTableContainer',
        ratingsTable: '#ratingsTable',
        ratingsTableBody: '#ratingsTableBody',
        
        // Pagination
        paginationContainer: '#paginationContainer',
        paginationInfo: '#paginationInfo',
        btnPrevPage: '#btnPrevPage',
        btnNextPage: '#btnNextPage',
        
        // Charts
        chartsContainer: '#chartsContainer',
        chartDistribution: '#chartDistribution',
        chartDepartmentAvg: '#chartDepartmentAvg',
        chartTrend: '#chartTrend',
        trendEmployeeSelect: '#trendEmployeeSelect',
        
        // Rating Modal
        ratingModal: '#ratingModal',
        ratingForm: '#ratingForm',
        ratingModalTitle: '#ratingModalTitle',
        ratingId: '#ratingId',
        ratingEmployeeSelect: '#ratingEmployeeSelect',
        ratingMonth: '#ratingMonth',
        ratingQuality: '#ratingQuality',
        ratingQualityValue: '#ratingQualityValue',
        ratingPunctuality: '#ratingPunctuality',
        ratingPunctualityValue: '#ratingPunctualityValue',
        ratingReliability: '#ratingReliability',
        ratingReliabilityValue: '#ratingReliabilityValue',
        ratingDeadlines: '#ratingDeadlines',
        ratingDeadlinesValue: '#ratingDeadlinesValue',
        ratingComments: '#ratingComments',
        btnSaveRating: '#btnSaveRating',
        btnCancelRating: '#btnCancelRating',
        btnCloseRatingModal: '#btnCloseRatingModal',
        btnDeleteRating: '#btnDeleteRating',
        
        // Empty State
        emptyState: '#ratingsEmptyState'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the ratings page
     */
    const init = async () => {
        CONFIG.log('Initializing Ratings Page...');
        
        try {
            // Show loading state
            showPageLoading();
            
            // Step 1: Load settings
            await loadSettings();
            
            // Step 2: Initialize selected month
            initializeMonth();
            
            // Step 3: Load all members
            await loadMembers();
            
            // Step 4: Load ratings for selected month
            await loadRatings();
            
            // Step 5: Setup event listeners
            setupEventListeners();
            
            // Step 6: Populate filter dropdowns
            populateFilters();
            
            // Step 7: Apply initial filters & render
            applyFilters();
            
            // Step 8: Render charts
            renderCharts();
            
            CONFIG.log('Ratings Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Ratings Page:', error);
            Utils.showToast('Failed to load ratings page. Please refresh.', 'error');
        } finally {
            hidePageLoading();
        }
    };

    /**
     * Load application settings
     */
    const loadSettings = async () => {
        try {
            settings = await API.getSettings();
            CONFIG.log('Settings loaded:', settings);
        } catch (error) {
            CONFIG.logError('Failed to load settings:', error);
            settings = {};
        }
    };

    /**
     * Initialize selected month from URL or use current month
     */
    const initializeMonth = () => {
        const urlMonth = Utils.getUrlParam('month');
        
        if (urlMonth && isValidMonth(urlMonth)) {
            selectedMonth = urlMonth;
        } else {
            selectedMonth = getCurrentMonth();
        }
        
        // Update URL without reload
        Utils.setUrlParam('month', selectedMonth);
        
        // Update display
        updateMonthDisplay();
        
        CONFIG.log('Selected month:', selectedMonth);
    };

    /**
     * Load all members
     */
    const loadMembers = async () => {
        try {
            members = await API.getAllMembers();
            // Filter only active members
            members = members.filter(m => m.status === 'Active');
            CONFIG.log(`Loaded ${members.length} active members`);
        } catch (error) {
            CONFIG.logError('Failed to load members:', error);
            members = [];
            throw error;
        }
    };

    /**
     * Load ratings for selected month
     */
    const loadRatings = async () => {
        try {
            showTableLoading();
            
            // Get all ratings and filter by month
            const allRatings = await API.getAllRatings();
            
            // Filter ratings for the selected month
            ratings = allRatings.filter(r => {
                if (!r.date) return false;
                const ratingMonth = r.date.substring(0, 7); // YYYY-MM
                return ratingMonth === selectedMonth;
            });
            
            // Sort by date descending, then by member name
            ratings.sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                if (dateCompare !== 0) return dateCompare;
                
                const memberA = getEmployeeById(a.memberId);
                const memberB = getEmployeeById(b.memberId);
                return (memberA?.name || '').localeCompare(memberB?.name || '');
            });
            
            CONFIG.log(`Loaded ${ratings.length} ratings for ${selectedMonth}`);
            
        } catch (error) {
            CONFIG.logError('Failed to load ratings:', error);
            ratings = [];
            throw error;
        }
    };

    // ============================================
    // 📅 MONTH NAVIGATION
    // ============================================

    /**
     * Get current month in YYYY-MM format
     */
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    /**
     * Validate month format
     */
    const isValidMonth = (monthStr) => {
        if (!monthStr) return false;
        const regex = /^\d{4}-\d{2}$/;
        if (!regex.test(monthStr)) return false;
        
        const [year, month] = monthStr.split('-').map(Number);
        return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
    };

    /**
     * Parse month string to Date object
     */
    const parseMonth = (monthStr) => {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month - 1, 1);
    };

    /**
     * Format month for display
     */
    const formatMonthDisplay = (monthStr) => {
        const date = parseMonth(monthStr);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    /**
     * Update the month display element
     */
    const updateMonthDisplay = () => {
        $(SELECTORS.selectedMonthDisplay).text(formatMonthDisplay(selectedMonth));
        
        // Update month input in modal if exists
        $(SELECTORS.ratingMonth).val(selectedMonth);
    };

    /**
     * Navigate to previous month
     */
    const prevMonth = async () => {
        const date = parseMonth(selectedMonth);
        date.setMonth(date.getMonth() - 1);
        selectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        Utils.setUrlParam('month', selectedMonth);
        updateMonthDisplay();
        
        await loadRatings();
        applyFilters();
        renderCharts();
    };

    /**
     * Navigate to next month
     */
    const nextMonth = async () => {
        const date = parseMonth(selectedMonth);
        date.setMonth(date.getMonth() + 1);
        
        // Don't allow future months
        const now = new Date();
        if (date > now) {
            Utils.showToast('Cannot view future months', 'warning');
            return;
        }
        
        selectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        Utils.setUrlParam('month', selectedMonth);
        updateMonthDisplay();
        
        await loadRatings();
        applyFilters();
        renderCharts();
    };

    /**
     * Go to current month
     */
    const goToCurrentMonth = async () => {
        selectedMonth = getCurrentMonth();
        
        Utils.setUrlParam('month', selectedMonth);
        updateMonthDisplay();
        
        await loadRatings();
        applyFilters();
        renderCharts();
    };

    // ============================================
    // 📊 SUMMARY & STATISTICS
    // ============================================

    /**
     * Calculate summary statistics from ratings
     */
    const calculateSummaryStats = (ratingsArray) => {
        if (!ratingsArray || ratingsArray.length === 0) {
            return {
                count: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                distribution: { low: 0, medium: 0, high: 0 }
            };
        }
        
        // Calculate average score for each rating
        const scores = ratingsArray.map(r => calculateAverageScore(r));
        const validScores = scores.filter(s => s > 0);
        
        if (validScores.length === 0) {
            return {
                count: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                distribution: { low: 0, medium: 0, high: 0 }
            };
        }
        
        const sum = validScores.reduce((a, b) => a + b, 0);
        const average = sum / validScores.length;
        const highest = Math.max(...validScores);
        const lowest = Math.min(...validScores);
        
        // Calculate distribution
        const distribution = {
            low: validScores.filter(s => s < 5).length,
            medium: validScores.filter(s => s >= 5 && s < 8).length,
            high: validScores.filter(s => s >= 8).length
        };
        
        // Get unique employees rated
        const uniqueEmployees = new Set(ratingsArray.map(r => r.memberId));
        
        return {
            count: uniqueEmployees.size,
            totalRatings: ratingsArray.length,
            average: average,
            highest: highest,
            lowest: lowest,
            distribution: distribution
        };
    };

    /**
     * Calculate average score from a rating object
     */
    const calculateAverageScore = (rating) => {
        const values = [
            parseFloat(rating.quality) || 0,
            parseFloat(rating.punctuality) || 0,
            parseFloat(rating.reliability) || 0,
            parseFloat(rating.deadlines) || 0
        ].filter(v => v > 0);
        
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    };

    /**
     * Update summary cards
     */
    const updateSummaryCards = () => {
        const stats = calculateSummaryStats(filteredRatings);
        
        $(SELECTORS.summaryRatedCount).text(stats.count);
        $(SELECTORS.summaryAverageRating).text(stats.average.toFixed(1));
        $(SELECTORS.summaryHighestScore).text(stats.highest.toFixed(1));
        $(SELECTORS.summaryLowestScore).text(stats.lowest.toFixed(1));
        
        if ($(SELECTORS.summaryTotalRatings).length) {
            $(SELECTORS.summaryTotalRatings).text(stats.totalRatings);
        }
        
        // Add color indicators
        updateScoreColorIndicator(SELECTORS.summaryAverageRating, stats.average);
        updateScoreColorIndicator(SELECTORS.summaryHighestScore, stats.highest);
        updateScoreColorIndicator(SELECTORS.summaryLowestScore, stats.lowest);
    };

    /**
     * Update score color indicator
     */
    const updateScoreColorIndicator = (selector, score) => {
        const $el = $(selector);
        $el.removeClass('text-green-600 text-yellow-600 text-red-600');
        
        if (score >= 8) {
            $el.addClass('text-green-600');
        } else if (score >= 5) {
            $el.addClass('text-yellow-600');
        } else if (score > 0) {
            $el.addClass('text-red-600');
        }
    };

    // ============================================
    // 🔍 FILTERING
    // ============================================

    /**
     * Populate filter dropdowns
     */
    const populateFilters = () => {
        // Department filter
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))];
        let deptOptions = '<option value="all">All Departments</option>';
        departments.sort().forEach(dept => {
            deptOptions += `<option value="${Utils.escapeHtml(dept)}">${Utils.escapeHtml(dept)}</option>`;
        });
        $(SELECTORS.filterDepartment).html(deptOptions);
        
        // Employee filter
        let empOptions = '<option value="all">All Employees</option>';
        members.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            empOptions += `<option value="${member.memberId}">${Utils.escapeHtml(member.name)}</option>`;
        });
        $(SELECTORS.filterEmployee).html(empOptions);
        
        // Score range filter
        const scoreOptions = `
            <option value="all">All Scores</option>
            <option value="high">High (8-10)</option>
            <option value="medium">Medium (5-7)</option>
            <option value="low">Low (0-4)</option>
        `;
        $(SELECTORS.filterScoreRange).html(scoreOptions);
        
        // Trend employee select
        if ($(SELECTORS.trendEmployeeSelect).length) {
            let trendOptions = '<option value="">Select Employee for Trend</option>';
            members.forEach(member => {
                trendOptions += `<option value="${member.memberId}">${Utils.escapeHtml(member.name)}</option>`;
            });
            $(SELECTORS.trendEmployeeSelect).html(trendOptions);
        }
    };

    /**
     * Apply all filters and re-render
     */
    const applyFilters = () => {
        let filtered = [...ratings];
        
        // Department filter
        const department = $(SELECTORS.filterDepartment).val();
        if (department && department !== 'all') {
            const memberIdsInDept = members
                .filter(m => m.department === department)
                .map(m => m.memberId);
            filtered = filtered.filter(r => memberIdsInDept.includes(r.memberId));
        }
        
        // Employee filter
        const employeeId = $(SELECTORS.filterEmployee).val();
        if (employeeId && employeeId !== 'all') {
            filtered = filtered.filter(r => r.memberId === employeeId);
        }
        
        // Score range filter
        const scoreRange = $(SELECTORS.filterScoreRange).val();
        if (scoreRange && scoreRange !== 'all') {
            filtered = filtered.filter(r => {
                const avgScore = calculateAverageScore(r);
                switch (scoreRange) {
                    case 'high': return avgScore >= 8;
                    case 'medium': return avgScore >= 5 && avgScore < 8;
                    case 'low': return avgScore < 5;
                    default: return true;
                }
            });
        }
        
        // Search filter
        const search = $(SELECTORS.searchInput).val();
        if (search) {
            const query = search.toLowerCase().trim();
            filtered = filtered.filter(r => {
                const member = getEmployeeById(r.memberId);
                const memberName = (member?.name || '').toLowerCase();
                const department = (member?.department || '').toLowerCase();
                const comments = (r.comments || '').toLowerCase();
                
                return memberName.includes(query) || 
                       department.includes(query) ||
                       comments.includes(query);
            });
        }
        
        filteredRatings = filtered;
        
        // Reset pagination
        pagination.page = 1;
        pagination.totalPages = Math.ceil(filteredRatings.length / pagination.perPage) || 1;
        
        // Render
        updateSummaryCards();
        renderRatingsTable();
        renderPagination();
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        $(SELECTORS.filterDepartment).val('all');
        $(SELECTORS.filterEmployee).val('all');
        $(SELECTORS.filterScoreRange).val('all');
        $(SELECTORS.searchInput).val('');
        
        applyFilters();
        Utils.showToast('Filters cleared', 'info');
    };

    // ============================================
    // 📋 TABLE RENDERING
    // ============================================

    /**
     * Render the ratings table
     */
    const renderRatingsTable = () => {
        const tableBody = $(SELECTORS.ratingsTableBody);
        
        if (filteredRatings.length === 0) {
            renderEmptyTable();
            return;
        }
        
        // Get paginated ratings
        const startIndex = (pagination.page - 1) * pagination.perPage;
        const endIndex = startIndex + pagination.perPage;
        const paginatedRatings = filteredRatings.slice(startIndex, endIndex);
        
        let html = '';
        
        paginatedRatings.forEach((rating) => {
            const member = getEmployeeById(rating.memberId);
            const memberName = member?.name || 'Unknown';
            const memberPhoto = member?.photoURL || Utils.getAvatarUrl(memberName);
            const department = member?.department || 'N/A';
            const memberLink = Utils.getMemberLink(rating.memberId);
            
            const avgScore = calculateAverageScore(rating);
            const scoreBadge = formatScoreBadge(avgScore);
            const dateDisplay = rating.date ? Utils.formatDateDisplay(rating.date) : 'N/A';
            
            html += `
                <tr class="hover:bg-gray-50 transition-colors group cursor-pointer" data-rating-id="${rating.recordId}">
                    <!-- Employee -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <a href="${memberLink}" class="flex items-center group/link" onclick="event.stopPropagation()">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full object-cover border-2 border-transparent group-hover/link:border-primary-500 transition-all" 
                                     src="${memberPhoto}" 
                                     alt="${Utils.escapeHtml(memberName)}"
                                     onerror="this.src='${Utils.getAvatarUrl(memberName)}'">
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900 group-hover/link:text-primary-600 transition-colors">
                                    ${Utils.escapeHtml(memberName)}
                                </div>
                                <div class="text-xs text-gray-500">${Utils.escapeHtml(department)}</div>
                            </div>
                        </a>
                    </td>
                    
                    <!-- Date -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm text-gray-700">${dateDisplay}</span>
                    </td>
                    
                    <!-- Individual Scores -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            ${renderMiniScoreBars(rating)}
                        </div>
                    </td>
                    
                    <!-- Average Score -->
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        ${scoreBadge}
                    </td>
                    
                    <!-- Comments -->
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-600 max-w-xs truncate block" title="${Utils.escapeHtml(rating.comments || '')}">
                            ${Utils.escapeHtml(rating.comments) || '—'}
                        </span>
                    </td>
                    
                    <!-- Actions -->
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors btn-edit-rating" 
                                    data-rating-id="${rating.recordId}"
                                    onclick="event.stopPropagation()"
                                    title="Edit Rating">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </button>
                            <button class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors btn-delete-rating" 
                                    data-rating-id="${rating.recordId}"
                                    onclick="event.stopPropagation()"
                                    title="Delete Rating">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.html(html);
        
        // Attach action button events
        attachTableActionEvents();
    };

    /**
     * Render mini score bars for individual categories
     */
    const renderMiniScoreBars = (rating) => {
        const categories = [
            { key: 'quality', label: 'Q', color: '#3B82F6' },
            { key: 'punctuality', label: 'P', color: '#10B981' },
            { key: 'reliability', label: 'R', color: '#F59E0B' },
            { key: 'deadlines', label: 'D', color: '#8B5CF6' }
        ];
        
        let html = '<div class="flex items-center gap-1">';
        
        categories.forEach(cat => {
            const value = parseFloat(rating[cat.key]) || 0;
            const width = (value / 10) * 100;
            
            html += `
                <div class="relative group/score" title="${cat.label}: ${value}/10">
                    <div class="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all" style="width: ${width}%; background-color: ${cat.color}"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    };

    /**
     * Render empty table state
     */
    const renderEmptyTable = () => {
        const tableBody = $(SELECTORS.ratingsTableBody);
        
        const hasFilters = $(SELECTORS.filterDepartment).val() !== 'all' ||
                          $(SELECTORS.filterEmployee).val() !== 'all' ||
                          $(SELECTORS.filterScoreRange).val() !== 'all' ||
                          $(SELECTORS.searchInput).val();
        
        const message = hasFilters 
            ? 'No ratings match your filters.'
            : `No ratings found for ${formatMonthDisplay(selectedMonth)}.`;
        
        tableBody.html(`
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                            </svg>
                        </div>
                        <p class="text-gray-500 text-lg font-medium mb-2">${Utils.escapeHtml(message)}</p>
                        ${hasFilters ? `
                            <button id="btnClearFiltersEmpty" class="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium">
                                Clear Filters
                            </button>
                        ` : `
                            <button id="btnAddFirstRating" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                </svg>
                                Add First Rating
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `);
        
        // Attach events
        $('#btnAddFirstRating').on('click', openAddRatingModal);
        $('#btnClearFiltersEmpty').on('click', clearFilters);
    };

    /**
     * Attach events to table action buttons
     */
    const attachTableActionEvents = () => {
        // Edit rating
        $('.btn-edit-rating').off('click').on('click', function(e) {
            e.stopPropagation();
            const ratingId = $(this).data('rating-id');
            openEditRatingModal(ratingId);
        });
        
        // Delete rating
        $('.btn-delete-rating').off('click').on('click', async function(e) {
            e.stopPropagation();
            const ratingId = $(this).data('rating-id');
            await confirmDeleteRating(ratingId);
        });
        
        // Row click to edit
        $(SELECTORS.ratingsTableBody).find('tr[data-rating-id]').off('click').on('click', function(e) {
            if (!$(e.target).closest('a, button').length) {
                const ratingId = $(this).data('rating-id');
                openEditRatingModal(ratingId);
            }
        });
    };

    // ============================================
    // 📄 PAGINATION
    // ============================================

    /**
     * Render pagination controls
     */
    const renderPagination = () => {
        const total = filteredRatings.length;
        const start = total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1;
        const end = Math.min(pagination.page * pagination.perPage, total);
        
        // Update info text
        $(SELECTORS.paginationInfo).text(`Showing ${start} - ${end} of ${total} ratings`);
        
        // Update button states
        $(SELECTORS.btnPrevPage).prop('disabled', pagination.page <= 1);
        $(SELECTORS.btnNextPage).prop('disabled', pagination.page >= pagination.totalPages);
        
        // Show/hide pagination
        if (total <= pagination.perPage) {
            $(SELECTORS.paginationContainer).addClass('hidden');
        } else {
            $(SELECTORS.paginationContainer).removeClass('hidden');
        }
    };

    /**
     * Go to previous page
     */
    const prevPage = () => {
        if (pagination.page > 1) {
            pagination.page--;
            renderRatingsTable();
            renderPagination();
        }
    };

    /**
     * Go to next page
     */
    const nextPage = () => {
        if (pagination.page < pagination.totalPages) {
            pagination.page++;
            renderRatingsTable();
            renderPagination();
        }
    };

    // ============================================
    // 📊 CHART RENDERING
    // ============================================

    /**
     * Render all charts
     */
    const renderCharts = () => {
        renderDistributionChart();
        renderDepartmentAvgChart();
        renderTrendChart();
    };

    /**
     * Render score distribution pie chart
     */
    const renderDistributionChart = () => {
        const canvas = document.getElementById('chartDistribution');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.distribution) {
            charts.distribution.destroy();
        }
        
        const stats = calculateSummaryStats(filteredRatings);
        
        const ctx = canvas.getContext('2d');
        
        charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High (8-10)', 'Medium (5-7)', 'Low (0-4)'],
                datasets: [{
                    data: [stats.distribution.high, stats.distribution.medium, stats.distribution.low],
                    backgroundColor: [
                        CHART_COLORS.success,
                        CHART_COLORS.warning,
                        CHART_COLORS.danger
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    };

    /**
     * Render department average bar chart
     */
    const renderDepartmentAvgChart = () => {
        const canvas = document.getElementById('chartDepartmentAvg');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.departmentAvg) {
            charts.departmentAvg.destroy();
        }
        
        // Group ratings by department
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))];
        const deptData = departments.map(dept => {
            const memberIds = members.filter(m => m.department === dept).map(m => m.memberId);
            const deptRatings = filteredRatings.filter(r => memberIds.includes(r.memberId));
            
            if (deptRatings.length === 0) return { department: dept, avg: 0 };
            
            const avgScores = deptRatings.map(r => calculateAverageScore(r));
            const avg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length;
            
            return { department: dept, avg: avg };
        }).filter(d => d.avg > 0);
        
        // Sort by average
        deptData.sort((a, b) => b.avg - a.avg);
        
        const ctx = canvas.getContext('2d');
        
        charts.departmentAvg = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: deptData.map(d => d.department),
                datasets: [{
                    label: 'Average Score',
                    data: deptData.map(d => d.avg.toFixed(1)),
                    backgroundColor: deptData.map(d => {
                        if (d.avg >= 8) return CHART_COLORS.success;
                        if (d.avg >= 5) return CHART_COLORS.warning;
                        return CHART_COLORS.danger;
                    }),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        min: 0,
                        max: 10,
                        grid: { display: false }
                    },
                    y: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };

    /**
     * Render employee trend line chart
     */
    const renderTrendChart = () => {
        const canvas = document.getElementById('chartTrend');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.trend) {
            charts.trend.destroy();
        }
        
        // Get last 6 months
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('en-US', { month: 'short' })
            });
        }
        
        let datasets = [];
        
        if (selectedEmployeeForTrend) {
            // Show trend for specific employee
            const employeeRatings = [];
            
            // We need to load all ratings for this, but for now use what we have
            months.forEach(m => {
                const monthRatings = ratings.filter(r => 
                    r.memberId === selectedEmployeeForTrend && 
                    r.date && r.date.startsWith(m.key)
                );
                
                if (monthRatings.length > 0) {
                    const avgScores = monthRatings.map(r => calculateAverageScore(r));
                    employeeRatings.push(avgScores.reduce((a, b) => a + b, 0) / avgScores.length);
                } else {
                    employeeRatings.push(null);
                }
            });
            
            const member = getEmployeeById(selectedEmployeeForTrend);
            
            datasets.push({
                label: member?.name || 'Selected Employee',
                data: employeeRatings,
                borderColor: CHART_COLORS.primary,
                backgroundColor: CHART_COLORS.primary + '20',
                fill: true,
                tension: 0.3,
                spanGaps: true
            });
        } else {
            // Show overall team average
            const teamAverages = months.map(m => {
                const monthRatings = ratings.filter(r => r.date && r.date.startsWith(m.key));
                if (monthRatings.length === 0) return null;
                
                const avgScores = monthRatings.map(r => calculateAverageScore(r));
                return avgScores.reduce((a, b) => a + b, 0) / avgScores.length;
            });
            
            datasets.push({
                label: 'Team Average',
                data: teamAverages,
                borderColor: CHART_COLORS.primary,
                backgroundColor: CHART_COLORS.primary + '20',
                fill: true,
                tension: 0.3,
                spanGaps: true
            });
        }
        
        const ctx = canvas.getContext('2d');
        
        charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(m => m.label),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 10,
                        ticks: { stepSize: 2 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    };

    // ============================================
    // 📝 RATING MODAL
    // ============================================

    /**
     * Open add rating modal
     */
    const openAddRatingModal = () => {
        editingRatingId = null;
        
        // Reset form
        $(SELECTORS.ratingForm)[0]?.reset();
        clearFormErrors();
        
        // Populate employee dropdown
        populateEmployeeDropdown();
        
        // Set defaults
        $(SELECTORS.ratingModalTitle).text('Add New Rating');
        $(SELECTORS.ratingMonth).val(selectedMonth);
        
        // Reset sliders to middle
        resetRatingSliders();
        
        $(SELECTORS.btnDeleteRating).addClass('hidden');
        $(SELECTORS.btnSaveRating).text('Add Rating');
        
        // Show modal
        showModal(SELECTORS.ratingModal);
        
        // Focus first input
        setTimeout(() => {
            $(SELECTORS.ratingEmployeeSelect).focus();
        }, 100);
    };

    /**
     * Open edit rating modal
     */
    const openEditRatingModal = (ratingId) => {
        const rating = getRatingById(ratingId);
        
        if (!rating) {
            Utils.showToast('Rating not found', 'error');
            return;
        }
        
        editingRatingId = ratingId;
        
        // Reset form
        $(SELECTORS.ratingForm)[0]?.reset();
        clearFormErrors();
        
        // Populate employee dropdown
        populateEmployeeDropdown();
        
        // Fill form with rating data
        $(SELECTORS.ratingModalTitle).text('Edit Rating');
        $(SELECTORS.ratingId).val(rating.recordId);
        $(SELECTORS.ratingEmployeeSelect).val(rating.memberId);
        $(SELECTORS.ratingMonth).val(rating.date ? rating.date.substring(0, 7) : selectedMonth);
        
        // Set slider values
        setSliderValue('ratingQuality', rating.quality || 5);
        setSliderValue('ratingPunctuality', rating.punctuality || 5);
        setSliderValue('ratingReliability', rating.reliability || 5);
        setSliderValue('ratingDeadlines', rating.deadlines || 5);
        
        $(SELECTORS.ratingComments).val(rating.comments || '');
        
        // Show delete button
        $(SELECTORS.btnDeleteRating).removeClass('hidden');
        $(SELECTORS.btnSaveRating).text('Update Rating');
        
        // Show modal
        showModal(SELECTORS.ratingModal);
    };

    /**
     * Close rating modal
     */
    const closeRatingModal = () => {
        hideModal(SELECTORS.ratingModal);
        editingRatingId = null;
    };

    /**
     * Populate employee dropdown
     */
    const populateEmployeeDropdown = () => {
        let options = '<option value="">Select Employee</option>';
        
        members.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            options += `<option value="${member.memberId}">
                ${Utils.escapeHtml(member.name)} — ${Utils.escapeHtml(member.department || 'N/A')}
            </option>`;
        });
        
        $(SELECTORS.ratingEmployeeSelect).html(options);
    };

    /**
     * Reset rating sliders to default
     */
    const resetRatingSliders = () => {
        const sliders = ['ratingQuality', 'ratingPunctuality', 'ratingReliability', 'ratingDeadlines'];
        sliders.forEach(slider => {
            setSliderValue(slider, 5);
        });
    };

    /**
     * Set slider value and update display
     */
    const setSliderValue = (sliderId, value) => {
        const $slider = $(`#${sliderId}`);
        const $value = $(`#${sliderId}Value`);
        
        $slider.val(value);
        $value.text(value);
    };

    /**
     * Save rating (add or update)
     */
    const saveRating = async () => {
        if (isSaving) return;
        
        // Validate form
        if (!validateRatingForm()) return;
        
        // Collect form data
        const monthValue = $(SELECTORS.ratingMonth).val() || selectedMonth;
        const ratingData = {
            memberId: $(SELECTORS.ratingEmployeeSelect).val(),
            date: `${monthValue}-01`, // Use first day of month
            quality: parseInt($(SELECTORS.ratingQuality).val()) || 0,
            punctuality: parseInt($(SELECTORS.ratingPunctuality).val()) || 0,
            reliability: parseInt($(SELECTORS.ratingReliability).val()) || 0,
            deadlines: parseInt($(SELECTORS.ratingDeadlines).val()) || 0,
            comments: $(SELECTORS.ratingComments).val().trim()
        };
        
        try {
            isSaving = true;
            updateSaveButton(true);
            
            if (editingRatingId) {
                ratingData.recordId = editingRatingId;
                await API.updateRating(editingRatingId, ratingData);
                Utils.showToast('Rating updated successfully!', 'success');
            } else {
                await API.addRating(ratingData);
                Utils.showToast('Rating added successfully!', 'success');
            }
            
            closeRatingModal();
            await loadRatings();
            applyFilters();
            renderCharts();
            
        } catch (error) {
            CONFIG.logError('Failed to save rating:', error);
            Utils.showToast(error.message || 'Failed to save rating', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(false);
        }
    };

    /**
     * Validate rating form
     */
    const validateRatingForm = () => {
        clearFormErrors();
        let isValid = true;
        
        // Employee required
        if (!$(SELECTORS.ratingEmployeeSelect).val()) {
            showFieldError(SELECTORS.ratingEmployeeSelect, 'Please select an employee');
            isValid = false;
        }
        
        // Month required
        if (!$(SELECTORS.ratingMonth).val()) {
            showFieldError(SELECTORS.ratingMonth, 'Please select a month');
            isValid = false;
        }
        
        return isValid;
    };

    /**
     * Show field error
     */
    const showFieldError = (selector, message) => {
        const $field = $(selector);
        $field.addClass('border-red-500 focus:border-red-500 focus:ring-red-500');
        
        // Add error message
        const errorHtml = `<p class="field-error text-xs text-red-600 mt-1">${Utils.escapeHtml(message)}</p>`;
        $field.parent().append(errorHtml);
    };

    /**
     * Clear all form errors
     */
    const clearFormErrors = () => {
        $(SELECTORS.ratingForm).find('input, select, textarea').removeClass('border-red-500 focus:border-red-500 focus:ring-red-500');
        $(SELECTORS.ratingForm).find('.field-error').remove();
    };

    /**
     * Update save button state
     */
    const updateSaveButton = (loading) => {
        const $btn = $(SELECTORS.btnSaveRating);
        
        if (loading) {
            $btn.prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving...
            `);
        } else {
            $btn.prop('disabled', false).text(editingRatingId ? 'Update Rating' : 'Add Rating');
        }
    };

    // ============================================
    // 🗑️ DELETE RATING
    // ============================================

    /**
     * Confirm and delete rating
     */
    const confirmDeleteRating = async (ratingId) => {
        const rating = getRatingById(ratingId);
        if (!rating) return;
        
        const member = getEmployeeById(rating.memberId);
        const memberName = member?.name || 'this employee';
        
        const confirmed = await Utils.showConfirm(
            `Are you sure you want to delete the rating for ${memberName}?`,
            'Delete Rating'
        );
        
        if (confirmed) {
            await deleteRating(ratingId);
        }
    };

    /**
     * Delete a rating
     */
    const deleteRating = async (ratingId) => {
        try {
            Utils.showLoading(SELECTORS.ratingsTableContainer, 'Deleting rating...');
            
            await API.deleteRating(ratingId);
            
            Utils.showToast('Rating deleted successfully', 'success');
            closeRatingModal();
            await loadRatings();
            applyFilters();
            renderCharts();
            
        } catch (error) {
            CONFIG.logError('Failed to delete rating:', error);
            Utils.showToast(error.message || 'Failed to delete rating', 'error');
        } finally {
            Utils.hideLoading(SELECTORS.ratingsTableContainer);
        }
    };

    // ============================================
    // 🎨 RENDERING UTILITIES
    // ============================================

    /**
     * Format score badge HTML
     */
    const formatScoreBadge = (score) => {
        if (!score || score === 0) {
            return '<span class="text-gray-400 text-sm">—</span>';
        }
        
        let config;
        if (score >= 8) {
            config = SCORE_BADGES.high;
        } else if (score >= 5) {
            config = SCORE_BADGES.medium;
        } else {
            config = SCORE_BADGES.low;
        }
        
        return `
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bgClass} ${config.textClass}">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                ${score.toFixed(1)}
            </span>
        `;
    };

    // ============================================
    // 🔧 UTILITY FUNCTIONS
    // ============================================

    /**
     * Get employee by ID
     */
    const getEmployeeById = (memberId) => {
        return members.find(m => m.memberId === memberId) || null;
    };

    /**
     * Get rating by ID
     */
    const getRatingById = (ratingId) => {
        return ratings.find(r => r.recordId === ratingId) || null;
    };

    // ============================================
    // 🎭 MODAL UTILITIES
    // ============================================

    /**
     * Show modal with animation
     */
    const showModal = (selector) => {
        const $modal = $(selector);
        $modal.removeClass('hidden').addClass('flex');
        
        setTimeout(() => {
            $modal.find('.modal-content').removeClass('scale-95 opacity-0');
        }, 10);
    };

    /**
     * Hide modal with animation
     */
    const hideModal = (selector) => {
        const $modal = $(selector);
        $modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            $modal.removeClass('flex').addClass('hidden');
        }, 200);
    };

    // ============================================
    // ⏳ LOADING UTILITIES
    // ============================================

    /**
     * Show page loading overlay
     */
    const showPageLoading = () => {
        isLoading = true;
        $(SELECTORS.loadingOverlay).removeClass('hidden');
    };

    /**
     * Hide page loading overlay
     */
    const hidePageLoading = () => {
        isLoading = false;
        $(SELECTORS.loadingOverlay).addClass('hidden');
    };

    /**
     * Show table loading state
     */
    const showTableLoading = () => {
        $(SELECTORS.ratingsTableBody).html(`
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="spinner mb-4"></div>
                        <p class="text-gray-500">Loading ratings...</p>
                    </div>
                </td>
            </tr>
        `);
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Month Navigation
        $(SELECTORS.btnPrevMonth).on('click', prevMonth);
        $(SELECTORS.btnNextMonth).on('click', nextMonth);
        $(SELECTORS.btnCurrentMonth).on('click', goToCurrentMonth);
        
        // Add Rating Button
        $(SELECTORS.btnAddRating).on('click', openAddRatingModal);
        
        // Refresh Button
        $(SELECTORS.btnRefresh).on('click', async () => {
            await loadRatings();
            applyFilters();
            renderCharts();
            Utils.showToast('Ratings refreshed', 'info');
        });
        
        // Filters
        $(SELECTORS.filterDepartment).on('change', applyFilters);
        $(SELECTORS.filterEmployee).on('change', applyFilters);
        $(SELECTORS.filterScoreRange).on('change', applyFilters);
        $(SELECTORS.searchInput).on('input', debounce(applyFilters, 300));
        $(SELECTORS.btnClearFilters).on('click', clearFilters);
        
        // Pagination
        $(SELECTORS.btnPrevPage).on('click', prevPage);
        $(SELECTORS.btnNextPage).on('click', nextPage);
        
        // Trend Employee Select
        $(SELECTORS.trendEmployeeSelect).on('change', function() {
            selectedEmployeeForTrend = $(this).val() || null;
            renderTrendChart();
        });
        
        // Rating Modal
        $(SELECTORS.btnCloseRatingModal).on('click', closeRatingModal);
        $(SELECTORS.btnCancelRating).on('click', closeRatingModal);
        $(SELECTORS.btnSaveRating).on('click', saveRating);
        $(SELECTORS.btnDeleteRating).on('click', () => {
            if (editingRatingId) {
                confirmDeleteRating(editingRatingId);
            }
        });
        
        // Form submission
        $(SELECTORS.ratingForm).on('submit', function(e) {
            e.preventDefault();
            saveRating();
        });
        
        // Rating sliders
        const sliders = [
            { slider: SELECTORS.ratingQuality, value: SELECTORS.ratingQualityValue },
            { slider: SELECTORS.ratingPunctuality, value: SELECTORS.ratingPunctualityValue },
            { slider: SELECTORS.ratingReliability, value: SELECTORS.ratingReliabilityValue },
            { slider: SELECTORS.ratingDeadlines, value: SELECTORS.ratingDeadlinesValue }
        ];
        
        sliders.forEach(({ slider, value }) => {
            $(slider).on('input', function() {
                $(value).text($(this).val());
            });
        });
        
        // Modal backdrop click
        $(SELECTORS.ratingModal).on('click', function(e) {
            if (e.target === this) {
                closeRatingModal();
            }
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            // ESC to close modal
            if (e.key === 'Escape' && !$(SELECTORS.ratingModal).hasClass('hidden')) {
                closeRatingModal();
            }
            
            // Ctrl/Cmd + N to add new rating
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openAddRatingModal();
            }
            
            // Arrow keys for month navigation
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                prevMonth();
            }
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                nextMonth();
            }
        });
        
        // Clear input errors on change
        $(SELECTORS.ratingForm).on('input change', 'input, select, textarea', function() {
            $(this).removeClass('border-red-500 focus:border-red-500 focus:ring-red-500');
            $(this).parent().find('.field-error').remove();
        });
    };

    /**
     * Debounce utility function
     */
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        
        // Month navigation
        prevMonth,
        nextMonth,
        goToCurrentMonth,
        
        // Modal controls
        openAddRatingModal,
        openEditRatingModal,
        closeRatingModal,
        
        // Actions
        saveRating,
        deleteRating,
        
        // Filters
        applyFilters,
        clearFilters,
        
        // Charts
        renderCharts,
        
        // State getters
        getSelectedMonth: () => selectedMonth,
        getRatings: () => [...ratings],
        getFilteredRatings: () => [...filteredRatings],
        getMembers: () => [...members],
        
        // Utilities
        getRatingById,
        getEmployeeById,
        calculateAverageScore,
        calculateSummaryStats,
        formatScoreBadge
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    RatingsPage.init();
});