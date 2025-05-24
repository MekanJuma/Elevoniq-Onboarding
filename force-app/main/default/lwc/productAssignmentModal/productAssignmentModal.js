import { LightningElement, api } from 'lwc';

export default class ProductAssignmentModal extends LightningElement {
    @api items = [];

    get assignDisabled() {
        return !this.items.some(item => item.isSelected);
    }


    handleCardClick(event) {
        this.dispatchEvent(new CustomEvent('select', { detail: { id: event.currentTarget.dataset.id } }));
    }


    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleAssign() {
        this.dispatchEvent(new CustomEvent('assign'));
    }

}