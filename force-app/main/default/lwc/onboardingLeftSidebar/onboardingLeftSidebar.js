import { LightningElement, api, track } from 'lwc';

import {
    generateUniqueId
} from 'c/onboardingUtils';

export default class OnboardingLeftSidebar extends LightningElement {
    @api buttonDisabled = false;
    @api elevators = [];
    @track searchQuery = '';


    get filteredElevators() {
        if (!this.searchQuery) {
            return this.elevators;
        }
        return this.elevators.filter(elevator => elevator.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
    }

    addNewTab() {
        const newElevator = new CustomEvent('add', {
            detail: {
                elevatorId: 'newElevator_' + generateUniqueId(),
                elevatorName: 'New Elevator ' + (this.elevators.length + 1)
            }
        });
        this.dispatchEvent(newElevator);
    }

    selectTab(event) {
        this.dispatchEvent(new CustomEvent('select', {
            detail: {
                elevatorId: event.currentTarget.dataset.id
            }
        }));
    }

    handleSearch(event) {
        this.searchQuery = event.target.value.toLowerCase();
    }

    deleteTab(event) {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent('delete', {
            detail: {
                elevatorId: event.currentTarget.dataset.id
            }
        }));
    }

    handleUpload() {
        this.dispatchEvent(new CustomEvent('upload'));
    }

    handleTabLabelChange(event) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                elevatorId: event.target.dataset.id,
                value: event.target.value
            }
        }));
    }

    editTab(event) {
        this.dispatchEvent(new CustomEvent('edit', {
            detail: {
                elevatorId: event.currentTarget.dataset.id,
                flag: event.currentTarget.dataset.flag === 'true'
            }
        }));
    }
}