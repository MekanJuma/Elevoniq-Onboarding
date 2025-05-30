import { LightningElement, api } from 'lwc';

export default class ValidationModal extends LightningElement {
    @api errors;

    get hasErrors() {
        return this.errors && this.errors.length > 0;
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
    
    
}