import { LightningElement, track, api } from 'lwc';
import { 
    NO_ELEVATORS_FOUND
} from 'c/onboardingConstants';

export default class OnboardingReviewCard extends LightningElement {
    @api recordId;

    noElevatorsFound = NO_ELEVATORS_FOUND;

    @track selectedStatus = 'Submitted';
    @track isGenerateUrlModalOpen = false;
    @track isReviewModalOpen = false;
    @track selectedElevatorName = '';
    @track visibleElevators = [];
    @track currentPage = 0;
    @track searchTerm = '';
    
    // Dummy data
    elevators = [
        { id: 1, name: 'Elevator A-101', status: 'Submitted' },
        { id: 2, name: 'Elevator B-205', status: 'Approved' },
        { id: 3, name: 'Elevator C-304', status: 'Submitted' },
        { id: 4, name: 'Elevator D-412', status: 'Approved' },
        { id: 5, name: 'Elevator E-519', status: 'Submitted' },
        { id: 6, name: 'Elevator F-627', status: 'Submitted' },
        { id: 7, name: 'Elevator G-735', status: 'Approved' },
        { id: 8, name: 'Elevator H-843', status: 'Submitted' },
        { id: 9, name: 'Elevator I-951', status: 'Approved' },
        { id: 10, name: 'Elevator J-106', status: 'Submitted' },
        { id: 11, name: 'Elevator K-214', status: 'Submitted' },
        { id: 12, name: 'Elevator L-322', status: 'Approved' },
        { id: 13, name: 'Elevator M-430', status: 'Submitted' },
        { id: 14, name: 'Elevator N-538', status: 'Approved' },
        { id: 15, name: 'Elevator O-646', status: 'Submitted' },
        { id: 16, name: 'Elevator P-754', status: 'Submitted' },
        { id: 17, name: 'Elevator Q-862', status: 'Approved' },
        { id: 18, name: 'Elevator R-970', status: 'Submitted' },
        { id: 19, name: 'Elevator S-108', status: 'Approved' },
        { id: 20, name: 'Elevator T-216', status: 'Submitted' }
    ];


    get hasNoElevators() {
        return this.visibleElevators.length === 0;
    }

    get statusOptions() {
        return [
            { label: 'Submitted', value: 'Submitted' },
            { label: 'Approved', value: 'Approved' }
        ];
    }

    get filteredElevators() {
        let filtered = this.elevators.filter(elevator => elevator.status === this.selectedStatus);
        
        if (this.searchTerm) {
            filtered = filtered.filter(elevator => 
                elevator.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }

    get totalElevators() {
        return this.elevators.length;
    }

    get submittedCount() {
        return this.elevators.filter(elevator => elevator.status === 'Submitted').length;
    }

    get approvedCount() {
        return this.elevators.filter(elevator => elevator.status === 'Approved').length;
    }

    get currentStatusCount() {
        return this.filteredElevators.length;
    }

    get hasMoreElevators() {
        return this.visibleElevators.length < this.filteredElevators.length;
    }

    get showMoreDisabled() {
        return !this.hasMoreElevators;
    }

    connectedCallback() {
        this.updateVisibleElevators();
    }

    updateVisibleElevators() {
        const filtered = this.filteredElevators;
        const endIndex = Math.min((this.currentPage + 1) * 15, filtered.length);
        this.visibleElevators = filtered.slice(0, endIndex);
    }

    handleStatusChange(event) {
        this.selectedStatus = event.detail.value;
        this.currentPage = 0;
        this.updateVisibleElevators();
    }

    handleGenerateUrl() {
        this.isGenerateUrlModalOpen = true;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.currentPage = 0;
        this.updateVisibleElevators();
    }

    handleReview(event) {
        this.selectedElevatorName = event.target.dataset.elevatorName;
        this.isReviewModalOpen = true;
    }

    handleShowMore() {
        this.currentPage++;
        this.updateVisibleElevators();
    }

    closeGenerateUrlModal() {
        this.isGenerateUrlModalOpen = false;
    }

    closeReviewModal() {
        this.isReviewModalOpen = false;
    }

    handleModalBackdropClick(event) {
        if (event.target === event.currentTarget) {
            this.closeGenerateUrlModal();
            this.closeReviewModal();
        }
    }
}