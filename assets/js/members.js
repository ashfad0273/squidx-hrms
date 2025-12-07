/**
 * SquidX HRM — Members Page Controller
 * ======================================
 * Handles all members directory functionality including:
 * - Loading and displaying members from Google Sheets
 * - Filtering, searching, and sorting
 * - Add/Edit/Delete member operations
 * - Navigation to member detail pages
 * 
 * Dependencies:
 *   - jQuery
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const MembersPage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * All members loaded from API
     */
    let members = [];

    /**
     * Filtered members based on current filters
     */
    let filteredMembers = [];

    /**
     * Currently editing member ID (null for new member)
     */
    let editingMemberId = null;

    /**
     * Flag to prevent double submissions
     */
    let isSaving = false;

    /**
     * Flag to track if initial load is complete
     */
    let isInitialized = false;

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    /**
     * Default member photo placeholder
     */
    const DEFAULT_PHOTO = '';

    /**
     * Member status options
     */
    const STATUS_OPTIONS = ['Active', 'Inactive', 'On Leave', 'Terminated'];

    /**
     * Sort options
     */
    const SORT_OPTIONS = {
        'name_asc': { field: 'name', order: 'asc', label: 'Name (A-Z)' },
        'name_desc': { field: 'name', order: 'desc', label: 'Name (Z-A)' },
        'newest': { field: 'joinDate', order: 'desc', label: 'Newest First' },
        'oldest': { field: 'joinDate', order: 'asc', label: 'Oldest First' },
        'department_asc': { field: 'department', order: 'asc', label: 'Department (A-Z)' }
    };

    // ============================================
    // 🎯 DOM SELECTORS
    // ============================================

    const SELECTORS = {
        // Container
        membersContainer: '#membersContainer',
        membersGrid: '#membersGrid',
        loadingOverlay: '#membersLoadingOverlay',
        emptyState: '#membersEmptyState',
        
        // Stats
        totalCount: '#totalMembersCount',
        activeCount: '#activeMembersCount',
        inactiveCount: '#inactiveMembersCount',
        
        // Filters
        searchInput: '#searchInput',
        filterDepartment: '#filterDepartment',
        filterRole: '#filterRole',
        filterStatus: '#filterStatus',
        sortMembers: '#sortMembers',
        btnClearFilters: '#btnClearFilters',
        
        // Action Buttons
        btnAddMember: '#btnAddMember',
        btnRefresh: '#btnRefresh',
        
        // Member Modal
        memberModal: '#memberModal',
        memberForm: '#memberForm',
        modalTitle: '#memberModalTitle',
        btnCloseMemberModal: '#btnCloseMemberModal',
        btnCancelMember: '#btnCancelMember',
        btnSaveMember: '#btnSaveMember',
        
        // Modal Form Fields
        memberIdInput: '#memberId',
        memberName: '#memberName',
        memberEmail: '#memberEmail',
        memberPhone: '#memberPhone',
        memberDepartment: '#memberDepartment',
        memberRole: '#memberRole',
        memberPhoto: '#memberPhoto',
        memberPhotoPreview: '#memberPhotoPreview',
        memberJoinDate: '#memberJoinDate',
        memberBirthday: '#memberBirthday',
        memberStatus: '#memberStatus',
        memberNotes: '#memberNotes',
        
        // Delete Confirmation Modal
        deleteModal: '#deleteConfirmModal',
        deleteConfirmName: '#deleteConfirmName',
        btnConfirmDelete: '#btnConfirmDelete',
        btnCancelDelete: '#btnCancelDelete',
        btnCloseDeleteModal: '#btnCloseDeleteModal',
        
        // Results Info
        resultsCount: '#resultsCount'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the members page
     */
    const init = async () => {
        CONFIG.log('Initializing Members Page...');
        
        try {
            // Show loading state
            showLoading(true);
            
            // Load members from API
            await loadMembers();
            
            // Populate filter dropdowns
            populateFilters();
            
            // Apply initial filters and render
            applyFilters();
            
            // Setup event listeners
            setupEventListeners();
            
            // Mark as initialized
            isInitialized = true;
            
            // Hide loading
            showLoading(false);
            
            CONFIG.log('Members Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Members Page:', error);
            showLoading(false);
            Utils.showToast('Failed to load members. Please refresh.', 'error');
            renderEmptyState('Failed to load members. Please try again.');
        }
    };

    /**
     * Load members from API
     */
    const loadMembers = async () => {
        try {
            const response = await API.getAllMembers();
            members = response || [];
            
            // Sort by name by default
            members = sortMembers(members, 'name', 'asc');
            
            CONFIG.log(`Loaded ${members.length} members`);
            
        } catch (error) {
            CONFIG.logError('Failed to load members:', error);
            members = [];
            throw error;
        }
    };

    /**
     * Refresh members list
     */
    const refreshMembers = async () => {
        try {
            showLoading(true);
            await loadMembers();
            populateFilters();
            applyFilters();
            showLoading(false);
            Utils.showToast('Members refreshed', 'success');
        } catch (error) {
            showLoading(false);
            Utils.showToast('Failed to refresh members', 'error');
        }
    };

    // ============================================
    // 🔍 FILTERING & SORTING
    // ============================================

    /**
     * Apply all filters and render the list
     */
    const applyFilters = () => {
        const searchQuery = normalizeText($(SELECTORS.searchInput).val());
        const department = $(SELECTORS.filterDepartment).val();
        const role = $(SELECTORS.filterRole).val();
        const status = $(SELECTORS.filterStatus).val();
        const sortValue = $(SELECTORS.sortMembers).val() || 'name_asc';
        
        // Start with all members
        filteredMembers = [...members];
        
        // Apply search filter
        if (searchQuery) {
            filteredMembers = filteredMembers.filter(member => {
                const name = normalizeText(member.name);
                const dept = normalizeText(member.department);
                const memberRole = normalizeText(member.role);
                const email = normalizeText(member.email);
                
                return name.includes(searchQuery) ||
                       dept.includes(searchQuery) ||
                       memberRole.includes(searchQuery) ||
                       email.includes(searchQuery);
            });
        }
        
        // Apply department filter
        if (department && department !== 'all') {
            filteredMembers = filteredMembers.filter(m => m.department === department);
        }
        
        // Apply role filter
        if (role && role !== 'all') {
            filteredMembers = filteredMembers.filter(m => m.role === role);
        }
        
        // Apply status filter
        if (status && status !== 'all') {
            filteredMembers = filteredMembers.filter(m => m.status === status);
        }
        
        // Apply sorting
        const sortConfig = SORT_OPTIONS[sortValue] || SORT_OPTIONS['name_asc'];
        filteredMembers = sortMembers(filteredMembers, sortConfig.field, sortConfig.order);
        
        // Render the filtered list
        renderMembers();
        
        // Update stats
        updateStats();
        
        // Update results count
        updateResultsCount();
    };

    /**
     * Sort members by field and order
     * @param {Array} membersList - Members to sort
     * @param {string} field - Field to sort by
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted members
     */
    const sortMembers = (membersList, field, order) => {
        return [...membersList].sort((a, b) => {
            let valA = a[field] || '';
            let valB = b[field] || '';
            
            // Handle date fields
            if (field === 'joinDate' || field === 'birthDate') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            
            if (order === 'asc') {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });
    };

    /**
     * Normalize text for searching
     * @param {string} text - Text to normalize
     * @returns {string} Normalized lowercase trimmed text
     */
    const normalizeText = (text) => {
        if (!text) return '';
        return String(text).toLowerCase().trim();
    };

    /**
     * Populate filter dropdowns from member data
     */
    const populateFilters = () => {
        // Get unique departments
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
        let deptOptions = '<option value="all">All Departments</option>';
        departments.forEach(dept => {
            deptOptions += `<option value="${Utils.escapeHtml(dept)}">${Utils.escapeHtml(dept)}</option>`;
        });
        $(SELECTORS.filterDepartment).html(deptOptions);
        
        // Get unique roles
        const roles = [...new Set(members.map(m => m.role).filter(Boolean))].sort();
        let roleOptions = '<option value="all">All Roles</option>';
        roles.forEach(role => {
            roleOptions += `<option value="${Utils.escapeHtml(role)}">${Utils.escapeHtml(role)}</option>`;
        });
        $(SELECTORS.filterRole).html(roleOptions);
        
        // Status filter (static options)
        const statusOptions = `
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
        `;
        $(SELECTORS.filterStatus).html(statusOptions);
        
        // Sort options
        let sortOptions = '';
        Object.entries(SORT_OPTIONS).forEach(([value, config]) => {
            sortOptions += `<option value="${value}">${config.label}</option>`;
        });
        $(SELECTORS.sortMembers).html(sortOptions);
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        $(SELECTORS.searchInput).val('');
        $(SELECTORS.filterDepartment).val('all');
        $(SELECTORS.filterRole).val('all');
        $(SELECTORS.filterStatus).val('all');
        $(SELECTORS.sortMembers).val('name_asc');
        applyFilters();
    };

    // ============================================
    // 🎨 RENDERING
    // ============================================

    /**
     * Render members grid
     */
    const renderMembers = () => {
        const $grid = $(SELECTORS.membersGrid);
        
        if (filteredMembers.length === 0) {
            renderEmptyState('No members found matching your criteria.');
            return;
        }
        
        // Hide empty state
        $(SELECTORS.emptyState).addClass('hidden');
        
        let html = '';
        
        filteredMembers.forEach((member, index) => {
            const memberLink = getMemberLink(member.memberId);
            const photoUrl = member.photoURL || Utils.getAvatarUrl(member.name);
            const statusBadge = renderStatusBadge(member.status);
            const joinDate = member.joinDate ? Utils.formatDateDisplay(member.joinDate) : 'N/A';
            
            html += `
                <div class="member-card bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                     style="animation: fadeInUp 0.3s ease ${index * 0.05}s both;">
                    
                    <!-- Card Header with Photo -->
                    <a href="${memberLink}" class="block">
                        <div class="relative h-32 bg-gradient-to-br from-primary-500 to-primary-700 overflow-hidden">
                            <!-- Background Pattern -->
                            <div class="absolute inset-0 opacity-10">
                                <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5"/>
                                        </pattern>
                                    </defs>
                                    <rect width="100" height="100" fill="url(#grid)"/>
                                </svg>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button class="btn-edit-member p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-700 hover:bg-white hover:text-primary-600 transition-all shadow-sm"
                                        data-member-id="${member.memberId}"
                                        title="Edit Member"
                                        onclick="event.preventDefault(); event.stopPropagation();">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button class="btn-delete-member p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                        data-member-id="${member.memberId}"
                                        data-member-name="${Utils.escapeHtml(member.name)}"
                                        title="Delete Member"
                                        onclick="event.preventDefault(); event.stopPropagation();">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Photo -->
                            <div class="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                                <img class="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                                     src="${photoUrl}"
                                     alt="${Utils.escapeHtml(member.name)}"
                                     onerror="this.src='${Utils.getAvatarUrl(member.name)}'">
                            </div>
                        </div>
                    </a>
                    
                    <!-- Card Body -->
                    <div class="pt-12 pb-5 px-5 text-center">
                        <!-- Name (Clickable) -->
                        <a href="${memberLink}" class="block group/name">
                            <h3 class="text-lg font-semibold text-gray-900 group-hover/name:text-primary-600 transition-colors">
                                ${Utils.escapeHtml(member.name)}
                            </h3>
                        </a>
                        
                        <!-- Role -->
                        <p class="text-sm text-primary-600 font-medium mt-1">
                            ${Utils.escapeHtml(member.role || 'No Role')}
                        </p>
                        
                        <!-- Department -->
                        <p class="text-sm text-gray-500 mt-1">
                            ${Utils.escapeHtml(member.department || 'No Department')}
                        </p>
                        
                        <!-- Status Badge -->
                        <div class="mt-3">
                            ${statusBadge}
                        </div>
                        
                        <!-- Meta Info -->
                        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-center items-center gap-4 text-xs text-gray-500">
                            <div class="flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span>Joined ${joinDate}</span>
                            </div>
                        </div>
                        
                        <!-- View Profile Button -->
                        <a href="${memberLink}" 
                           class="mt-4 inline-flex items-center justify-center w-full px-4 py-2 bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 rounded-lg text-sm font-medium transition-all">
                            <span>View Profile</span>
                            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        });
        
        $grid.html(html);
        
        // Attach event listeners to action buttons
        attachCardEventListeners();
    };

    /**
     * Render status badge HTML
     * @param {string} status - Member status
     * @returns {string} HTML for status badge
     */
    const renderStatusBadge = (status) => {
        const badges = {
            'Active': {
                bg: 'bg-green-100',
                text: 'text-green-800',
                dot: 'bg-green-500'
            },
            'Inactive': {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
                dot: 'bg-gray-400'
            },
            'On Leave': {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                dot: 'bg-blue-500'
            },
            'Terminated': {
                bg: 'bg-red-100',
                text: 'text-red-800',
                dot: 'bg-red-500'
            }
        };
        
        const badge = badges[status] || badges['Inactive'];
        
        return `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}">
                <span class="w-1.5 h-1.5 rounded-full ${badge.dot}"></span>
                ${Utils.escapeHtml(status || 'Unknown')}
            </span>
        `;
    };

    /**
     * Render empty state
     * @param {string} message - Message to display
     */
    const renderEmptyState = (message) => {
        const $grid = $(SELECTORS.membersGrid);
        const $empty = $(SELECTORS.emptyState);
        
        $grid.html('');
        
        $empty.removeClass('hidden').html(`
            <div class="flex flex-col items-center justify-center py-16">
                <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No Members Found</h3>
                <p class="text-gray-500 mb-6 text-center max-w-sm">${Utils.escapeHtml(message)}</p>
                <div class="flex gap-3">
                    <button id="btnClearFiltersEmpty" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                        Clear Filters
                    </button>
                    <button id="btnAddMemberEmpty" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                        Add Member
                    </button>
                </div>
            </div>
        `);
        
        // Attach empty state button listeners
        $('#btnClearFiltersEmpty').on('click', clearFilters);
        $('#btnAddMemberEmpty').on('click', () => openMemberModal());
    };

    /**
     * Update statistics cards
     */
    const updateStats = () => {
        const total = members.length;
        const active = members.filter(m => m.status === 'Active').length;
        const inactive = members.filter(m => m.status !== 'Active').length;
        
        $(SELECTORS.totalCount).text(total);
        $(SELECTORS.activeCount).text(active);
        $(SELECTORS.inactiveCount).text(inactive);
    };

    /**
     * Update results count display
     */
    const updateResultsCount = () => {
        const total = members.length;
        const showing = filteredMembers.length;
        
        if (total === showing) {
            $(SELECTORS.resultsCount).text(`Showing all ${total} members`);
        } else {
            $(SELECTORS.resultsCount).text(`Showing ${showing} of ${total} members`);
        }
    };

    // ============================================
    // 🔗 NAVIGATION HELPERS
    // ============================================

    /**
     * Get member detail page link
     * @param {string} memberId - Member ID
     * @returns {string} URL to member detail page
     */
    const getMemberLink = (memberId) => {
        return `employee.html?memberId=${encodeURIComponent(memberId)}`;
    };

    /**
     * Get member by ID from cached list
     * @param {string} memberId - Member ID
     * @returns {Object|null} Member object or null
     */
    const getMemberById = (memberId) => {
        return members.find(m => m.memberId === memberId) || null;
    };

    // ============================================
    // 📝 MEMBER MODAL
    // ============================================

    /**
     * Open member modal for add/edit
     * @param {string|null} memberId - Member ID for edit, null for add
     */
    const openMemberModal = (memberId = null) => {
        editingMemberId = memberId;
        
        // Reset form
        $(SELECTORS.memberForm)[0]?.reset();
        clearFormErrors();
        
        // Set modal title
        if (memberId) {
            $(SELECTORS.modalTitle).text('Edit Member');
            $(SELECTORS.btnSaveMember).html(`
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Update Member
            `);
            
            // Load member data into form
            const member = getMemberById(memberId);
            if (member) {
                populateFormWithMember(member);
            }
        } else {
            $(SELECTORS.modalTitle).text('Add New Member');
            $(SELECTORS.btnSaveMember).html(`
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Member
            `);
            
            // Set default values for new member
            $(SELECTORS.memberStatus).val('Active');
            $(SELECTORS.memberJoinDate).val(Utils.formatDate(new Date()));
        }
        
        // Populate department dropdown
        populateDepartmentDropdown();
        
        // Show modal
        $(SELECTORS.memberModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.memberModal).find('.modal-content').removeClass('scale-95 opacity-0');
            $(SELECTORS.memberName).focus();
        }, 10);
    };

    /**
     * Close member modal
     */
    const closeMemberModal = () => {
        const modal = $(SELECTORS.memberModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
            editingMemberId = null;
        }, 200);
    };

    /**
     * Populate form with member data for editing
     * @param {Object} member - Member data
     */
    const populateFormWithMember = (member) => {
        $(SELECTORS.memberIdInput).val(member.memberId || '');
        $(SELECTORS.memberName).val(member.name || '');
        $(SELECTORS.memberEmail).val(member.email || '');
        $(SELECTORS.memberPhone).val(member.phone || '');
        $(SELECTORS.memberDepartment).val(member.department || '');
        $(SELECTORS.memberRole).val(member.role || '');
        $(SELECTORS.memberPhoto).val(member.photoURL || '');
        $(SELECTORS.memberJoinDate).val(member.joinDate || '');
        $(SELECTORS.memberBirthday).val(member.birthDate || '');
        $(SELECTORS.memberStatus).val(member.status || 'Active');
        $(SELECTORS.memberNotes).val(member.notes || '');
        
        // Update photo preview
        updatePhotoPreview(member.photoURL);
    };

    /**
     * Populate department dropdown with existing departments
     */
    const populateDepartmentDropdown = () => {
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
        const $dropdown = $(SELECTORS.memberDepartment);
        
        // If it's a datalist input, populate the datalist
        const $datalist = $('#departmentList');
        if ($datalist.length) {
            let options = '';
            departments.forEach(dept => {
                options += `<option value="${Utils.escapeHtml(dept)}">`;
            });
            $datalist.html(options);
        }
    };

    /**
     * Update photo preview in modal
     * @param {string} url - Photo URL
     */
    const updatePhotoPreview = (url) => {
        const $preview = $(SELECTORS.memberPhotoPreview);
        
        if (url) {
            $preview.attr('src', url).removeClass('hidden');
            $preview.siblings('.photo-placeholder').addClass('hidden');
            
            $preview.off('error').on('error', function() {
                $(this).addClass('hidden');
                $(this).siblings('.photo-placeholder').removeClass('hidden');
            });
        } else {
            $preview.addClass('hidden');
            $preview.siblings('.photo-placeholder').removeClass('hidden');
        }
    };

    /**
     * Collect form data into object
     * @returns {Object} Member data object
     */
    const collectFormData = () => {
        return {
            memberId: $(SELECTORS.memberIdInput).val().trim() || null,
            name: $(SELECTORS.memberName).val().trim(),
            email: $(SELECTORS.memberEmail).val().trim(),
            phone: $(SELECTORS.memberPhone).val().trim(),
            department: $(SELECTORS.memberDepartment).val().trim(),
            role: $(SELECTORS.memberRole).val().trim(),
            photoURL: $(SELECTORS.memberPhoto).val().trim(),
            joinDate: $(SELECTORS.memberJoinDate).val(),
            birthDate: $(SELECTORS.memberBirthday).val(),
            status: $(SELECTORS.memberStatus).val(),
            notes: $(SELECTORS.memberNotes).val().trim()
        };
    };

    /**
     * Validate form data
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    const validateForm = () => {
        const data = collectFormData();
        const errors = [];
        
        clearFormErrors();
        
        // Required: Name
        if (!data.name) {
            errors.push('Name is required');
            markFieldError(SELECTORS.memberName);
        }
        
        // Required: Email
        if (!data.email) {
            errors.push('Email is required');
            markFieldError(SELECTORS.memberEmail);
        } else if (!isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
            markFieldError(SELECTORS.memberEmail);
        }
        
        // Required: Join Date
        if (!data.joinDate) {
            errors.push('Join date is required');
            markFieldError(SELECTORS.memberJoinDate);
        }
        
        // Optional: Photo URL validation
        if (data.photoURL && !isValidURL(data.photoURL)) {
            errors.push('Please enter a valid photo URL');
            markFieldError(SELECTORS.memberPhoto);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    };

    /**
     * Check if email is valid
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    const isValidEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    /**
     * Check if URL is valid
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    const isValidURL = (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return /^(https?:\/\/)/i.test(url);
        }
    };

    /**
     * Mark a form field as having an error
     * @param {string} selector - Field selector
     */
    const markFieldError = (selector) => {
        $(selector).addClass('border-red-500 ring-2 ring-red-200');
    };

    /**
     * Clear all form errors
     */
    const clearFormErrors = () => {
        $(`${SELECTORS.memberForm} input, ${SELECTORS.memberForm} select, ${SELECTORS.memberForm} textarea`)
            .removeClass('border-red-500 ring-2 ring-red-200');
    };

    /**
     * Generate new member ID
     * @returns {string} New member ID
     */
    const generateMemberId = () => {
        // Get existing member IDs
        const existingIds = members
            .map(m => m.memberId)
            .filter(id => id && id.startsWith('EMP'))
            .map(id => parseInt(id.replace('EMP', ''), 10))
            .filter(num => !isNaN(num));
        
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const newId = maxId + 1;
        
        return `EMP${String(newId).padStart(3, '0')}`;
    };

    /**
     * Save member (add or update)
     */
    const saveMember = async () => {
        if (isSaving) return;
        
        // Validate form
        const validation = validateForm();
        if (!validation.valid) {
            Utils.showToast(validation.errors[0], 'error');
            return;
        }
        
        // Collect form data
        const memberData = collectFormData();
        
        // Generate ID for new members
        if (!memberData.memberId) {
            memberData.memberId = generateMemberId();
        }
        
        try {
            isSaving = true;
            updateSaveButton(true);
            
            if (editingMemberId) {
                // Update existing member
                await API.updateMember(editingMemberId, memberData);
                Utils.showToast('Member updated successfully!', 'success');
            } else {
                // Add new member
                await API.addMember(memberData);
                Utils.showToast('Member added successfully!', 'success');
            }
            
            // Close modal and refresh
            closeMemberModal();
            await refreshMembers();
            
        } catch (error) {
            CONFIG.logError('Failed to save member:', error);
            Utils.showToast(error.message || 'Failed to save member', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(false);
        }
    };

    /**
     * Update save button state
     * @param {boolean} loading - Loading state
     */
    const updateSaveButton = (loading) => {
        const $btn = $(SELECTORS.btnSaveMember);
        
        if (loading) {
            $btn.prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
            `);
        } else {
            $btn.prop('disabled', false);
            if (editingMemberId) {
                $btn.html(`
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Update Member
                `);
            } else {
                $btn.html(`
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Member
                `);
            }
        }
    };

    // ============================================
    // 🗑️ DELETE MEMBER
    // ============================================

    /**
     * Member to delete (stored for confirmation)
     */
    let memberToDelete = null;

    /**
     * Open delete confirmation modal
     * @param {string} memberId - Member ID to delete
     * @param {string} memberName - Member name for display
     */
    const openDeleteModal = (memberId, memberName) => {
        memberToDelete = { memberId, memberName };
        
        $(SELECTORS.deleteConfirmName).text(memberName);
        
        $(SELECTORS.deleteModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.deleteModal).find('.modal-content').removeClass('scale-95 opacity-0');
        }, 10);
    };

    /**
     * Close delete confirmation modal
     */
    const closeDeleteModal = () => {
        const modal = $(SELECTORS.deleteModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
            memberToDelete = null;
        }, 200);
    };

    /**
     * Delete member after confirmation
     */
    const confirmDeleteMember = async () => {
        if (!memberToDelete) return;
        
        const { memberId, memberName } = memberToDelete;
        
        try {
            // Show loading on button
            $(SELECTORS.btnConfirmDelete).prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Deleting...
            `);
            
            await API.deleteMember(memberId);
            
            Utils.showToast(`${memberName} has been deleted`, 'success');
            closeDeleteModal();
            await refreshMembers();
            
        } catch (error) {
            CONFIG.logError('Failed to delete member:', error);
            Utils.showToast(error.message || 'Failed to delete member', 'error');
        } finally {
            $(SELECTORS.btnConfirmDelete).prop('disabled', false).html(`
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Delete Member
            `);
        }
    };

    // ============================================
    // ⏳ LOADING STATE
    // ============================================

    /**
     * Show or hide loading overlay
     * @param {boolean} show - Show loading state
     */
    const showLoading = (show) => {
        const $overlay = $(SELECTORS.loadingOverlay);
        const $container = $(SELECTORS.membersContainer);
        
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
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Add Member button
        $(SELECTORS.btnAddMember).on('click', () => openMemberModal());
        
        // Refresh button
        $(SELECTORS.btnRefresh).on('click', refreshMembers);
        
        // Filter change events
        $(SELECTORS.filterDepartment).on('change', applyFilters);
        $(SELECTORS.filterRole).on('change', applyFilters);
        $(SELECTORS.filterStatus).on('change', applyFilters);
        $(SELECTORS.sortMembers).on('change', applyFilters);
        
        // Search input with debounce
        $(SELECTORS.searchInput).on('input', debounce(applyFilters, 300));
        
        // Clear filters button
        $(SELECTORS.btnClearFilters).on('click', clearFilters);
        
        // Member modal events
        $(SELECTORS.btnCloseMemberModal).on('click', closeMemberModal);
        $(SELECTORS.btnCancelMember).on('click', closeMemberModal);
        $(SELECTORS.btnSaveMember).on('click', saveMember);
        
        // Photo URL preview
        $(SELECTORS.memberPhoto).on('blur', function() {
            updatePhotoPreview($(this).val());
        });
        
        // Form submission prevention
        $(SELECTORS.memberForm).on('submit', function(e) {
            e.preventDefault();
            saveMember();
        });
        
        // Delete modal events
        $(SELECTORS.btnCloseDeleteModal).on('click', closeDeleteModal);
        $(SELECTORS.btnCancelDelete).on('click', closeDeleteModal);
        $(SELECTORS.btnConfirmDelete).on('click', confirmDeleteMember);
        
        // Modal backdrop clicks
        $(SELECTORS.memberModal).on('click', function(e) {
            if (e.target === this) closeMemberModal();
        });
        $(SELECTORS.deleteModal).on('click', function(e) {
            if (e.target === this) closeDeleteModal();
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            // Escape to close modals
            if (e.key === 'Escape') {
                if (!$(SELECTORS.memberModal).hasClass('hidden')) {
                    closeMemberModal();
                }
                if (!$(SELECTORS.deleteModal).hasClass('hidden')) {
                    closeDeleteModal();
                }
            }
            
            // Ctrl/Cmd + N to add new member
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openMemberModal();
            }
        });
        
        // Clear field errors on input
        $(`${SELECTORS.memberForm} input, ${SELECTORS.memberForm} select, ${SELECTORS.memberForm} textarea`)
            .on('input change', function() {
                $(this).removeClass('border-red-500 ring-2 ring-red-200');
            });
    };

    /**
     * Attach event listeners to card action buttons
     * (Called after rendering cards)
     */
    const attachCardEventListeners = () => {
        // Edit member buttons
        $('.btn-edit-member').off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const memberId = $(this).data('member-id');
            openMemberModal(memberId);
        });
        
        // Delete member buttons
        $('.btn-delete-member').off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const memberId = $(this).data('member-id');
            const memberName = $(this).data('member-name');
            openDeleteModal(memberId, memberName);
        });
    };

    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
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
        refreshMembers,
        openMemberModal,
        closeMemberModal,
        clearFilters,
        
        // State getters
        getMembers: () => [...members],
        getFilteredMembers: () => [...filteredMembers],
        getMemberById,
        getMemberLink,
        
        // Utilities
        generateMemberId
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    MembersPage.init();
});

// ============================================
// 🎨 CSS ANIMATIONS (injected)
// ============================================

(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .member-card {
            animation: fadeInUp 0.3s ease forwards;
        }
    `;
    document.head.appendChild(style);
})();