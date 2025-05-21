import { LightningElement, api, track } from 'lwc';

import { 
    getExistingElevators, 
    getExistingElevator 
} from 'c/onboardingApiService';

import { 
    ELEVATOR_STATUS,
    NO_ELEVATORS_FOUND,
    ERROR,
    STEPS,
    DEFAULT_ELEVATOR_DETAILS
} from 'c/onboardingConstants';


export default class OnboardingPageLwc extends LightningElement {
    noElevatorsFound = NO_ELEVATORS_FOUND;
    @track steps = JSON.parse(JSON.stringify(STEPS));

    parameters = {};

    @track rightSidebarWidth = 400;
    @track isRightSidebarOpen = false;

    @track selectedTask = {};
    @track sectionNames = [];

    isResizing = false;
    startX = 0;
    startWidth = 0;

    @track isLoading = false;
    @track error;
    
    @track elevators = [];

    // Track unsaved changes
    @track draftChanges = {};

    @track toast;
    @track showToast = false;


    get selectedElevator() {
        return this.elevators.find(elevator => elevator.isActive);
    }

    get hasNoElevators() {
        return this.elevators.length === 0;
    }


    async connectedCallback() {
        this.parameters = this.getQueryParameters();
        try {
            this.isLoading = true;
            let elevators = await getExistingElevators({
                userId: this.parameters.userId,
                contractId: this.parameters.contractId
            });
            this.elevators = this.prepareElevators(elevators.data);

            if (this.selectedElevator != null) {
                console.log('elevators length > 0');
                let details = await getExistingElevator(this.selectedElevator.id, {
                    userId: this.parameters.userId,
                    contractId: this.parameters.contractId
                });
                this.selectedElevator.details = details != null && details.data != null ? this.prepareElevatorDetails(details.data) : null;
                console.log('elevator details', JSON.stringify(this.elevators));
            }
        } catch (error) {
            console.error('Error fetching elevators:', error);
            this.error = {
                MESSAGE: error?.body?.message || error?.message || ERROR.MESSAGE,
                TITLE: ERROR.TITLE,
                ILLUSTRATOR: ERROR.ILLUSTRATOR
            };
        } finally {
            this.isLoading = false;
        }
        
        document.body.style.margin = '0';
        document.body.style.backgroundColor = '#f4f6f9';
        document.body.style.overflow = 'hidden';


        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    disconnectedCallback() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    prepareElevators(elevators) {
        let eList = elevators.map(elevator => ({
            id: elevator.id,
            label: elevator.name,
            className: 'tab',
            icon: elevator.status === 'Submitted' ? 'utility:clock' : 'utility:success',
            tooltip: elevator.status === 'Submitted' ? ELEVATOR_STATUS.PENDING : ELEVATOR_STATUS.APPROVED,
            isActive: false,
            isEditing: false,
            isNew: false
        }));
        // activate first item
        if (eList.length > 0) {
            eList[0].isActive = true;
            eList[0].className = 'tab active-tab';
        }
        return eList;
    }

    prepareElevatorDetails(details) {
        return {
            propertyDetails: JSON.parse(JSON.stringify(details.propertyDetails)),
            propertyUnitDetails: JSON.parse(JSON.stringify(details.propertyUnitDetails)),
            onSiteContacts: JSON.parse(JSON.stringify(details.onSiteContacts)),
            orderDetails: JSON.parse(JSON.stringify(details.orderDetails))
        };
    }



    // Left Sidebar actions
    addNewElevator(event) {
        const { elevatorId, elevatorName } = event.detail;
        const newElevator = {
            id: elevatorId,
            label: elevatorName,
            className: 'tab active-tab',
            icon: 'utility:add',
            tooltip: 'New',
            isNew: true,
            isActive: true,
            isEditing: true,    // NOTE: this is a flag to indicate that the elevator name is being edited
            details: JSON.parse(JSON.stringify(DEFAULT_ELEVATOR_DETAILS))
        }
        this.elevators = this.elevators.map(elevator => ({ ...elevator, className: 'tab', isActive: false }));
        this.elevators = [...this.elevators, newElevator];
    }

    selectElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            className: elevator.id === elevatorId ? 'tab active-tab' : 'tab',
            isActive: elevator.id === elevatorId ? true : false,
        }));
    }

    deleteElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.filter(tab => tab.id !== elevatorId);

        if (this.selectedElevator == null || (this.selectedElevator.id === elevatorId && this.elevators.length > 0)) {
            this.elevators[0].className = 'tab active-tab';
            this.elevators[0].isActive = true;
        }
    }

    handleUpload() {
        console.log('upload');
    }

    editTab(event) {
        const { elevatorId, flag } = event.detail;
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            isEditing: elevator.id === elevatorId ? flag : elevator.isEditing
        }));
    }

    handleTabLabelChange(event) {
        const { elevatorId, value } = event.detail;
        const elevator = this.elevators.find(elevator => elevator.id === elevatorId);
        if (elevator) {
            elevator.label = value;
        }
    }
    

    



    // Step/Card & Resizing actions
    handleTaskComplete(event) {
        if (!this.validateAndConfirmDraftChanges()) {
            return;
        }

        this.closeRightSidebar(false);

        setTimeout(() => this.openRightSidebar(event), 200);
    }

    openRightSidebar(event) {
        const { taskId, taskName } = event.detail;
        const [parentKey, childKey] = taskId.split('.');
        const taskData = this.selectedElevator.details?.[parentKey]?.[childKey];
    
        this.sectionNames = taskData.map(section => section.section);
        this.selectedTask = { id: taskId, name: taskName, data: taskData };
    
        this.isRightSidebarOpen = true;
    
        const mainContent = this.template.querySelector('.main-content');
        const rightSidebar = this.template.querySelector('.right-sidebar');
    
        mainContent.classList.add('sidebar-open');
        mainContent.style.marginRight = `${this.rightSidebarWidth}px`;
        rightSidebar.style.width = `${this.rightSidebarWidth}px`;
    
        this.addResizeListeners();
    }

    addResizeListeners() {
        const resizeHandle = this.template.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
            document.addEventListener('mousemove', this.resize.bind(this));
            document.addEventListener('mouseup', this.stopResize.bind(this));
        }
    }

    removeResizeListeners() {
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.stopResize.bind(this));
    }

    startResize(event) {
        this.isResizing = true;
        this.startX = event.clientX;
        this.startWidth = this.rightSidebarWidth;
        
        // Prevent text selection during resize
        event.preventDefault();
    }

    resize(event) {
        if (!this.isResizing) return;

        const deltaX = this.startX - event.clientX;
        const newWidth = Math.max(300, Math.min(600, this.startWidth + deltaX)); // Min 300px, max 800px
        
        this.rightSidebarWidth = newWidth;
        
        this.template.querySelector('.main-content').style.marginRight = `${newWidth}px`;
        this.template.querySelector('.right-sidebar').style.width = `${newWidth}px`;
    }

    stopResize() {
        this.isResizing = false;
    }




    // Right Sidebar actions
    closeRightSidebar(validateDrafts = true) {
        if (validateDrafts && !this.validateAndConfirmDraftChanges()) {
            return;
        }

        this.isRightSidebarOpen = false;
        const mainContent = this.template.querySelector('.main-content');
        mainContent.classList.remove('sidebar-open');
        mainContent.style.marginRight = '0';
        this.rightSidebarWidth = 400;
        this.removeResizeListeners();
    }

    get rightSidebarClass() {
        return `right-sidebar ${this.isRightSidebarOpen ? '' : 'hidden'}`;
    }

    handleDraftChange(event) {
        const { data } = event.detail;
        const { taskId, fieldName, fieldValue } = data;
    
        if (!this.draftChanges[taskId]) {
            this.draftChanges[taskId] = {};
        }
    
        this.draftChanges[taskId][fieldName] = { value: fieldValue };
        this.draftChanges = { ...this.draftChanges };
    }
    

    validateAndConfirmDraftChanges() {
        if (Object.keys(this.draftChanges).length > 0) {
            const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel? Changes will be lost.');
            if (!confirmCancel) {
                return false;
            }
        }
        this.draftChanges = {};
        return true;
    }

    handleBeforeUnload = (event) => {
        if (Object.keys(this.draftChanges || {}).length > 0) {
            event.preventDefault();
            event.returnValue = '';
        }
    };
    

    handleSave() {
        const [parentKey, childKey] = this.selectedTask.id.split('.');
        let taskData = this.selectedElevator.details?.[parentKey]?.[childKey];

        taskData.forEach(section => {
            section.fields.forEach(field => {
                const draft = this.draftChanges[this.selectedTask.id]?.[field.id];
                field.value = draft ? draft.value : field.value;
            });
        });

        this.draftChanges = {};
        this.markTaskComplete(this.selectedTask.id);
        this.closeRightSidebar(false);
        this.triggerToast('Success', 'Changes saved successfully', 'success');
    }

    markTaskComplete(taskId) {
        for (let stepKey in this.steps) {
            let step = this.steps[stepKey];
            let task = step.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = true;
                task.className = 'task-item completed';
                break;
            }
        }
    }
    
    



    getQueryParameters() {
        var params = {};
        var search = location.search.substring(1);

        if (search) {
            params = JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g, '":"') + '"}', (key, value) => {
                return key === "" ? value : decodeURIComponent(value)
            });
        }

        return params;
    }



    // TOAST
    triggerToast(title, message, variant = 'success') {
        this.toast = {
            title,
            message,
            variant,
            icon: this.getIconName(variant)
        }
        this.showToast = true;

        setTimeout(() => {
            this.hideToast();
        }, 3000);
    }

    hideToast() {
        this.showToast = false;
    }

    getIconName(variant) {
        switch (variant) {
            case 'success': return 'utility:success';
            case 'error': return 'utility:error';
            case 'warning': return 'utility:warning';
            case 'info': return 'utility:info';
            default: return 'utility:info';
        }
    }

    
}