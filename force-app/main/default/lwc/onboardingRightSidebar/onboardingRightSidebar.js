import { LightningElement, api, track } from 'lwc';

export default class OnboardingRightSidebar extends LightningElement {
    @api selectedTask;
    @api sectionNames = [];


    handleChange(event) {
        const type = event.target.dataset.type;
        const name = event.target.dataset.name;
        let value;

        if (type === 'address') {
            value = {
                street: event.detail.street,
                city: event.detail.city,
                country: event.detail.country,
                postalCode: event.detail.postalCode
            };
        } else {
            value = event.target.value;
        }

        let data = {
            fieldName: name,
            fieldType: type,
            fieldValue: value,
            taskId: this.selectedTask.id
        }

        this.dispatchEvent(new CustomEvent('change', {
            detail: { data }
        }));
    }

    handleSave() {
        this.dispatchEvent(new CustomEvent('save'));
    }

    closeRightSidebar() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}