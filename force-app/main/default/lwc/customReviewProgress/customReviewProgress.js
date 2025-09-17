import { LightningElement, track } from 'lwc';

export default class CustomReviewProgress extends LightningElement {
    @track steps = [
        { label: 'Overview', key: 'overview', isActive: true, icon: 'utility:summary' },
        { label: 'Property', key: 'property', isActive: false, icon: 'utility:home' },
        { label: 'Owner', key: 'owner', isActive: false, icon: 'utility:company' },
        { label: 'AM', key: 'am', isActive: false, icon: 'utility:company' },
        { label: 'Property Unit', key: 'propertyUnit', isActive: false, icon: 'utility:puzzle' },
        { label: 'PM', key: 'pm', isActive: false, icon: 'utility:company' },
        { label: 'FM', key: 'fm', isActive: false, icon: 'utility:company' },
        { label: 'HV', key: 'hv', isActive: false, icon: 'utility:company' },
        { label: 'Operator', key: 'operator', isActive: false, icon: 'utility:company' },
        { label: 'On Site Contacts', key: 'onSiteContacts', isActive: false, icon: 'utility:company' },
        { label: 'Order', key: 'order', isActive: false, icon: 'utility:money' },
        { label: 'Benefit Receiver', key: 'benefitReceiver', isActive: false, icon: 'utility:company' },
        { label: 'Invoice Receiver', key: 'invoiceReceiver', isActive: false, icon: 'utility:company' }
    ];

    handleClick(event) {
        const selectedStep = event.currentTarget.dataset.step;
        const selectedLabel = event.currentTarget.dataset.label;
        
        this.steps.forEach(step => {
            step.isActive = step.key === selectedStep;
        });

        this.dispatchEvent(new CustomEvent('stepclick', {
            detail: {
                key: selectedStep,
                label: selectedLabel
            },
            bubbles: true,
            composed: true
        }));
    }
}