import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


import getOnboardingData from '@salesforce/apex/OnboardingController.getOnboardingData';
import searchContacts from '@salesforce/apex/OnboardingController.searchContacts';
import sendEmail from '@salesforce/apex/OnboardingController.sendEmail';
import approveNewElevator from '@salesforce/apex/OnboardingController.approveNewElevator';

import EmailSubject from '@salesforce/label/c.OnboardingSubject';
import OnboardingPageUrl from '@salesforce/label/c.Onboarding_Page';

import { NO_ELEVATORS_FOUND } from 'c/onboardingConstants';
import { generateUniqueId } from 'c/onboardingUtils';

import { EMAIL_OPTIONS, prepareObjectData } from './helper';

export default class OnboardingReviewCard extends LightningElement {
    @api recordId;
    @track contractName = '';
    @track showLoading = false;

    noElevatorsFound = NO_ELEVATORS_FOUND;

    @track elevators = [];
    @track properties = [];
    @track propertyUnits = [];
    @track accounts = [];
    @track contacts = [];
    @track orders = [];




    async connectedCallback() {
        this.refreshOnboardingData();
    }

    async refreshOnboardingData() {
        try {
            let onboarding = await getOnboardingData({ contractId: this.recordId, userId: null });
            console.log('onboarding', JSON.stringify(onboarding));
            this.elevators = onboarding?.elevators ?? [];
            this.properties = onboarding?.properties ?? [];
            this.propertyUnits = onboarding?.propertyUnits ?? [];
            this.accounts = onboarding?.accounts ?? [];
            this.contacts = onboarding?.contacts ?? [];
            this.orders = onboarding?.orders ?? [];

            this.contractName = onboarding?.contractName ?? '';

            this.updateVisibleElevators();
        } catch (error) {
            console.error('Error fetching elevators:', error);
            this.showToast('Error', error.message || error.body?.message || 'Failed to fetch elevators', 'error');
        }
    }



    
    // ! Card Header - Start
    @track elevatorsSearchTerm = '';
    @track selectedStatus = 'Submitted';
    get submittedButtonVariant() {
        return this.selectedStatus === 'Submitted' ? 'brand' : 'outline-brand';
    }

    get approvedButtonVariant() {
        return this.selectedStatus === 'Approved' ? 'brand' : 'outline-brand';
    }

    handleStatusChange(event) {
        this.selectedStatus = event.target.dataset.status;
        console.log('selectedStatus==', this.selectedStatus);

        this.currentPage = 0;
        this.updateVisibleElevators();
    }

    handleSearchElevators(event) {
        this.elevatorsSearchTerm = event.target.value;
        this.currentPage = 0;
        this.updateVisibleElevators();
    }

    get totalCount() {
        return this.elevators.length;
    }

    get submittedCount() {
        return this.elevators.filter(elevator => elevator.status === 'Submitted').length;
    }

    get approvedCount() {
        return this.elevators.filter(elevator => elevator.status === 'Approved').length;
    }
    // ! Card Header - End








    // ! Elevator List - Start
    get buttonLabel() {
        return this.selectedStatus === 'Submitted' ? 'Review' : 'View';
    }

    get filteredElevators() {
        let filtered = this.elevators.filter(elevator => elevator.status === this.selectedStatus);

        if (this.elevatorsSearchTerm) {
            filtered = filtered.filter(elevator =>
                elevator.name.toLowerCase().includes(this.elevatorsSearchTerm.toLowerCase())
            );
        }

        return filtered;
    }
    // ! Elevator List - End









    // ! Pagination - Start
    @track currentPage = 0;
    @track visibleElevators = [];
    get hasMoreElevators() {
        return this.visibleElevators.length < this.filteredElevators.length;
    }

    get hasNoElevators() {
        return this.visibleElevators.length === 0;
    }

    get showMoreDisabled() {
        return !this.hasMoreElevators;
    }

    handleShowMore() {
        this.currentPage++;
        this.updateVisibleElevators();
    }

    updateVisibleElevators() {
        const filtered = this.filteredElevators;
        const endIndex = Math.min((this.currentPage + 1) * 15, filtered.length);
        this.visibleElevators = filtered.slice(0, endIndex);
    }

