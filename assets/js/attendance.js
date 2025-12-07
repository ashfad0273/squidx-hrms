/**
 * SquidX HRM — Attendance Page Controller
 * =========================================
 * Handles all attendance page logic including:
 * - Date selection & calendar modal
 * - Attendance table loading & rendering
 * - Single & bulk attendance entry
 * - Status & hours calculation
 * 
 * Dependencies:
 *   - jQuery
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const AttendancePage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    let selectedDate = null;
    let settings = {};
    let members = [];
    let attendanceRecords = [];
    let isLoading = false;

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    const SELECTORS = {
        // Containers
        attendanceTable: '#attendanceTable',
        attendanceTableBody: '#attendanceTableBody',
        tableContainer: '#tableContainer',
        
        // Display elements
        selectedDateDisplay: '#selectedDateDisplay',
        totalCount: '#totalCount',
        presentCount: '#presentCount',
        lateCount: '#lateCount',
        absentCount: '#absentCount',
        
        // Buttons
        btnSelectDate: '#btnSelectDate',
        btnAddAttendance: '#btnAddAttendance',
        btnAddAllMembers: '#btnAddAllMembers',
        btnRefresh: '#btnRefresh',
        
        // Date Modal
        dateModal: '#dateModal',
        calendarGrid: '#calendarGrid',
        calendarMonthYear: '#calendarMonthYear',
        btnPrevMonth: '#btnPrevMonth',
        btnNextMonth: '#btnNextMonth',
        btnCloseDateModal: '#btnCloseDateModal',
        
        // Single Attendance Modal
        singleModal: '#singleAttendanceModal',
        singleForm: '#singleAttendanceForm',
        memberSelect: '#memberSelect',
        punchInInput: '#punchInInput',
        punchOutInput: '#punchOutInput',
        commentsInput: '#commentsInput',
        btnCloseSingleModal: '#btnCloseSingleModal',
        btnSaveSingleAttendance: '#btnSaveSingleAttendance',
        
        // Bulk Attendance Modal
        bulkModal: '#bulkAttendanceModal',
        bulkForm: '#bulkAttendanceForm',
        memberCheckboxList: '#memberCheckboxList',
        btnSelectAll: '#btnSelectAll',
        btnDeselectAll: '#btnDeselectAll',
        bulkPunchIn: '#bulkPunchIn',
        bulkPunchOut: '#bulkPunchOut',
        btnCloseBulkModal: '#btnCloseBulkModal',
        btnSaveBulkAttendance: '#btnSaveBulkAttendance',
        
        // Filters
        filterDepartment: '#filterDepartment',
        filterStatus: '#filterStatus',
        searchInput: '#searchInput'
    };

    // Calendar state
    let calendarDate = new Date();

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the attendance page
     */
    const init = async () => {
        CONFIG.log('Initializing Attendance Page...');
        
        try {
            // Show initial loading state
            showPageLoading();
            
            // Step 1: Load settings
            await loadSettings();
            
            // Step 2: Load all members
            await loadMembers();
            
            // Step 3: Determine selected date
            initializeDate();
            
            // Step 4: Setup event listeners
            setupEventListeners();
            
            // Step 5: Load attendance for selected date
            await loadAttendance();
            
            // Step 6: Populate filter dropdowns
            populateFilters();
            
            CONFIG.log('Attendance Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Attendance Page:', error);
            Utils.showToast('Failed to load attendance page. Please refresh.', 'error');
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
            // Use defaults if settings fail
            settings = {
                StartTime: '09:00',
                WorkingDays: 'Mon,Tue,Wed,Thu,Fri',
                LateGracePeriod: '10',
                WorkingHoursPerDay: '8',
                PaidLeavePerMonth: '2'
            };
            Utils.showToast('Using default settings', 'warning');
        }
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
     * Initialize the selected date from URL or use today
     */
    const initializeDate = () => {
        const urlDate = Utils.getUrlParam('date');
        
        if (urlDate && isValidDate(urlDate)) {
            selectedDate = urlDate;
        } else {
            selectedDate = Utils.getToday();
        }
        
        // Update the URL without reload
        Utils.setUrlParam('date', selectedDate);
        
        // Update display
        updateDateDisplay();
        
        CONFIG.log('Selected date:', selectedDate);
    };

    // ============================================
    // 📅 DATE SELECTION & CALENDAR
    // ============================================

    /**
     * Opens the date selection modal
     */
    const openDateModal = () => {
        // Set calendar to current selected date's month
        const [year, month] = selectedDate.split('-').map(Number);
        calendarDate = new Date(year, month - 1, 1);
        
        // Render calendar
        renderCalendar();
        
        // Show modal
        $(SELECTORS.dateModal).removeClass('hidden').addClass('flex');
        
        // Animate in
        setTimeout(() => {
            $(SELECTORS.dateModal).find('.modal-content').removeClass('scale-95 opacity-0');
        }, 10);
    };

    /**
     * Closes the date selection modal
     */
    const closeDateModal = () => {
        const modal = $(SELECTORS.dateModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
        }, 200);
    };

    /**
     * Renders the calendar grid
     */
    const renderCalendar = () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        
        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        $(SELECTORS.calendarMonthYear).text(`${monthNames[month]} ${year}`);
        
        // Get working days from settings
        const workingDays = getWorkingDaysArray();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Build calendar HTML
        let html = '';
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        html += '<div class="grid grid-cols-7 gap-1 mb-2">';
        dayHeaders.forEach(day => {
            html += `<div class="text-center text-xs font-medium text-gray-500 py-2">${day}</div>`;
        });
        html += '</div>';
        
        // Calendar days
        html += '<div class="grid grid-cols-7 gap-1">';
        
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="h-10"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = Utils.formatDate(dateObj);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            const isToday = dateStr === Utils.getToday();
            const isSelected = dateStr === selectedDate;
            const isFuture = dateObj > today;
            const isWorkingDay = workingDays.includes(dayName);
            const isDisabled = isFuture || !isWorkingDay;
            
            let classes = 'h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ';
            
            if (isDisabled) {
                classes += 'text-gray-300 cursor-not-allowed';
            } else if (isSelected) {
                classes += 'bg-blue-500 text-white cursor-pointer';
            } else if (isToday) {
                classes += 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200';
            } else {
                classes += 'text-gray-700 cursor-pointer hover:bg-gray-100';
            }
            
            html += `<div class="${classes}" data-date="${dateStr}" ${isDisabled ? '' : 'role="button"'}>${day}</div>`;
        }
        
        html += '</div>';
        
        $(SELECTORS.calendarGrid).html(html);
        
        // Attach click events to valid dates
        $(SELECTORS.calendarGrid).find('[data-date]').not('.cursor-not-allowed').on('click', function() {
            const date = $(this).data('date');
            selectDate(date);
        });
    };

    /**
     * Navigate to previous month
     */
    const prevMonth = () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    };

    /**
     * Navigate to next month
     */
    const nextMonth = () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    };

    /**
     * Select a date and reload attendance
     */
    const selectDate = async (date) => {
        selectedDate = date;
        Utils.setUrlParam('date', date);
        updateDateDisplay();
        closeDateModal();
        await loadAttendance();
    };

    /**
     * Update the date display element
     */
    const updateDateDisplay = () => {
        const display = Utils.formatDateDisplay(selectedDate);
        const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
        $(SELECTORS.selectedDateDisplay).text(`${dayName}, ${display}`);
    };

    /**
     * Get working days as array from settings
     */
   const getWorkingDaysArray = () => {
    if (!settings.WorkingDays) return ['Mon','Tue','Wed','Thu','Fri'];

    return settings.WorkingDays
        .replace(/\|/g, ',')             // Convert | to ,
        .split(',')                      
        .map(d => d.trim().slice(0,3));  // Normalize -> Mon, Tue, Wed
};

    /**
     * Normalize backend / Sheets time into HH:MM for the UI
     */
    const normalizeSheetTime = (value) => {
        if (!value) return '';

        // Already HH:MM
        if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
            return value;
        }

        // HH:MM:SS -> HH:MM
        if (typeof value === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
            const [h, m] = value.split(':');
            return `${h.padStart(2, '0')}:${m}`;
        }

        // ISO string with time (e.g., 2025-01-01T09:00:00Z)
        if (typeof value === 'string' && value.includes('T')) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                const h = String(d.getHours()).padStart(2, '0');
                const m = String(d.getMinutes()).padStart(2, '0');
                return `${h}:${m}`;
            }
        }

        return value; // Fallback – whatever it is
    };

    // ============================================
    // 📋 ATTENDANCE TABLE
    // ============================================

    /**
     * Load attendance for selected date
     */
    const loadAttendance = async () => {
        try {
            showTableLoading();
            
            attendanceRecords = await API.getAttendanceByDate(selectedDate);
            CONFIG.log(`Loaded ${attendanceRecords.length} attendance records for ${selectedDate}`);
            
            renderAttendanceTable();
            updateSummaryCards();
            
        } catch (error) {
            CONFIG.logError('Failed to load attendance:', error);
            Utils.showToast('Failed to load attendance data', 'error');
            renderEmptyTable('Failed to load data. Please try again.');
        } finally {
            hideTableLoading();
            hidePageLoading();
        }
    };

    /**
     * Render the attendance table
     */
    const renderAttendanceTable = () => {
        const tableBody = $(SELECTORS.attendanceTableBody);
        
        if (attendanceRecords.length === 0) {
            renderEmptyTable('No attendance records for this date.');
            return;
        }
        
        // Apply filters
        let filteredRecords = applyFilters(attendanceRecords);
        
        if (filteredRecords.length === 0) {
            renderEmptyTable('No records match your filters.');
            return;
        }
        
        let html = '';
        
        filteredRecords.forEach((record, index) => {
            const member = getMemberById(record.memberId);
            const memberName = record.memberName || member?.name || 'Unknown';
            const memberPhoto = record.memberPhoto || member?.photoURL || '';
            const department = record.department || member?.department || '';
            const memberLink = Utils.getMemberLink(record.memberId);
            
            html += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <!-- Photo & Name (Clickable) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <a href="${memberLink}" class="flex items-center group">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full object-cover border-2 border-transparent group-hover:border-blue-500 transition-all" 
                                     src="${memberPhoto || Utils.getAvatarUrl(memberName)}" 
                                     alt="${Utils.escapeHtml(memberName)}"
                                     onerror="this.src='${Utils.getAvatarUrl(memberName)}'">
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                    ${Utils.escapeHtml(memberName)}
                                </div>
                                <div class="text-sm text-gray-500">${Utils.escapeHtml(department)}</div>
                            </div>
                        </a>
                    </td>
                    
                    <!-- Punch In -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                            </svg>
                            <span class="text-sm text-gray-900 font-medium">
                                ${normalizeSheetTime(record.punchIn) ? formatTimeDisplay(normalizeSheetTime(record.punchIn)) : '—'}
                            </span>
                        </div>
                    </td>
                    
                    <!-- Punch Out -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                            <span class="text-sm text-gray-900 font-medium">
    ${normalizeSheetTime(record.punchOut) ? formatTimeDisplay(normalizeSheetTime(record.punchOut)) : '—'}
</span>

                        </div>
                    </td>
                    
                    <!-- Hours Worked -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm text-gray-900">
                            ${normalizeHours(record.hoursWorked, record.punchIn, record.punchOut)}

                        </span>
                    </td>
                    
                    <!-- Status -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${renderStatusBadge(record.status)}
                    </td>
                    
                    <!-- Comments -->
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-600 max-w-xs truncate block" title="${Utils.escapeHtml(record.comments || '')}">
                            ${Utils.escapeHtml(record.comments) || '—'}
                        </span>
                    </td>
                    
                    <!-- Actions -->
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-blue-600 hover:text-blue-900 mr-3 btn-edit-attendance" 
                                data-member-id="${record.memberId}"
                                data-date="${selectedDate}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="text-red-600 hover:text-red-900 btn-delete-attendance" 
                                data-member-id="${record.memberId}"
                                data-date="${selectedDate}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.html(html);
        
        // Attach action button events
        attachTableActionEvents();
    };

    /**
     * Render empty table state
     */
    const renderEmptyTable = (message) => {
        const tableBody = $(SELECTORS.attendanceTableBody);
        
        tableBody.html(`
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        </svg>
                        <p class="text-gray-500 text-lg font-medium">${Utils.escapeHtml(message)}</p>
                        <button id="btnAddFirstAttendance" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            Add Attendance
                        </button>
                    </div>
                </td>
            </tr>
        `);
        
        // Attach event to the button
        $('#btnAddFirstAttendance').on('click', openSingleModal);
    };

    /**
     * Apply filters to attendance records
     */
    const applyFilters = (records) => {
        let filtered = [...records];
        
        // Department filter
        const department = $(SELECTORS.filterDepartment).val();
        if (department && department !== 'all') {
            filtered = filtered.filter(r => {
                const member = getMemberById(r.memberId);
                return member?.department === department || r.department === department;
            });
        }
        
        // Status filter
        const status = $(SELECTORS.filterStatus).val();
        if (status && status !== 'all') {
            filtered = filtered.filter(r => r.status === status);
        }
        
        // Search filter
        const search = $(SELECTORS.searchInput).val();
        if (search) {
            const query = search.toLowerCase();
            filtered = filtered.filter(r => {
                const member = getMemberById(r.memberId);
                const name = (r.memberName || member?.name || '').toLowerCase();
                return name.includes(query);
            });
        }
        
        return filtered;
    };

    /**
     * Populate filter dropdowns
     */
    const populateFilters = () => {
        // Department filter
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))];
        let deptOptions = '<option value="all">All Departments</option>';
        departments.forEach(dept => {
            deptOptions += `<option value="${Utils.escapeHtml(dept)}">${Utils.escapeHtml(dept)}</option>`;
        });
        $(SELECTORS.filterDepartment).html(deptOptions);
        
        // Status filter
        const statusOptions = `
            <option value="all">All Status</option>
            <option value="On Time">On Time</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
            <option value="Half Day">Half Day</option>
        `;
        $(SELECTORS.filterStatus).html(statusOptions);
    };

    /**
     * Update summary cards
     */
    const updateSummaryCards = () => {
        const total = members.length;

        const present = attendanceRecords.filter(r =>
            r.status === 'On Time' || r.status === 'Present'
        ).length;

        const late = attendanceRecords.filter(r => r.status === 'Late').length;

        const onLeave = attendanceRecords.filter(r => r.status === 'On Leave').length;

        // Everyone not present/late/on leave is effectively absent
        const absent = total - (present + late + onLeave);

        $(SELECTORS.totalCount).text(total);
        $(SELECTORS.presentCount).text(present);
        $(SELECTORS.lateCount).text(late);
        $(SELECTORS.absentCount).text(absent);
    };

    /**
     * Attach events to table action buttons
     */
    const attachTableActionEvents = () => {
        // Edit attendance
        $('.btn-edit-attendance').off('click').on('click', function() {
            const memberId = $(this).data('member-id');
            const date = $(this).data('date');
            openEditModal(memberId, date);
        });
        
        // Delete attendance
        $('.btn-delete-attendance').off('click').on('click', async function() {
            const memberId = $(this).data('member-id');
            const date = $(this).data('date');
            
            const confirmed = await Utils.showConfirm(
                'Are you sure you want to delete this attendance record?',
                'Delete Attendance'
            );
            
            if (confirmed) {
                await deleteAttendanceRecord(memberId, date);
            }
        });
    };

    // ============================================
    // 📝 SINGLE ATTENDANCE MODAL
    // ============================================

    /**
     * Open single attendance modal
     */
    const openSingleModal = () => {
        if (!getWorkingDaysArray().includes(
        new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' })
    )) {
    Utils.showToast("Cannot add attendance on a non-working day", "error");
    return;
}

        // Reset form
        $(SELECTORS.singleForm)[0]?.reset();
        
        // Populate member dropdown
        populateMemberDropdown();
        
        // Set default punch times
        $(SELECTORS.punchInInput).val('09:00');
        $(SELECTORS.punchOutInput).val('18:00');
        
        // Update modal title
        $(SELECTORS.singleModal).find('.modal-title').text('Add Attendance');
        $(SELECTORS.btnSaveSingleAttendance).text('Save Attendance').data('mode', 'add');
        
        // Show modal
        $(SELECTORS.singleModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.singleModal).find('.modal-content').removeClass('scale-95 opacity-0');
            $(SELECTORS.memberSelect).focus();
        }, 10);
    };

    /**
     * Open edit modal for existing attendance
     */
    const openEditModal = (memberId, date) => {
        const record = attendanceRecords.find(r => r.memberId === memberId);
        
        if (!record) {
            Utils.showToast('Attendance record not found', 'error');
            return;
        }
        
        // Reset and populate form
        $(SELECTORS.singleForm)[0]?.reset();
        populateMemberDropdown();
        
        // Set values
        $(SELECTORS.memberSelect).val(memberId).prop('disabled', true);
        $(SELECTORS.punchInInput).val(normalizeSheetTime(record.punchIn) || '');
        $(SELECTORS.punchOutInput).val(normalizeSheetTime(record.punchOut) || '');
        $(SELECTORS.commentsInput).val(record.comments || '');
        // Load previous status but DO NOT override auto-mode
$('#statusOverride').val(''); 

        
        // Update modal title
        $(SELECTORS.singleModal).find('.modal-title').text('Edit Attendance');
        $(SELECTORS.btnSaveSingleAttendance)
            .text('Update Attendance')
            .data('mode', 'edit')
            .data('member-id', memberId);
        
        // Show modal
        $(SELECTORS.singleModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.singleModal).find('.modal-content').removeClass('scale-95 opacity-0');
            $(SELECTORS.punchInInput).focus();
        }, 10);
    };

    /**
     * Close single attendance modal
     */
    const closeSingleModal = () => {
        const modal = $(SELECTORS.singleModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
            $(SELECTORS.memberSelect).prop('disabled', false);
        }, 200);
    };

    /**
     * Populate member dropdown
     */
    const populateMemberDropdown = () => {
        // Get members who don't have attendance for this date
        const attendedMemberIds = attendanceRecords.map(r => r.memberId);
        
        let options = '<option value="">Select Member</option>';
        
        members.forEach(member => {
            const hasAttendance = attendedMemberIds.includes(member.memberId);
            const disabled = hasAttendance ? 'disabled' : '';
            const suffix = hasAttendance ? ' (Already marked)' : '';
            
            options += `<option value="${member.memberId}" ${disabled}>
                ${Utils.escapeHtml(member.name)} - ${Utils.escapeHtml(member.department || 'N/A')}${suffix}
            </option>`;
        });
        
        $(SELECTORS.memberSelect).html(options);
    };

    /**
     * Save single attendance
     */
    const saveSingleAttendance = async () => {
        const mode = $(SELECTORS.btnSaveSingleAttendance).data('mode') || 'add';
        const memberId = mode === 'edit' 
            ? $(SELECTORS.btnSaveSingleAttendance).data('member-id')
            : $(SELECTORS.memberSelect).val();
        
        const punchIn = $(SELECTORS.punchInInput).val().trim();
        const punchOut = $(SELECTORS.punchOutInput).val().trim();
        const comments = $(SELECTORS.commentsInput).val().trim();
        
        // Validation
        if (!memberId) {
            Utils.showToast('Please select a member', 'warning');
            return;
        }
        
        // Calculate status and hours
        let override = $('#statusOverride').val();
let status = override && override !== '' ? override : calculateStatus(punchIn, punchOut);

        const hoursWorked = punchOut ? calculateHours(punchIn, punchOut) : '';

        
        // Build attendance record
        const record = {
            date: selectedDate,
            memberId: memberId,
            punchIn: punchIn,
            punchOut: punchOut,
            status: status,
            hoursWorked: hoursWorked,
            comments: comments
        };
        
        try {
            // Show loading state
            $(SELECTORS.btnSaveSingleAttendance).prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
            `);
            
            await API.saveAttendance([record]);
            
            Utils.showToast(`Attendance ${mode === 'edit' ? 'updated' : 'saved'} successfully!`, 'success');
            closeSingleModal();
            await loadAttendance();
            
        } catch (error) {
            CONFIG.logError('Failed to save attendance:', error);
            Utils.showToast(error.message || 'Failed to save attendance', 'error');
        } finally {
            $(SELECTORS.btnSaveSingleAttendance).prop('disabled', false).text(
                mode === 'edit' ? 'Update Attendance' : 'Save Attendance'
            );
        }
    };

    // ============================================
    // 📝 BULK ATTENDANCE MODAL
    // ============================================

    /**
     * Open bulk attendance modal
     */
  const openBulkModal = () => {
    const day = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' });
    if (!getWorkingDaysArray().includes(day)) {
        Utils.showToast("Cannot add attendance on a non-working day", "error");
        return;
    }

    $(SELECTORS.bulkForm)[0]?.reset();
    $(SELECTORS.bulkPunchIn).val('09:00');
    $(SELECTORS.bulkPunchOut).val('18:00');

    populateMemberCheckboxList();

    $(SELECTORS.bulkModal).removeClass('hidden').addClass('flex');
    setTimeout(() => {
        $(SELECTORS.bulkModal).find('.modal-content').removeClass('scale-95 opacity-0');
    }, 10);
};



    /**
     * Close bulk attendance modal
     */
    const closeBulkModal = () => {
        const modal = $(SELECTORS.bulkModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
        }, 200);
    };

    /**
     * Populate member checkbox list for bulk entry
     */
    const populateMemberCheckboxList = () => {
        const attendedMemberIds = attendanceRecords.map(r => r.memberId);
        
        let html = '';
        
        members.forEach(member => {
            const hasAttendance = attendedMemberIds.includes(member.memberId);
            const checked = !hasAttendance ? '' : '';
            const disabled = hasAttendance ? 'disabled' : '';
            const opacity = hasAttendance ? 'opacity-50' : '';
            const badge = hasAttendance 
                ? '<span class="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Marked</span>' 
                : '';
            
            html += `
                <label class="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer ${opacity}">
                    <input type="checkbox" 
                           class="member-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                           value="${member.memberId}"
                           ${checked}
                           ${disabled}>
                    <img src="${member.photoURL || Utils.getAvatarUrl(member.name)}" 
                         alt="${Utils.escapeHtml(member.name)}"
                         class="w-8 h-8 rounded-full ml-3 object-cover"
                         onerror="this.src='${Utils.getAvatarUrl(member.name)}'">
                    <div class="ml-3 flex-grow">
                        <p class="text-sm font-medium text-gray-900">${Utils.escapeHtml(member.name)}</p>
                        <p class="text-xs text-gray-500">${Utils.escapeHtml(member.department || 'N/A')}</p>
                    </div>
                    ${badge}
                </label>
            `;
        });
        
        $(SELECTORS.memberCheckboxList).html(html);
    };

    /**
     * Select all members in bulk modal
     */
    const selectAllMembers = () => {
        $(SELECTORS.memberCheckboxList).find('.member-checkbox:not(:disabled)').prop('checked', true);
    };

    /**
     * Deselect all members in bulk modal
     */
    const deselectAllMembers = () => {
        $(SELECTORS.memberCheckboxList).find('.member-checkbox').prop('checked', false);
    };

    /**
     * Save bulk attendance
     */
    const saveBulkAttendance = async () => {
        const selectedMembers = [];
        $(SELECTORS.memberCheckboxList).find('.member-checkbox:checked').each(function() {
            selectedMembers.push($(this).val());
        });
        
        if (selectedMembers.length === 0) {
            Utils.showToast('Please select at least one member', 'warning');
            return;
        }
        
        const punchIn = $(SELECTORS.bulkPunchIn).val().trim();
        const punchOut = $(SELECTORS.bulkPunchOut).val().trim();
        
        // Build batch
        const batch = selectedMembers.map(memberId => {
            const status = calculateStatus(punchIn, punchOut);
            const hoursWorked = punchOut ? calculateHours(punchIn, punchOut) : '';
            
            return {
                date: selectedDate,
                memberId: memberId,
                punchIn: punchIn,
                punchOut: punchOut,
                status: status,
                hoursWorked: hoursWorked,
                comments: ''
            };
        });
        
        try {
            $(SELECTORS.btnSaveBulkAttendance).prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving ${batch.length} records...
            `);
            
            await API.saveAttendance(batch);
            
            Utils.showToast(`${batch.length} attendance records saved successfully!`, 'success');
            closeBulkModal();
            await loadAttendance();
            
        } catch (error) {
            CONFIG.logError('Failed to save bulk attendance:', error);
            Utils.showToast(error.message || 'Failed to save attendance', 'error');
        } finally {
            $(SELECTORS.btnSaveBulkAttendance).prop('disabled', false).text('Save All');
        }
    };

    // ============================================
    // 🗑️ DELETE ATTENDANCE
    // ============================================

    /**
     * Delete an attendance record
     */
    const deleteAttendanceRecord = async (memberId, date) => {
        try {
            Utils.showLoading(SELECTORS.tableContainer, 'Deleting...');
            
            await API.deleteAttendance(date, memberId);
            
            Utils.showToast('Attendance record deleted', 'success');
            await loadAttendance();
            
        } catch (error) {
            CONFIG.logError('Failed to delete attendance:', error);
            Utils.showToast(error.message || 'Failed to delete attendance', 'error');
            Utils.hideLoading(SELECTORS.tableContainer);
        }
    };

    // ============================================
    // 🔢 CALCULATION UTILITIES
    // ============================================

    /**
     * Parse time string to minutes since midnight
     */
    const parseTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        
        const parts = timeStr.split(':');
        if (parts.length < 2) return null;
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes)) return null;
        
        return hours * 60 + minutes;
    };

    /**
     * Format minutes to HH:MM string
     */
    const formatTimeFromMinutes = (totalMinutes) => {
        if (totalMinutes === null || totalMinutes === undefined) return '';
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    /**
     * Format time for display (with AM/PM)
     */
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return '—';
        
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return timeStr;
        
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    };

    /**
     * Calculate attendance status based on punch times
     */
    const calculateStatus = (punchIn, punchOut) => {
        // If no punch in and no punch out → Absent
        if (!punchIn && !punchOut) {
            return 'Absent';
        }
        
        // If only punch in (no punch out yet), still consider present
        if (!punchIn) {
            return 'Absent';
        }
        
        // Parse times
        const startTimeMinutes = parseTime(settings.StartTime || '09:00');
        const graceMinutes = parseInt(settings.LateGracePeriod, 10) || 0;
        const punchInMinutes = parseTime(punchIn);
        
        if (punchInMinutes === null) {
            return 'Present';
        }
        
        // Grace end time
        const graceEndMinutes = startTimeMinutes + graceMinutes;
        
        // Determine status
        if (punchInMinutes <= graceEndMinutes) {
            return 'On Time';
        } else {
            return 'Late';
        }
    };

    /**
     * Calculate hours worked between punch in and punch out
     */
    const calculateHours = (punchIn, punchOut) => {
        if (!punchIn || !punchOut) return '0:00';
        
        const inMinutes = parseTime(punchIn);
        const outMinutes = parseTime(punchOut);
        
        if (inMinutes === null || outMinutes === null) return '0:00';
        
        let diffMinutes = outMinutes - inMinutes;
        
        // Handle overnight shifts
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }
        
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    };

    /**
     * Calculate hours for display (with "hrs" suffix)
     */
    const calculateHoursDisplay = (punchIn, punchOut) => {
        const hoursWorked = calculateHours(punchIn, punchOut);
        
        if (hoursWorked === '0:00') return '—';
        
        const [hours, minutes] = hoursWorked.split(':').map(Number);
        const decimal = hours + (minutes / 60);
        
        return `${decimal.toFixed(1)} hrs`;
    };

    // ============================================
    // 🎨 RENDERING UTILITIES
    // ============================================

    /**
     * Render status badge HTML
     */
    const renderStatusBadge = (status) => {
        const badges = {
            'On Time': {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
            },
            'Present': {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
            },
            'Late': {
                bg: 'bg-amber-100',
                text: 'text-amber-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>`
            },
            'Absent': {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`
            },
            'On Leave': {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"></path><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`
            },
            'Half Day': {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>`
            }
        };
        
        const badge = badges[status] || {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            icon: ''
        };
        
        return `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}">
                ${badge.icon}
                ${Utils.escapeHtml(status)}
            </span>
        `;
    };

    // ============================================
    // 🔍 LOOKUP UTILITIES
    // ============================================

    /**
     * Get member by ID from cached list
     */
    const getMemberById = (memberId) => {
        return members.find(m => m.memberId === memberId) || null;
    };

    /**
     * Get member name by ID
     */
    const getMemberName = (memberId) => {
        const member = getMemberById(memberId);
        return member?.name || 'Unknown';
    };

    /**
     * Get member photo URL by ID
     */
    const getMemberPhoto = (memberId) => {
        const member = getMemberById(memberId);
        return member?.photoURL || Utils.getAvatarUrl(getMemberName(memberId));
    };

    // ============================================
    // ⏳ LOADING UTILITIES
    // ============================================

    /**
     * Show page loading state
     */
    const showPageLoading = () => {
        isLoading = true;
        Utils.showLoading('main', 'Loading attendance...');
    };

    /**
     * Hide page loading state
     */
    const hidePageLoading = () => {
        isLoading = false;
        Utils.hideLoading('main');
    };

    /**
     * Show table loading state
     */
    const showTableLoading = () => {
        $(SELECTORS.attendanceTableBody).html(`
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p class="text-gray-500">Loading attendance records...</p>
                    </div>
                </td>
            </tr>
        `);
    };

    /**
     * Hide table loading state (implicitly done by renderAttendanceTable)
     */
    const hideTableLoading = () => {
        // This is handled by the render function
    };

    // ============================================
    // ✅ VALIDATION UTILITIES
    // ============================================

    /**
     * Validate date string
     */
    const isValidDate = (dateStr) => {
        if (!dateStr) return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Date Selection
        $(SELECTORS.btnSelectDate).on('click', openDateModal);
        $('#btnToday').on('click', () => {
    const today = Utils.getToday();
    selectDate(today);
    closeDateModal();
});

        $(SELECTORS.btnCloseDateModal).on('click', closeDateModal);
        $(SELECTORS.btnPrevMonth).on('click', prevMonth);
        $(SELECTORS.btnNextMonth).on('click', nextMonth);
        
        // Single Attendance Modal
        $(SELECTORS.btnAddAttendance).on('click', openSingleModal);
        $(SELECTORS.btnCloseSingleModal).on('click', closeSingleModal);
        $('#btnCancelSingle').on('click', closeSingleModal);
        $(SELECTORS.btnSaveSingleAttendance).on('click', saveSingleAttendance);
        
        // Bulk Attendance Modal
        $(SELECTORS.btnAddAllMembers).on('click', openBulkModal);
        $(SELECTORS.btnCloseBulkModal).on('click', closeBulkModal);
        $('#btnCancelBulk').on('click', closeBulkModal);
        $(SELECTORS.btnSelectAll).on('click', selectAllMembers);
        $(SELECTORS.btnDeselectAll).on('click', deselectAllMembers);
        $(SELECTORS.btnSaveBulkAttendance).on('click', saveBulkAttendance);
        
        // Refresh Button
        $(SELECTORS.btnRefresh).on('click', async () => {
            await loadAttendance();
            Utils.showToast('Attendance refreshed', 'info');
        });
        
        // Filters
        $(SELECTORS.filterDepartment).on('change', renderAttendanceTable);
        $(SELECTORS.filterStatus).on('change', renderAttendanceTable);
        $(SELECTORS.searchInput).on('input', debounce(renderAttendanceTable, 300));
        
        // Modal backdrop clicks
        $(SELECTORS.dateModal).on('click', function(e) {
            if (e.target === this) closeDateModal();
        });
        $(SELECTORS.singleModal).on('click', function(e) {
            if (e.target === this) closeSingleModal();
        });
        $(SELECTORS.bulkModal).on('click', function(e) {
            if (e.target === this) closeBulkModal();
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            // ESC to close modals
            if (e.key === 'Escape') {
                if (!$(SELECTORS.dateModal).hasClass('hidden')) {
                    closeDateModal();
                }
                if (!$(SELECTORS.singleModal).hasClass('hidden')) {
                    closeSingleModal();
                }
                if (!$(SELECTORS.bulkModal).hasClass('hidden')) {
                    closeBulkModal();
                }
            }
        });
        
        // Form submissions (prevent default)
        $(SELECTORS.singleForm).on('submit', function(e) {
            e.preventDefault();
            saveSingleAttendance();
        });
        $(SELECTORS.bulkForm).on('submit', function(e) {
            e.preventDefault();
            saveBulkAttendance();
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

    /**
 * Fix hoursWorked if Sheets returns a date object
 */
const normalizeHours = (hoursWorked, punchIn, punchOut) => {
    // If punchOut missing → no hours
    if (!punchOut) return '—';

    // Correct HH:MM format? Use it.
    if (typeof hoursWorked === 'string' && /^\d+:\d{2}$/.test(hoursWorked)) {
        return hoursWorked;
    }

    // If backend sent ISO date → ignore and recalc
    if (typeof hoursWorked === 'string' && hoursWorked.includes('T')) {
        return calculateHoursDisplay(
            normalizeSheetTime(punchIn),
            normalizeSheetTime(punchOut)
        );
    }

    // If empty → recalc
    if (!hoursWorked) {
        return calculateHoursDisplay(
            normalizeSheetTime(punchIn),
            normalizeSheetTime(punchOut)
        );
    }

    // Fallback
    return hoursWorked;
};


    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        loadAttendance,
        openDateModal,
        closeDateModal,
        openSingleModal,
        closeSingleModal,
        openBulkModal,
        closeBulkModal,
        selectDate,
        
        // Expose utilities for testing
        calculateStatus,
        calculateHours,
        parseTime,
        formatTimeDisplay,
        getMemberById,
        
        // State getters
        getSelectedDate: () => selectedDate,
        getSettings: () => settings,
        getMembers: () => members,
        getAttendanceRecords: () => attendanceRecords
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    AttendancePage.init();
});