import { LightningElement, api } from 'lwc';
import { 
    SECTIONS_MAP, 
    PROPERTY_TYPE_OPTIONS,
    MODE_OF_PAYMENT_OPTIONS,
    PAYMENT_INTERVAL_OPTIONS
} from 'c/onboardingConstants';

export default class OnboardingRightSidebar extends LightningElement {
    @api selectedTask;

    propertyTypeOptions = PROPERTY_TYPE_OPTIONS;
    modeOfPaymentOptions = MODE_OF_PAYMENT_OPTIONS;
    paymentIntervalOptions = PAYMENT_INTERVAL_OPTIONS;

    get section() {
        let section = JSON.parse(JSON.stringify(SECTIONS_MAP));
        return section[this.selectedTask.id];
    }




    get street() {
        return this.selectedTask.data?.address?.street;
    }

    get city() {
        return this.selectedTask.data?.address?.city;
    }

    get country() {
        return this.selectedTask.data?.address?.country;
    }

    get postalCode() {
        return this.selectedTask.data?.address?.postalCode;
    }


    get contact() {
        return this.selectedTask.data?.contact || {};
    }


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