    // ! Pagination - End











    // ! Share Modal - Start
    @track showShareModal = false;
    fromEmailOptions = EMAIL_OPTIONS;
    @track selectedFromEmail = 'Current';
    get emailSubject() {
        return `${EmailSubject} ${this.contractName}`;
    }

    openShareModal() {
        console.log('openShareModal');
        this.showShareModal = true;
    }

    closeShareModal() {
        console.log('closeShareModal');
        this.showShareModal = false;
    }

    handleFromEmailChange(event) {
        this.selectedFromEmail = event.detail.value;
    }

    get onboardingPageLink() {
        return `${OnboardingPageUrl}/?contractId=${this.recordId}`;
    }

    // ! Contact Search
    @track contactSearchTerm = '';
    @track contactSearchResults = [];
    @track showContactSearchResults = false;
    @track selectedContacts = [];

    get contactSearchResultsEmpty() {
        return this.contactSearchResults.length == 0;
    }

    get hasSelectedContacts() {
        return this.selectedContacts.length > 0;
    }

    handleContactSearchInputBlur() {
        setTimeout(() => {
            this.showContactSearchResults = false;
        }, 200);
    }

    handleContactSearchInputFocus() {
        if (this.contactSearchTerm.length > 1 && this.contactSearchResults.length > 0) {
            this.showContactSearchResults = true;
        }
    }

    searchContactdebounceTimeout;
    handleContactSearch(event) {
        const value = event.target.value;
        this.contactSearchTerm = value;

        clearTimeout(this.searchContactdebounceTimeout);

        if (value.length > 1) {
            this.searchContactdebounceTimeout = setTimeout(() => {
                searchContacts({ searchTerm: value })
                    .then(results => {
                        console.log('contactSearchResults', results);
                        this.contactSearchResults = results;
                        this.showContactSearchResults = true;
                    })
                    .catch((error) => {
                        console.error('Error searching contacts:', error);
                        this.showContactSearchResults = false;
                    })
                    .finally(() => {
                        // this.showSearchResults = false;
                    });
            }, 300); // debounce delay in ms
        } else {
            this.showContactSearchResults = false;
        }
    }

    handleContactSelect(event) {
        const contactId = event.currentTarget.dataset.contactId;
        const contact = this.contactSearchResults.find(c => c.id === contactId);
        console.log('contact', contact);

        // Check if contact is already selected
        const isAlreadySelected = this.selectedContacts.some(c => c.id === contactId);

        if (!isAlreadySelected && contact) {
            this.selectedContacts = [...this.selectedContacts, contact];
        }

        // Clear search
        this.contactSearchTerm = '';
        this.contactSearchResults = [];
        this.showContactSearchResults = false;
    }

    handleRemoveContact(event) {
        const contactId = event.currentTarget.dataset.contactId;
        this.selectedContacts = this.selectedContacts.filter(contact => contact.id !== contactId);
    }

    @track isSendingEmail = false;
    handleSendEmail() {
        this.isSendingEmail = true;
        sendEmail({
            contractId: this.recordId,
            fromCurrentUser: this.selectedFromEmail === 'Current',
            recipientIds: this.selectedContacts.map(c => c.id)
        })
            .then(result => {
                console.log('Email sent successfully', result);
                this.showToast('Success', 'Email sent successfully', 'success');
            })
            .catch(error => {
                console.error('Error sending email:', error);
                this.showToast('Error', 'Error sending email', 'error');
            })
            .finally(() => {
                this.isSendingEmail = false;
                this.closeShareModal();
            });

        
    }

    // ! Share Modal - End







    // ! Review Modal - Start
    @track isReviewModalOpen = false;
    @track isViewModalOpen = false;
    @track compareMode = false;
    @track isContactTab = false;
    @track selectedElevator = {};
    @track currentStep = {
        key: 'overview',
        label: 'Overview',
        isOverview: true,
        activeTab: 'account'
    };

    handleReview(event) {
        const { elevatorName, elevatorId } = event.target.dataset;
        this.selectedElevator = { name: elevatorName, id: elevatorId };
        if (this.selectedStatus === 'Approved') {
            this.isViewModalOpen = true;
        } else {
            this.isReviewModalOpen = true;
        }
        console.log('selectedElevator', JSON.stringify(this.selectedElevatorDetails));
    }

