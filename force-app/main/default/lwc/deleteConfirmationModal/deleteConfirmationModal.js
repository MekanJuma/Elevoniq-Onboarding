import { LightningElement } from 'lwc';

export default class DeleteConfirmationModal extends LightningElement {

    
    handleDelete() {
        this.dispatchEvent(new CustomEvent('delete'));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }


}