import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import fetchLookupRecords from '@salesforce/apex/OnboardingController.fetchLookupRecords';

export default class OnboardingObjectContent extends LightningElement {
    @api isPrevious = false;
    @api objectData = {};

    @track showLookupModal = false;
    @track lookupSearchKey = '';
    @track showLookupLoading = false;
    @track lookupColumns = [];
    @track lookupRecords = [];

    @track objectName = '';
    @track lookupFields = '';

    hideCheckbox = false;
    maxRowSelection = 1;

    @track selectedRow = {};

    get headerTitle() {
        return this.isPrevious ? 'Previous Values' : 'New Values';
    }

    get showLookupBtn() {
        return !this.isOrder && !this.isPrevious;
    }

    get isOrder() {
        return this.objectData.title.includes('Order');
    }

    get selectRowDisabled() {
        return !this.selectedRow.Id;
    }

    handleLookup(event) {
        this.objectName = event.currentTarget.dataset.objectName;
        this.lookupFields = event.currentTarget.dataset.lookupFields;
        console.log('objectName', this.objectName);
        console.log('lookupFields', this.lookupFields);
        this.showLookupModal = true;
    }

    closeLookupModal() {
        this.showLookupModal = false;
        this.lookupRecords = [];
        this.lookupColumns = [];
        this.lookupSearchKey = '';
        this.objectName = '';
        this.lookupFields = '';
    }

    timeout;
    handleLookupSearchChange(event) {
        const searchKey = event.target.value;
        this.lookupSearchKey = searchKey;

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.showLookupLoading = true;
            fetchLookupRecords({ 
                objectApiName: this.objectName, 
                searchKey: this.lookupSearchKey, 
                fields: this.lookupFields 
            })
            .then(result => {
                console.log('result', result);
                this.lookupColumns = this.prepareColumns(this.objectName, this.lookupFields);
                this.lookupRecords = this.prepareRows(this.objectName, this.lookupFields, result);
            })
            .catch(error => {
                console.log('error', error);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }));
            })
            .finally(() => {
                this.showLookupLoading = false;
            });
        }, 600); // debounce delay in ms
    }

    prepareColumns(objectName, lookupFields) {
        const fields = lookupFields.split(',').map(f => f.trim());
        
        const columns = fields
            .filter(f => f !== 'Id') // exclude Id from visible columns
            .filter(f => f !== 'Salutation') // exclude Salutation from visible columns
            .filter(f => f !== 'FirstName') // exclude FirstName from visible columns
            .filter(f => f !== 'LastName') // exclude LastName from visible columns
            .filter(f => f !== 'Property__c') // exclude Property__c from visible columns
            .map(f => {
                if (f === 'Name') {
                    return {
                        label: 'Name',
                        fieldName: 'recordUrl',
                        type: 'url',
                        typeAttributes: {
                            label: { fieldName: 'Name' },
                            target: '_blank'
                        }
                    };
                }
                return {
                    label: f,
                    fieldName: f,
                    type: 'text'
                };
            });
    
        // Add Name column for Contact object if not already present
        if (objectName === 'Contact' && !fields.includes('Name')) {
            columns.unshift({
                label: 'Name',
                fieldName: 'recordUrl',
                type: 'url',
                typeAttributes: {
                    label: { fieldName: 'Name' },
                    target: '_blank'
                }
            });
        }
    
        return columns;
    }
    
    prepareRows(objectName, lookupFields, result) {
        const fields = lookupFields.split(',').map(f => f.trim());
        
        return result.map(r => {
            let row = {};
            fields.forEach(f => {
                row[f] = r[f];
            });
            
            // use Id to build url for record
            row.recordUrl = '/' + r.Id;
            
            // Handle special cases based on object type
            if (objectName === 'Contact') {
                // Create concatenated Name field for Contact
                const salutation = r.Salutation || '';
                const firstName = r.FirstName || '';
                const lastName = r.LastName || '';
                row.Name = `${salutation} ${firstName} ${lastName}`.trim();
            }
            
            return row;
        });
    }

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        console.log('selectedRows', JSON.stringify(selectedRows));

        this.selectedRow = selectedRows[0];
    }

    handleSelect() {
        this.dispatchEvent(new CustomEvent('rowchange', { detail: this.selectedRow }));
        this.closeLookupModal();
    }

    handleChange(event) {
        const fieldName = event.target.dataset.fieldName;
        const fieldValue = event.target.value ?? event.detail.value;
        const rowId = event.target.dataset.id;

        this.dispatchEvent(new CustomEvent('fieldchange', { detail: { fieldName, fieldValue, rowId } }));
    }
}