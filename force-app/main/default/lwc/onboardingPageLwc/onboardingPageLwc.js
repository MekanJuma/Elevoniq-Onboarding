import { LightningElement, api, track } from 'lwc';
import getOnboardingData from '@salesforce/apex/OnboardingController.getOnboardingData';

export default class OnboardingPageLwc extends LightningElement {

    parameters = {};
    @track rightSidebarWidth = 400;
    @track isRightSidebarOpen = false;
    @track selectedTaskName = '';

    isResizing = false;
    startX = 0;
    startWidth = 0;
    

    elevators = [
        { id: 'el01', label: 'EL-01', className: 'tab active-tab', icon: 'utility:success' },
        { id: 'el02', label: 'EL-02', className: 'tab', icon: 'utility:edit' },
        { id: 'el03', label: 'EL-03', className: 'tab', icon: 'utility:clock' },
    ];
    selectedTabId = 'el01';


    @track step1Tasks = [
        { id: '1-1', name: 'Property Details', completed: true },
        { id: '1-2', name: 'Property Owner', completed: false },
        { id: '1-3', name: 'Asset Manager', completed: false }
    ];

    @track step2Tasks = [
        { id: '2-1', name: 'Property Unit Details', completed: false },
        { id: '2-2', name: 'Property Management', completed: false },
        { id: '2-3', name: 'Facility Management', completed: false },
        { id: '2-4', name: 'HV Company', completed: false },
        { id: '2-5', name: 'Operator', completed: false },
        { id: '2-6', name: 'Property Manager', completed: false },
        { id: '2-7', name: 'House Keeper', completed: false }
    ];

    @track step3Tasks = [
        { id: '3-1', name: 'Elevator Details', completed: false }
    ];

    @track step4Tasks = [
        { id: '4-1', name: 'Order Details', completed: false },
        { id: '4-2', name: 'Product Assignment', completed: false },
        { id: '4-3', name: 'Invoice Details', completed: false }
    ];


    get selectedElevator() {
        return this.elevators.find(elevator => elevator.id === this.selectedTabId);
    }


    connectedCallback() {
        this.parameters = this.getQueryParameters();
        document.body.style.margin = '0';
        document.body.style.backgroundColor = '#f4f6f9';
        document.body.style.overflow = 'hidden';
    }




    // Left Sidebar actions
    addNewElevator(event) {
        const { elevatorId, elevatorName } = event.detail;
        const newElevator = {
            id: elevatorId,
            label: elevatorName,
            className: 'tab active-tab',
            icon: 'utility:add'
        }
        this.elevators = this.elevators.map(elevator => ({ ...elevator, className: 'tab' }));
        this.elevators = [...this.elevators, newElevator];
        this.selectedTabId = elevatorId;
    }

    selectElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            className: elevator.id === elevatorId ? 'tab active-tab' : 'tab'
        }));
        this.selectedTabId = this.elevators.find(elevator => elevator.id === elevatorId)?.id;
    }

    deleteElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.filter(tab => tab.id !== elevatorId);

        if (this.selectedTabId === elevatorId && this.elevators.length > 0) {
            this.selectedTabId = this.elevators[0].id;
            this.elevators[0].className = 'tab active-tab';
        } else if (this.elevators.length === 0) {
            this.selectedTabId = null;
        }
    }

    handleUpload() {
        console.log('upload');
    }

    

    



    // Step/Card & Resizing actions
    handleTaskComplete(event) {
        const { taskId, taskName } = event.detail;
        this.selectedTaskName = taskName;
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
        const newWidth = Math.max(300, Math.min(800, this.startWidth + deltaX)); // Min 300px, max 800px
        
        this.rightSidebarWidth = newWidth;
        
        this.template.querySelector('.main-content').style.marginRight = `${newWidth}px`;
        this.template.querySelector('.right-sidebar').style.width = `${newWidth}px`;
    }

    stopResize() {
        this.isResizing = false;
    }

    closeRightSidebar() {
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
}