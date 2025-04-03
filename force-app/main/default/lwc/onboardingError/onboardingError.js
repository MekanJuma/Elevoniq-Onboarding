import { LightningElement, api, track } from 'lwc';

export default class OnboardingError extends LightningElement {
    @api title;
    @api message;
    @api details;
    @api type = 'error'; // error, warning, info
    @api showClose = false;
    @api showDetails = false;

    @track isDetailsExpanded = false;

    get errorContainerClass() {
        return `error-container ${this.type}`;
    }

    get iconName() {
        switch(this.type) {
            case 'warning':
                return 'utility:warning';
            case 'info':
                return 'utility:info';
            default:
                return 'utility:error';
        }
    }

    get variant() {
        switch(this.type) {
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'error';
        }
    }

    get detailsIcon() {
        return this.isDetailsExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    toggleDetails() {
        this.isDetailsExpanded = !this.isDetailsExpanded;
    }
} 