    closeReviewModal() {
        this.isReviewModalOpen = false;
        this.isViewModalOpen = false;

        // Reset the selected elevator, current step, and compare mode
        this.selectedElevator = {};
        this.currentStep = {
            key: 'overview',
            label: 'Overview',
            isOverview: true
        };
        this.compareMode = false;
    }

    handleCompareModeToggle(event) {
        this.compareMode = event.target.checked;
    }

    handleStepClick(event) {
        const { key, label } = event.detail;
        this.isContactTab = key === 'onSiteContacts';
        this.compareMode = false;

        this.currentStep = { 
            key, 
            label, 
            isOverview: key === 'overview', 
            isOnSiteContacts: key === 'onSiteContacts',
            activeTab: key === 'onSiteContacts' ? 'propertyManager' : 'account'
        };
    }

    get isContactAvailable() {
        return ['owner', 'am', 'pm', 'fm', 'hv', 'operator'].includes(this.currentStep.key);
    }

    get isAccountTab() {
        return ['owner', 'am', 'pm', 'fm', 'hv', 'operator', 'benefitReceiver', 'invoiceReceiver'].includes(this.currentStep.key);
    }

    get selectedElevatorDetails() {
        let elevator = this.elevators.find(elevator => elevator.id === this.selectedElevator.id) ?? {};
        let propertyUnit = this.propertyUnits.find(propertyUnit => propertyUnit.id === elevator.propertyUnitId) ?? {};
        let property = this.properties.find(property => property.id === propertyUnit.propertyId || property.id === elevator.propertyId) ?? {};
        
        const matchedOrders = this.orders.filter(order =>
            elevator.productAssignments.some(pa =>
                order.orderItems.some(oi => oi.productId === pa.productId)
            )
        );

        return {
            ...elevator,
            property: {
                details: property,
                propertyOwner: this.accounts.find(account => account.id === property.propertyOwnerId),
                propertyOwnerContact: this.contacts.find(contact => contact.id === property.propertyOwnerContactId),
                assetManager: this.accounts.find(account => account.id === property.assetManagerId),
                assetManagerContact: this.contacts.find(contact => contact.id === property.assetManagerContactId)
            },
            propertyUnit: {
                details: propertyUnit,
                pm: this.accounts.find(account => account.id === propertyUnit.pmId),
                pmContact: this.contacts.find(contact => contact.id === propertyUnit.pmContactId),
                fm: this.accounts.find(account => account.id === propertyUnit.fmId),
                fmContact: this.contacts.find(contact => contact.id === propertyUnit.fmContactId),
                hv: this.accounts.find(account => account.id === propertyUnit.hvId),
                hvContact: this.contacts.find(contact => contact.id === propertyUnit.hvContactId),
                operator: this.accounts.find(account => account.id === propertyUnit.operatorId),
                operatorContact: this.contacts.find(contact => contact.id === propertyUnit.operatorContactId)
            },
            onSiteContacts: {
                propertyManager: this.contacts.find(contact => contact.id === propertyUnit.propertyManagerId),
                houseKeeper: this.contacts.find(contact => contact.id === propertyUnit.houseKeeperId),
                attendant: this.contacts.find(contact => contact.id === propertyUnit.attendantId),
                firstAider: this.contacts.find(contact => contact.id === propertyUnit.firstAiderId)
            },
            order: {
                details: {
                    ids: matchedOrders.map(o => o.id).join(","),
                    comment: matchedOrders.length > 0 ? matchedOrders[0]?.comment : "",
                    customerOrderNumber:matchedOrders.length > 0 ? matchedOrders[0]?.customerOrderNumber : "",
                    products: elevator.productAssignments.map(pa => {
                        const matchedOrder = matchedOrders.find(order =>
                            order.orderItems.some(oi => oi.productId === pa.productId)
                        );
                        const matchedItem = matchedOrder?.orderItems.find(oi => oi.productId === pa.productId);
                        return {
                            orderItemId: matchedItem?.id || null,
                            productCode: matchedItem?.productCode || null,
                            productId: pa.productId
                        };
                    })
                },
                benefitReceiver: this.accounts.find(account => account.id === elevator.benefitReceiverId),
                invoiceReceiver: this.accounts.find(account => account.id === elevator.invoiceReceiverId)
            }
        }
    }

