import { LightningElement, api, track } from 'lwc';

export default class OnboardingRightSidebar extends LightningElement {
    @api title;


    closeRightSidebar() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}