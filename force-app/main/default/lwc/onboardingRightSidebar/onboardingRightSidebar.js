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


    @api
    setInputValues(data) {
        console.log('incoming data', JSON.stringify(data));
        Object.entries(data).forEach(([fieldPath, value]) => {
            const input = this.template.querySelector(`[data-name="${fieldPath}"]`);
            if (!input) return;

            const type = input.dataset.type;
            if (type === 'address' && typeof value === 'object') {
                input.street = value.street || '';
                input.city = value.city || '';
                input.country = value.country || '';
                input.postalCode = value.postalCode || '';
            } else {
                input.value = value;
            }
        });
    }

    @api
    clearAllInputs() {
        this.template.querySelectorAll('lightning-input').forEach(input => {
            input.value = '';
            const fieldName = input.dataset.name;

            input.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: { data: { fieldName, fieldValue: '' } }
            }));
        });

        this.template.querySelectorAll('lightning-input-address').forEach(addressInput => {
            addressInput.street = '';
            addressInput.city = '';
            addressInput.country = '';
            addressInput.postalCode = '';

            const fieldName = addressInput.dataset.name;

            addressInput.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: { 
                    data: {
                        fieldName, 
                        fieldValue: {
                            street: '',
                            city: '',
                            country: '',
                            postalCode: ''
                        }
                    }
                }
            }));
        });
    }


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
            fieldValue: value
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

    handleLookup(event) {
        const objectType = event.currentTarget.dataset.object;
        this.dispatchEvent(new CustomEvent('lookup', {
            detail: { object: objectType }
        }));
    }

    clearAll() {
        this.dispatchEvent(new CustomEvent('clear'));
    }
}