    handleTabChange(event) {
        const { value } = event.target;
        this.isContactTab = value === 'contact' || value === 'onSiteContacts';

        let ct = value;
        if (this.currentStep.key === 'owner') {
            ct = 'propertyOwner';
        } else if (this.currentStep.key === 'am') {
            ct = 'assetManager';
        } else if (this.currentStep.key === 'onSiteContacts') {
            ct = value;
        } else {
            ct = this.currentStep.key;
        }

        this.currentStep = { ...this.currentStep, contactTab: ct, activeTab: value };
    }

    get currentStepData() {
        let data = JSON.parse(JSON.stringify(this.selectedElevatorDetails));
        return prepareObjectData(data, this.currentStep, false, this.isContactTab);
    }

    get currentStepPrevData() {
        let data = JSON.parse(JSON.stringify(this.selectedElevatorDetails));
        return prepareObjectData(data, this.currentStep, true, this.isContactTab);
    }


    // ! Lookup Modal - Start
    handleRowChange(event) {
        const row = event.detail;
        if (this.currentStep.key === 'property') {
            const idx = this.properties.findIndex(
                p => p.id === this.selectedElevatorDetails.propertyId
            );
        
            const oldProperty = idx !== -1 ? this.properties[idx] : {};
            const { previousObject: _, ...oldPropertyWithoutPrevious } = oldProperty;
            const newProperty = {
                ...oldPropertyWithoutPrevious,
                id: row.Id,
                name: row.Name,
                businessUnit: row.Business_Unit__c,
                address: {
                    street: row.Street__c,
                    city: row.City__c,
                    postalCode: row.Zip__c
                },
                previousObject: Object.keys(oldProperty).length ? { ...oldPropertyWithoutPrevious } : null
            };
        
            // ✅ only add if not already in list
            if (!this.properties.some(p => p.id === row.Id)) {
                this.properties = [...this.properties, newProperty];
            }
        
            // ✅ update references
            this.elevators = this.elevators.map(e =>
                e.id === this.selectedElevatorDetails.id
                    ? { ...e, propertyId: row.Id }
                    : e
            );
        
            this.propertyUnits = this.propertyUnits.map(u =>
                u.id === this.selectedElevatorDetails.propertyUnitId
                    ? { ...u, propertyId: row.Id }
                    : u
            );
        }
        else if (this.currentStep.key === 'propertyUnit') {
            const idx = this.propertyUnits.findIndex(
                u => u.id === this.selectedElevatorDetails.propertyUnitId
            );
        
            const oldUnit = idx !== -1 ? this.propertyUnits[idx] : {};
            const { previousObject: _, ...oldUnitWithoutPrevious } = oldUnit;
            const newUnit = {
                ...oldUnitWithoutPrevious,
                id: row.Id,
                name: row.Name,
                propertyType: row.Property_Type__c,
                address: {
                    street: row.Street__c,
                    city: row.City__c,
                    postalCode: row.Zip__c
                },
                previousObject: Object.keys(oldUnit).length ? { ...oldUnitWithoutPrevious } : null,
                propertyId: row.Property__c
            };
        
            // ✅ only add if not already in list
            if (!this.propertyUnits.some(u => u.id === row.Id)) {
                this.propertyUnits = [...this.propertyUnits, newUnit];
            }
        
            // ✅ update references
            this.elevators = this.elevators.map(e =>
                e.id === this.selectedElevatorDetails.id
                    ? { ...e, propertyUnitId: row.Id }
                    : e
            );
        }
        else if (this.isContactTab || this.currentStep.isOnSiteContacts) {
            // ! Find the contact index in the contacts array
            let idx;
            if (this.currentStep.key === 'owner') {
                idx = this.contacts.findIndex( a => a.id === this.selectedElevatorDetails.property?.propertyOwnerContact?.id ); 
            } else if (this.currentStep.key === 'am') {
                idx = this.contacts.findIndex( a => a.id === this.selectedElevatorDetails.property?.assetManagerContact?.id ); 
            } else if (this.currentStep.key === 'onSiteContacts') {
                idx = this.contacts.findIndex( a => a.id === this.selectedElevatorDetails.onSiteContacts[this.currentStep.contactTab]?.id ); 
            } else {
                idx = this.contacts.findIndex( a => a.id === this.selectedElevatorDetails.propertyUnit[`${this.currentStep.key}Contact`]?.id ); 
            }
            
            // ! Prepare the new contact
            const oldContact = idx !== -1 ? this.contacts[idx] : {}; 
            console.log('oldContact', JSON.stringify(oldContact));
            const { previousObject: _, ...oldContactWithoutPrevious } = oldContact; 

            const newContact = { 
                ...oldContactWithoutPrevious, 
                id: row.Id, 
                firstName: row.FirstName, 
                lastName: row.LastName, 
                salutation: row.Salutation,
                title: row.Title,
                email: row.Email,
                phone: row.Phone,
                previousObject: Object.keys(oldContact).length ? { ...oldContactWithoutPrevious } : null 
            };
        
            // ✅ only add if not already in list
            if (!this.contacts.some(c => c.id === row.Id)) {
                this.contacts = [...this.contacts, newContact];
            }

            // ✅ update references
            if (this.currentStep.key === 'owner') {
                this.properties = this.properties.map(p =>
                    p.id === this.selectedElevatorDetails.propertyId
                        ? { ...p, propertyOwnerContactId: row.Id }
                        : p
                );
            } else if (this.currentStep.key === 'am') {
                this.properties = this.properties.map(p =>
                    p.id === this.selectedElevatorDetails.propertyId
                        ? { ...p, assetManagerContactId: row.Id }
                        : p
                );
            } else if (this.currentStep.key === 'onSiteContacts') {
                this.propertyUnits = this.propertyUnits.map(pu =>
                    pu.id === this.selectedElevatorDetails.propertyUnitId
                        ? { ...pu, [`${this.currentStep.contactTab}Id`]: row.Id }
                        : pu
                );
            } else {
                this.propertyUnits = this.propertyUnits.map(pu =>
                    pu.id === this.selectedElevatorDetails.propertyUnitId
                        ? { ...pu, [`${this.currentStep.key}ContactId`]: row.Id }
                        : pu
                );
            }
        }
        else if (this.isAccountTab) {
            // ! Find the account index in the accounts array
            let idx;
            if (this.currentStep.key === 'owner') {
                idx = this.accounts.findIndex( a => a.id === this.selectedElevatorDetails.property?.propertyOwner?.id ); 
            } else if (this.currentStep.key === 'am') {
                idx = this.accounts.findIndex( a => a.id === this.selectedElevatorDetails.property?.assetManager?.id ); 
            } else if (this.currentStep.key === 'benefitReceiver' || this.currentStep.key === 'invoiceReceiver') {
                idx = this.accounts.findIndex( a => a.id === this.selectedElevatorDetails[`${this.currentStep.key}Id`] ); 
            } else {
                idx = this.accounts.findIndex( a => a.id === this.selectedElevatorDetails.propertyUnit[this.currentStep.key]?.id ); 
            }
            
            // ! Prepare the new account
            const oldAccount = idx !== -1 ? this.accounts[idx] : {}; 
            const { previousObject: _, ...oldAccountWithoutPrevious } = oldAccount; 

            const newAccount = { 
                ...oldAccountWithoutPrevious, 
                id: row.Id, 
                name: row.Name, 
                email: row.Email__c, 
                phone: row.Phone, 
                address: { 
                    street: row.BillingStreet, 
                    city: row.BillingCity, 
                    postalCode: row.BillingPostalCode 
                }, 
                previousObject: Object.keys(oldAccount).length ? { ...oldAccountWithoutPrevious } : null 
            };
            
            // ✅ only add if not already in list
            if (!this.accounts.some(a => a.id === row.Id)) {
                this.accounts = [...this.accounts, newAccount];
            }

            // ✅ update references
            if (this.currentStep.key === 'owner') {
                this.properties = this.properties.map(p =>
                    p.id === this.selectedElevatorDetails.propertyId
                        ? { ...p, propertyOwnerId: row.Id }
                        : p
                );
            } else if (this.currentStep.key === 'am') {
                this.properties = this.properties.map(p =>
                    p.id === this.selectedElevatorDetails.propertyId
                        ? { ...p, assetManagerId: row.Id }
                        : p
                );
            } else if (this.currentStep.key === 'benefitReceiver' || this.currentStep.key === 'invoiceReceiver') {
                this.elevators = this.elevators.map(e =>
                    e.id === this.selectedElevatorDetails.id
                        ? { ...e, [`${this.currentStep.key}Id`]: row.Id }
                        : e
                );
            } else {
                this.propertyUnits = this.propertyUnits.map(u =>
                    u.id === this.selectedElevatorDetails.propertyUnitId
                        ? { ...u, [`${this.currentStep.key}Id`]: row.Id }
                        : u
                );
            }
            
        }
    }
    // ! Lookup Modal - End

