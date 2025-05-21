import { LightningElement, api } from 'lwc';

export default class CustomToast extends LightningElement {
    @api toast;

    get toastClass() {
        return `slds-notify slds-notify_toast slds-theme_${this.toast.variant}`;  
    }

    hideToast() {
        this.dispatchEvent(new CustomEvent('hide'));
    }

    

}