    handleFieldChange(event) {
        const { fieldName, fieldValue, rowId } = event.detail;
        console.log('field change', {
            fieldName,
            fieldValue,
            rowId,
            currentStep: JSON.parse(JSON.stringify(this.currentStep)),
            isContactTab: this.isContactTab,
            isAccountTab: this.isAccountTab
        });
        if (this.currentStep.key === 'property') {
            if (!rowId) {
                let newProperty = {
                    id: `${this.currentStep.key}_${generateUniqueId()}`,
                    name: '',
                    businessUnit: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: ''
                    }
                }
                if (fieldName.startsWith('address.')) {
                    const [, addrField] = fieldName.split('.');
                    newProperty.address = { ...newProperty.address, [addrField]: fieldValue };
                } else {
                    newProperty[fieldName] = fieldValue;
                }
                this.properties = [...this.properties, newProperty];

                this.elevators = this.elevators.map(e =>
                    e.id === this.selectedElevatorDetails.id
                        ? { ...e, propertyId: newProperty.id }
                        : e
                );
            
                this.propertyUnits = this.propertyUnits.map(u =>
                    u.id === this.selectedElevatorDetails.propertyUnitId
                        ? { ...u, propertyId: newProperty.id }
                        : u
                );
            }
            else {
                this.properties = this.properties.map(p => {
                    if (p.id === rowId) {
                        if (fieldName.startsWith('address.')) {
                            const [, addrField] = fieldName.split('.');
                            return {
                                ...p,
                                address: { ...p.address, [addrField]: fieldValue }
                            };
                        } else {
                            return { ...p, [fieldName]: fieldValue };
                        }
                    }
                    return p;
                });
            }
        }
        else if (this.currentStep.key === 'propertyUnit') {
            if (!rowId) {
                let newPropertyUnit = {
                    id: `${this.currentStep.key}_${generateUniqueId()}`,
                    name: '',
                    propertyType: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: ''
                    }
                }
                if (fieldName.startsWith('address.')) {
                    const [, addrField] = fieldName.split('.');
                    newPropertyUnit.address = { ...newPropertyUnit.address, [addrField]: fieldValue };
                } else {
                    newPropertyUnit[fieldName] = fieldValue;
                }
                this.propertyUnits = [...this.propertyUnits, newPropertyUnit];

                this.elevators = this.elevators.map(e =>
                    e.id === this.selectedElevatorDetails.id
                        ? { ...e, propertyUnitId: newPropertyUnit.id }
                        : e
                );
            }
            else {
                this.propertyUnits = this.propertyUnits.map(pu => {
                    if (pu.id === rowId) {
                        if (fieldName.startsWith('address.')) {
                            const [, addrField] = fieldName.split('.');
                            return { ...pu, address: { ...pu.address, [addrField]: fieldValue } };
                        } else {
                            return { ...pu, [fieldName]: fieldValue };
                        }
                    }
                    return pu;
                });
            }
        }
        else if (this.isContactTab || this.currentStep.isOnSiteContacts) {
            if (!rowId) {
                let newContact = {
                    id: `${this.currentStep.key}_${generateUniqueId()}`,
                    firstName: '',
                    lastName: '',
                    salutation: '',
                    title: '',
                    email: '',
                    phone: ''
                }
                if (fieldName.startsWith('address.')) {
                    const [, addrField] = fieldName.split('.');
                    newContact.address = { ...newContact.address, [addrField]: fieldValue };
                } else {
                    newContact[fieldName] = fieldValue;
                }
                this.contacts = [...this.contacts, newContact];
                if (['owner', 'am'].includes(this.currentStep.key)) {
                    this.properties = this.properties.map(p =>
                        p.id === this.selectedElevatorDetails.propertyId
                            ? { ...p, [`${this.currentStep.contactTab}ContactId`]: newContact.id }
                            : p
                    );
                }
                else {
                    this.propertyUnits = this.propertyUnits.map(pu =>
                        pu.id === this.selectedElevatorDetails.propertyUnitId
                            ? { ...pu, [`${this.currentStep.contactTab}ContactId`]: newContact.id }
                            : pu
                    );
                }
            }
            else {
                this.contacts = this.contacts.map(c => {
                    if (c.id === rowId) {
                        if (fieldName.startsWith('address.')) {
                            const [, addrField] = fieldName.split('.');
                            return { ...c, address: { ...c.address, [addrField]: fieldValue } };
                        } else {
                            return { ...c, [fieldName]: fieldValue };
                        }
                    }
                    return c;
                });
            }
        }
        else if (this.isAccountTab) {
            if (!rowId) {
                let newAccount = {
                    id: `${this.currentStep.key}_${generateUniqueId()}`,
                    name: '',
                    email: '',
                    phone: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: ''
                    }
                }
                if (fieldName.startsWith('address.')) {
                    const [, addrField] = fieldName.split('.');
                    newAccount.address = { ...newAccount.address, [addrField]: fieldValue };
                } else {
                    newAccount[fieldName] = fieldValue;
                }
                this.accounts = [...this.accounts, newAccount];

                if (['owner', 'am'].includes(this.currentStep.key)) {
                    let key = this.currentStep.key === 'owner' ? 'propertyOwnerId' : 'assetManagerId';
                    this.properties = this.properties.map(p =>
                        p.id === this.selectedElevatorDetails.propertyId
                            ? { ...p, [key]: newAccount.id }
                            : p
                    );
                } else if (['benefitReceiver', 'invoiceReceiver'].includes(this.currentStep.key)) {
                    this.elevators = this.elevators.map(e =>
                        e.id === this.selectedElevatorDetails.id
                            ? { ...e, [`${this.currentStep.key}Id`]: newAccount.id }
                            : e
                    );
                } else {
                    this.propertyUnits = this.propertyUnits.map(u =>
                        u.id === this.selectedElevatorDetails.propertyUnitId
                            ? { ...u, [`${this.currentStep.key}Id`]: newAccount.id }
                            : u
                    );
                }
            }
            else {
                this.accounts = this.accounts.map(a => {
                    if (a.id === rowId) {
                        if (fieldName.startsWith('address.')) {
                            const [, addrField] = fieldName.split('.');
                            return { ...a, address: { ...a.address, [addrField]: fieldValue } };
                        } else {
                            return { ...a, [fieldName]: fieldValue };
                        }
                    }
                    return a;
                });
            }
        }
    }
    // ! Review Modal - End


    // ! Approval Modal - Start
    @track showConfirmationModal = false;
    @track showApprovalLoading = false;

    closeApprovalModal() {
        this.showConfirmationModal = false;
    }

    getConfirmation() {
        console.log('selectedElevatorDetails', JSON.stringify(this.selectedElevatorDetails));
        this.showConfirmationModal = true;
    }

    async handleApprove() {
        this.showApprovalLoading = true;
        try {
            await approveNewElevator({ contractId: this.recordId, data: JSON.stringify(this.selectedElevatorDetails) });
            this.showToast('Success', 'Elevator approved successfully', 'success');
            this.closeReviewModal();
            this.refreshOnboardingData();
        } catch (error) {
            console.error('Error approving elevator:', error);
            this.showToast('Error', error.body.message || 'Something went wrong', 'error');
        } finally {
            this.showApprovalLoading = false;
            this.closeApprovalModal();
        }
    }


    handleModalBackdropClick() {
        this.closeShareModal();
        this.closeReviewModal();
    }

    showToast(title, message, variant, mode = 'dismissable') {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: mode
        });
        this.dispatchEvent(event);
    }
}