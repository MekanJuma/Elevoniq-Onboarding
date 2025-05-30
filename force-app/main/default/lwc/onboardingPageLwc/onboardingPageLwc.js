import { LightningElement, track } from 'lwc';

import { 
    getOnboardingData
} from 'c/onboardingApiService';

import { 
    ELEVATOR_STATUS,
    NO_ELEVATORS_FOUND,
    ERROR,

    ELEVATOR,
    PROPERTY,
    PROPERTY_UNIT,
    ACCOUNT,
    CONTACT,

    STEPS,
    REQUIRED_FIELDS,

    LOOKUP_OBJECTS
} from 'c/onboardingConstants';

import { 
    getData,
    extractPrefixedFields,
    updateOrCreateAndApply,
    getList,
    formatListItems
} from 'c/onboardingUtils';


export default class OnboardingPageLwc extends LightningElement {
    noElevatorsFound = NO_ELEVATORS_FOUND;

    parameters = {};

    @track rightSidebarWidth = 400;
    @track isRightSidebarOpen = false;

    @track selectedTask = {};

    isResizing = false;
    startX = 0;
    startWidth = 0;

    @track isLoading = false;
    @track error;
    
    @track elevators = [];
    @track properties = [];
    @track propertyUnits = [];
    @track accounts = [];
    @track contacts = [];
    @track orders = [];

    // Track unsaved changes
    @track draftChanges = {};

    @track toast;
    @track showToast = false;

    @track showExistingRecordModal = false;
    @track existingRecords;

    @track lookupObject = {};
    @track isLookup = false;

    @track showProductAssignmentModal = false;

    @track showDeleteConfirmationModal = false;
    @track deleteElevatorId;

    @track showUploadCsvModal = false;

    @track showValidationModal = false;
    @track validationErrors = [];


    get filteredElevators() {
        return this.elevators.filter(elevator => elevator.status !== 'Deleted');
    }

    // ✅ done
    get selectedElevator() {
        return this.elevators.find(elevator => elevator.isActive);
    }

    // ✅ done
    get hasNoElevators() {
        return this.elevators.length === 0;
    }


    // ✅ done
    get steps() {
        const elevator = this.selectedElevatorDetails;
        const clone = JSON.parse(JSON.stringify(STEPS));
    
        Object.values(clone).forEach(step => {
            step.tasks.forEach(task => {
                if (task.id == 'order.details') {
                    let isChanged = this.orders.some(order => order.isChanged);
                    task.completed = true;
                    task.className = isChanged ? 'task-item changed' : 'task-item';
                } else if (task.id == 'order.productAssignment') {
                    let productAssigned = elevator.productAssignments != null && elevator.productAssignments.length > 0;
                    let isChanged = elevator.productAssignments?.some(a => a.isChanged);
                    task.completed = productAssigned;
                    task.className = isChanged ? 'task-item changed' : 'task-item';
                    task.disabled = false;
                    
                    let error = this.selectedError?.orderErrors?.find(e => e.field == 'productAssignments');
                    task.isError = error != null;
                    task.errorMessage = error?.message;
                } else if (task.id == 'order.benefitReceiver') {
                    let br = this.accounts.find(account => account.id === elevator.benefitReceiverId);
                    task.completed = br != null;
                    task.className = br?.isChanged ? 'task-item changed' : 'task-item';
                    task.disabled = false;  
                    
                    let error = this.selectedError?.orderErrors?.find(e => e.field == 'benefitReceiverId');
                    task.isError = error != null;
                    task.errorMessage = error?.message;
                } else if (task.id == 'order.invoiceReceiver') {
                    let ir = this.accounts.find(account => account.id === elevator.invoiceReceiverId);
                    task.completed = ir != null;
                    task.className = ir?.isChanged ? 'task-item changed' : 'task-item';
                    task.disabled = false;

                    let error = this.selectedError?.orderErrors?.find(e => e.field == 'invoiceReceiverId');
                    task.isError = error != null;
                    task.errorMessage = error?.message;
                } else {
                    const data = getData(task.id, elevator);
                    task.completed = data?.completed === true;
                    task.className = data?.isChanged ? 'task-item changed' : 'task-item';

                    if (task.id == 'property.details') {
                        let error = this.selectedError?.elevatorErrors?.find(e => e.field == 'propertyId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    } else if (task.id == 'propertyUnit.details') {
                        let error = this.selectedError?.elevatorErrors?.find(e => e.field == 'propertyUnitId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    } else if (task.id == 'property.propertyOwner') {
                        let error = this.selectedError?.propertyErrors?.find(e => e.field == 'propertyOwnerId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    } else if (task.id == 'onSiteContacts.propertyManager') {
                        let error = this.selectedError?.propertyUnitErrors?.find(e => e.field == 'propertyManagerId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    } else if (task.id == 'onSiteContacts.houseKeeper') {
                        let error = this.selectedError?.propertyUnitErrors?.find(e => e.field == 'houseKeeperId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    } else if (task.id == 'propertyUnit.operator') {
                        let error = this.selectedError?.propertyUnitErrors?.find(e => e.field == 'operatorId');
                        task.isError = error != null;
                        task.errorMessage = error?.message;
                    }


                    // ! TASK DEPENDENCIES
                    const property = this.properties.find(p => p.id === elevator.propertyId);
                    const propertyUnit = this.propertyUnits.find(p => p.id === elevator.propertyUnitId);
                    
                    const taskDisabledConditions = {
                        'property.details': false,
                        'property.propertyOwner': !property?.id,
                        'property.assetManager': !property?.id,
                        'propertyUnit.details': !property?.id,
                        'propertyUnit.pm': !propertyUnit?.id,
                        'propertyUnit.fm': !propertyUnit?.id,
                        'propertyUnit.hv': !propertyUnit?.id,
                        'propertyUnit.operator': !propertyUnit?.id,
                        'onSiteContacts.propertyManager': !propertyUnit?.id,
                        'onSiteContacts.houseKeeper': !propertyUnit?.id,
                        'onSiteContacts.attendant': !propertyUnit?.id,
                        'onSiteContacts.firstAider': !propertyUnit?.id
                    };

                    task.disabled = taskDisabledConditions[task.id] ?? false;
                }
            });
        });
    
        return clone;
    }

    // ✅ done
    get selectedElevatorDetails() {
        let elevator = this.selectedElevator ?? {};
        let propertyUnit = this.propertyUnits.find(propertyUnit => propertyUnit.id === elevator.propertyUnitId) ?? {};
        let property = this.properties.find(property => property.id === propertyUnit.propertyId || property.id === elevator.propertyId) ?? {};
        
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
                benefitReceiver: this.accounts.find(account => account.id === elevator.benefitReceiverId),
                invoiceReceiver: this.accounts.find(account => account.id === elevator.invoiceReceiverId)
            }
        }
    }

    // ✅ done
    get buttonDisabled() {
        return this.isLoading || this.error != null;
    }

    get listMap() {
        return {
            'property.details': this.properties,
            'property.propertyOwner': this.accounts,
            'property.assetManager': this.accounts,

            'propertyUnit.details': this.propertyUnits,
            'propertyUnit.pm': this.accounts,
            'propertyUnit.fm': this.accounts,
            'propertyUnit.hv': this.accounts,
            'propertyUnit.operator': this.accounts,

            'onSiteContacts.propertyManager': this.contacts,
            'onSiteContacts.houseKeeper': this.contacts,
            'onSiteContacts.attendant': this.contacts,
            'onSiteContacts.firstAider': this.contacts,

            'order.details': [],
            'order.benefitReceiver': this.accounts,
            'order.invoiceReceiver': this.accounts,
        }
    }

    get selectedError() {
        return this.validationErrors.find(error => error.id === this.selectedElevator?.id);
    }

    // ✅ done
    async connectedCallback() {
        this.parameters = this.getQueryParameters();
        try {
            this.isLoading = true;
            let onboarding = await getOnboardingData({
                userId: this.parameters.userId,
                contractId: this.parameters.contractId
            });

            this.elevators = onboarding.data.elevators.map((elevator, index) => ({
                ...elevator,
                className: 'tab' + (index === 0 ? ' active-tab' : ''),
                icon: elevator.status === 'Submitted' ? 'utility:clock' : 'utility:success',
                tooltip: elevator.status === 'Submitted' ? ELEVATOR_STATUS.PENDING : ELEVATOR_STATUS.APPROVED,
                isActive: index === 0
            }));
            this.properties = onboarding.data.properties;
            this.propertyUnits = onboarding.data.propertyUnits;
            this.accounts = onboarding.data.accounts;
            this.contacts = onboarding.data.contacts;
            this.orders = onboarding.data.orders;
        } catch (error) {
            console.error('Error fetching elevators:', error);
            this.error = {
                MESSAGE: error?.body?.message || error?.message || ERROR.MESSAGE,
                TITLE: ERROR.TITLE,
                ILLUSTRATOR: ERROR.ILLUSTRATOR
            };
        } finally {
            this.isLoading = false;
        }
        
        this.applyBodyStyles();
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    // ✅ done
    disconnectedCallback() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    // ✅ done
    applyBodyStyles() {
        document.body.style.margin = '0';
        document.body.style.backgroundColor = '#f4f6f9';
        document.body.style.overflow = 'hidden';
    }




    // ! Left Sidebar actions
    // ✅ done
    addNewElevator(event) {
        const { elevatorId, elevatorName } = event.detail;
        console.log('elevatorId', elevatorId);
        const newElevator = {
            ...JSON.parse(JSON.stringify(ELEVATOR)),
            id: elevatorId,
            name: elevatorName
        };

        const failedElevatorIds = new Set(this.validationErrors.map(err => err.id));
        this.elevators = this.elevators.map(elevator => (
            { 
                ...elevator, 
                className: failedElevatorIds.has(elevator.id) ? 'tab failed-tab' : 'tab', 
                isActive: false 
            }
        ));


        this.elevators = [...this.elevators, newElevator];
        this.closeRightSidebar(false);
    }

    // ✅ done
    selectElevator(event) {
        const { elevatorId } = event.detail;

        const failedElevatorIds = new Set(this.validationErrors.map(err => err.id));

        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            className: elevator.id === elevatorId && !failedElevatorIds.has(elevator.id) ? 'tab active-tab' : failedElevatorIds.has(elevator.id) ? 'tab failed-tab' : 'tab',
            isActive: elevator.id === elevatorId
        }));

        this.closeRightSidebar(false);
    }

    // ✅ done
    editTab(event) {
        const { elevatorId, flag } = event.detail;
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            isEditing: elevator.id === elevatorId ? flag : elevator.isEditing
        }));
    }

    // ✅ done
    handleTabLabelChange(event) {
        const { elevatorId, value } = event.detail;
        const elevator = this.elevators.find(elevator => elevator.id === elevatorId);
        if (elevator) {
            elevator.name = value;
            elevator.isChanged = true;
        }
    }
    


    // ! Delete Elevator
    // ✅ done
    deleteElevator(event) {
        const { elevatorId } = event.detail;
        this.showDeleteConfirmationModal = true;
        this.deleteElevatorId = elevatorId;
    }

    handleDeleteConfirmationCancel() {
        this.showDeleteConfirmationModal = false;
    }

    // ✅ done
    handleDeleteConfirmationDelete() {
        this.showDeleteConfirmationModal = false;

        if (this.deleteElevatorId && this.deleteElevatorId.length === 18) {
            this.elevators = this.elevators.map(elevator => {
                if (elevator.id === this.deleteElevatorId) {
                    return {
                        ...elevator,
                        status: 'Deleted',
                        isActive: false,
                        isChanged: true
                    };
                }
                return elevator;
            });
        } else {
            this.elevators = this.elevators.filter(elevator => elevator.id !== this.deleteElevatorId);
        }

        if (this.selectedElevator == null || this.selectedElevator?.id === this.deleteElevatorId) {
            const firstActiveElevator = this.elevators.find(e => e.status !== 'Deleted');

            const failedElevatorIds = new Set(this.validationErrors.map(err => err.id));
            if (firstActiveElevator) {
                this.elevators = this.elevators.map(elevator => ({
                    ...elevator,
                    className: elevator.id === firstActiveElevator.id && !failedElevatorIds.has(elevator.id) ? 'tab active-tab' : failedElevatorIds.has(elevator.id) ? 'tab failed-tab' : 'tab',
                    isActive: elevator.id === firstActiveElevator.id
                }));
            }
        }

        this.deleteElevatorId = null;
    }



    // ! Upload CSV
    handleUpload() {
        this.showUploadCsvModal = true;
    }

    handleUploadCsvModalCancel() {
        this.showUploadCsvModal = false;
    }

    handleUploadCsvModalUpload(event) {
        const { fileName, fileContent } = event.detail;
        console.log('Uploaded:', fileName, fileContent);

        this.showUploadCsvModal = false;
        this.triggerToast('CSV Upload', 'This feature is not yet implemented.', 'warning');
    }
    
    





    // ! Step/Card & Resizing actions
    // ✅ done
    handleTaskComplete(event) {
        if (!this.validateAndConfirmDraftChanges()) {
            return;
        }

        const { taskId, taskName, step } = event.detail;
        const elevator = this.selectedElevatorDetails;

        const getTaskData = (path) => {
            if (path == 'order.details') {
                return this.orders.find(order => order.isRecurring) || this.orders[0];
            } else if (path == 'order.productAssignment') {
                const assignments = elevator.productAssignments || [];
                const selectedProductIds = assignments
                    .filter(a => a.status === 'assigned')
                    .map(a => a.productId);
                const productMap = new Map();

                this.orders.forEach(order => {
                    let baseDescription = order.isRecurring
                        ? `${order.paymentInterval} - ${order.modeOfPayment}`
                        : order.modeOfPayment;

                    if (order.customerOrderNumber) {
                        baseDescription = `${order.customerOrderNumber} | ${baseDescription}`;
                    }
                    (order.orderItems || []).forEach(item => {
                        let isSelected = selectedProductIds.includes(item.productId);
                        if (!productMap.has(item.productId)) {
                            productMap.set(item.productId, {
                                orderId: order.id,
                                orderItemId: item.id,
                                productId: item.productId,
                                productName: item.productName,
                                productCode: item.productCode,
                                description: baseDescription,
                                className: isSelected ? 'slds-card selectable-card selected-card' : 'slds-card selectable-card',
                                isSelected
                            });
                        }
                    });
                });

                return Array.from(productMap.values());
            } else if (path == 'order.benefitReceiver') {
                return this.accounts.find(account => account.id === elevator.benefitReceiverId) || {};
            } else if (path == 'order.invoiceReceiver') {
                return this.accounts.find(account => account.id === elevator.invoiceReceiverId) || {};
            }
            const parts = path.split('.');
            const baseObj = parts.reduce((acc, key) => acc?.[key], elevator) || {};

            if (parts[0] === 'onSiteContacts') {
                return { contact: baseObj };
            }

            const lastKey = parts[parts.length - 1];
            const parent = parts.slice(0, -1).reduce((acc, key) => acc?.[key], elevator);

            let contact = undefined;
            if (parent && parent[`${lastKey}Contact`]) {
                contact = parent[`${lastKey}Contact`];
            }
            return contact ? { ...baseObj, contact } : baseObj;
        };
    
    
        const data = getTaskData(taskId);
        this.selectedTask = {
            id: taskId,
            name: taskName,
            data: data
        };

        this.closeRightSidebar(false);

        if (taskId == 'order.productAssignment') {
            this.showProductAssignmentModal = true;
            return;
        }

        let list = this.listMap[taskId] || [];
        let otherList = getList(list, data.id);

        this.existingRecords = formatListItems(otherList, taskId);

        if (taskId !== 'property.details' && taskId !== 'propertyUnit.details') {
            setTimeout(() => {
                this.openRightSidebar();
            }, 200);
        } else if (data.completed || data?.contact?.completed || otherList.length === 0) {
            setTimeout(() => {
                this.openRightSidebar(); 
            }, 200);
        } else {
            this.lookupObject = LOOKUP_OBJECTS[taskId.split('.')[0]];
            this.showExistingRecordModal = true;
        }
    }

    // ✅ done
    openRightSidebar() {
        this.isRightSidebarOpen = true;
    
        const mainContent = this.template.querySelector('.main-content');
        const rightSidebar = this.template.querySelector('.right-sidebar');
    
        mainContent.classList.add('sidebar-open');
        mainContent.style.marginRight = `${this.rightSidebarWidth}px`;
        rightSidebar.style.width = `${this.rightSidebarWidth}px`;
    
        this.addResizeListeners();
    }

    addResizeListeners() {
        const resizeHandle = this.template.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
            document.addEventListener('mousemove', this.resize.bind(this));
            document.addEventListener('mouseup', this.stopResize.bind(this));
        }
    }

    removeResizeListeners() {
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.stopResize.bind(this));
    }

    startResize(event) {
        this.isResizing = true;
        this.startX = event.clientX;
        this.startWidth = this.rightSidebarWidth;
        
        // Prevent text selection during resize
        event.preventDefault();
    }

    resize(event) {
        if (!this.isResizing) return;

        const deltaX = this.startX - event.clientX;
        const newWidth = Math.max(300, Math.min(600, this.startWidth + deltaX)); // Min 300px, max 800px
        
        this.rightSidebarWidth = newWidth;
        
        this.template.querySelector('.main-content').style.marginRight = `${newWidth}px`;
        this.template.querySelector('.right-sidebar').style.width = `${newWidth}px`;
    }

    stopResize() {
        this.isResizing = false;
    }




    // ! Right Sidebar actions
    closeRightSidebar(validateDrafts = true) {
        if (validateDrafts && !this.validateAndConfirmDraftChanges()) {
            return;
        }

        this.isRightSidebarOpen = false;
        const mainContent = this.template.querySelector('.main-content');
        mainContent.classList.remove('sidebar-open');
        mainContent.style.marginRight = '0';
        this.rightSidebarWidth = 400;
        this.removeResizeListeners();
    }

    get rightSidebarClass() {
        return `right-sidebar ${this.isRightSidebarOpen ? '' : 'hidden'}`;
    }

    // ✅ done
    handleDraftChange(event) {
        const { data } = event.detail;
        const { fieldName, fieldValue } = data;
        const taskId = this.selectedTask.id;
    
        const [objectKey, subKey] = taskId.split('.');
        
        if (!this.draftChanges[objectKey]) {
            this.draftChanges[objectKey] = {};
        }
    
        if (!this.draftChanges[objectKey][subKey]) {
            this.draftChanges[objectKey][subKey] = {};
        }
    
        this.draftChanges[objectKey][subKey][fieldName] = fieldValue;
    
        this.draftChanges = { ...this.draftChanges };
    }

    // ✅ done
    validateAndConfirmDraftChanges() {
        if (Object.keys(this.draftChanges).length > 0) {
            console.log('draftChanges', JSON.stringify(this.draftChanges));
            const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel? Changes will be lost.');
            if (!confirmCancel) {
                return false;
            }
        }
        if (this.draftChanges['clearAll']) {
            const [objectKey, subKey] = this.selectedTask.id.split('.');

            // ! Property
            if (objectKey == 'property') {
                if (subKey == 'details') {
                    this.selectedElevator.propertyId = this.draftChanges[`propertyId`];
                } else {
                    let property = this.properties.find(p => p.id === this.selectedElevator.propertyId);
                    if (property) {
                        property[`${subKey}Id`] = this.draftChanges[`${subKey}Id`];
                        property[`${subKey}ContactId`] = this.draftChanges[`${subKey}ContactId`];
                    }
                }
            } 
            
            // ! Property Unit
            else if (objectKey == 'propertyUnit') {
                if (subKey == 'details') {
                    this.selectedElevator.propertyUnitId = this.draftChanges[`propertyUnitId`];
                } else {
                    let propertyUnit = this.propertyUnits.find(pu => pu.id === this.selectedElevator.propertyUnitId);
                    if (propertyUnit) {
                        propertyUnit[`${subKey}Id`] =  this.draftChanges[`${subKey}Id`];
                        propertyUnit[`${subKey}ContactId`] = this.draftChanges[`${subKey}ContactId`];
                    }
                }
            }
    
            // ! On Site Contacts
            else if (objectKey == 'onSiteContacts') {
                let propertyUnit = this.propertyUnits.find(pu => pu.id === this.selectedElevator.propertyUnitId);
                if (propertyUnit) {
                    propertyUnit[`${subKey}Id`] = this.draftChanges[`${subKey}Id`];
                }
            }
            
            // ! Order
            else if (objectKey == 'order') {
                this.selectedElevator[`${subKey}Id`] = this.draftChanges[`${subKey}Id`];
            }
            
        }

        this.draftChanges = {};
        return true;
    }

    get isAnyChanged() {
        return this.elevators?.some(e => e.isChanged) || 
               this.properties?.some(p => p.isChanged) || 
               this.propertyUnits?.some(pu => pu.isChanged) || 
               this.accounts?.some(a => a.isChanged) || 
               this.contacts?.some(c => c.isChanged) || 
               this.orders?.some(o => o.isChanged);
    }
    // ✅ done
    handleBeforeUnload = (event) => {
        if (this.isAnyChanged) {
            event.preventDefault();
            event.returnValue = '';
        }
    };
    
    // ✅ done
    handleSave() {
        const missingFields = this.validateRequiredFields();
        if (missingFields.length > 0) {
            console.log('draftChanges', JSON.stringify(this.draftChanges));
            this.triggerToast('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }
    
        const elevator = this.selectedElevatorDetails;
        const [objectKey, subKey] = this.selectedTask.id.split('.');
        const draft = this.draftChanges[objectKey]?.[subKey] || {};
    
        const handleAccountAndContact = (target, prop, draft) => {
            const groups = extractPrefixedFields(draft);
            if (groups.account) {
                const acc = updateOrCreateAndApply(this.accounts, target[`${prop}Id`], ACCOUNT, groups.account);
                target[`${prop}Id`] = acc.id;
            }
            if (groups.contact) {
                const con = updateOrCreateAndApply(this.contacts, target[`${prop}ContactId`], CONTACT, groups.contact);
                target[`${prop}ContactId`] = con.id;
            }
        };
    
        const handleGenericDetails = (list, currentId, template, draft, targetKey) => {
            const record = updateOrCreateAndApply(list, currentId, template, draft);
            this.selectedElevator[targetKey] = record.id;
            return record;
        };
    
        switch (objectKey) {
            case 'property':
                if (subKey === 'details') {
                    handleGenericDetails(this.properties, elevator.property?.details?.id, PROPERTY, draft, 'propertyId');
                } else {
                    const property = this.properties.find(p => p.id === elevator?.property?.details?.id);
                    if (!property) return;
                    handleAccountAndContact(property, subKey, draft);
                }
                break;
    
            case 'propertyUnit':
                if (subKey === 'details') {
                    const record = handleGenericDetails(this.propertyUnits, elevator.propertyUnit?.details?.id, PROPERTY_UNIT, draft, 'propertyUnitId');
                    record.propertyId = elevator?.property?.details?.id;
                } else {
                    const unit = this.propertyUnits.find(p => p.id === elevator?.propertyUnit?.details?.id);
                    if (!unit) return;
                    handleAccountAndContact(unit, subKey, draft);
                }
                break;
    
            case 'onSiteContacts':
                const unit = this.propertyUnits.find(p => p.id === elevator?.propertyUnit?.details?.id);
                if (!unit) return;
                const groups = extractPrefixedFields(draft);
                if (groups.contact) {
                    const contact = updateOrCreateAndApply(this.contacts, unit[`${subKey}Id`], CONTACT, groups.contact);
                    unit[`${subKey}Id`] = contact.id;
                }
                break;
    
            case 'order':
                if (subKey === 'details') {
                    this.orders = this.orders.map(order => {
                        const updated = { ...order };
                        Object.entries(draft).forEach(([key, value]) => updated[key] = value);
                        updated.isChanged = true;
                        return updated;
                    });
                } else {
                    const groups = extractPrefixedFields(draft);
                    if (groups.account) {
                        const account = updateOrCreateAndApply(this.accounts, elevator[`${subKey}Id`], ACCOUNT, groups.account);
                        this.selectedElevator[`${subKey}Id`] = account.id;
                    }
                }
                break;
        }
    
        this.draftChanges = {};
        this.selectedTask = {};
        this.closeRightSidebar(false);
        this.triggerToast('Success', 'Changes saved successfully', 'success');
    }

    // ✅ done
    validateRequiredFields() {
        const elevator = this.selectedElevatorDetails;
    
        const taskId = this.selectedTask.id;
        const missingFields = [];
        const requiredFields = REQUIRED_FIELDS[taskId] || [];
    
        const taskData = getData(taskId, elevator);
        const draftData = getData(taskId, this.draftChanges);
    
        requiredFields.forEach(field => {
            const fieldId = field.id;
            const [objectKey, subKey] = fieldId.split('.');

            if (field.isAddress) {
                const address = draftData[fieldId] || taskData.address || {};
                const postalCode = (address.postalCode || '').trim();
                if (!postalCode) {
                    missingFields.push(field.name);
                }
                return;
            }

            let value;
            if (objectKey === 'contact') {
                let tempData = taskId.split('.')[0] == 'onSiteContacts' ? { contact: taskData } : taskData;
                value = draftData?.[fieldId] ?? tempData?.[objectKey]?.[subKey];
            } else {
                value = draftData[fieldId] ?? taskData[subKey];
            }
            const isEmpty = value === undefined || value === null || value === '';
    
            if (isEmpty) {
                missingFields.push(field.name);
            }
        });
    
        return missingFields;
    }

    // ✅ done
    handleLookup(event) {
        const { object } = event.detail;

        this.lookupObject = LOOKUP_OBJECTS[object];

        let list = object === 'account' ? this.accounts : this.contacts;
        let currentId = object === 'account' ? this.selectedTask.data.id : this.selectedTask.data?.contact?.id;
        let otherList = getList(list, currentId);
        
        this.existingRecords = formatListItems(otherList, object);

        this.showExistingRecordModal = true;
        this.isLookup = true;
    }
    
    // ✅ done
    handleClear() {
        this.draftChanges = {};
        this.draftChanges['clearAll'] = true;

        const elevator = this.selectedElevatorDetails;
        const [objectKey, subKey] = this.selectedTask.id.split('.');

        // ! Property
        if (objectKey == 'property') {
            if (subKey == 'details') {
                this.draftChanges[`propertyId`] = this.selectedElevator.propertyId;
                this.selectedElevator.propertyId = null;
            } else {
                let property = this.properties.find(p => p.id === elevator.propertyId);
                if (property) {
                    this.draftChanges[`${subKey}Id`] = property[`${subKey}Id`];
                    this.draftChanges[`${subKey}ContactId`] = property[`${subKey}ContactId`];
    
                    property[`${subKey}Id`] = null;
                    property[`${subKey}ContactId`] = null;
                }
            }
        } 
        
        // ! Property Unit
        else if (objectKey == 'propertyUnit') {
            if (subKey == 'details') {
                this.draftChanges[`propertyUnitId`] = this.selectedElevator.propertyUnitId;
                this.selectedElevator.propertyUnitId = null;
            } else {
                let propertyUnit = this.propertyUnits.find(pu => pu.id === elevator.propertyUnitId);
                if (propertyUnit) {
                    this.draftChanges[`${subKey}Id`] = propertyUnit[`${subKey}Id`];
                    this.draftChanges[`${subKey}ContactId`] = propertyUnit[`${subKey}ContactId`];

                    propertyUnit[`${subKey}Id`] = null;
                    propertyUnit[`${subKey}ContactId`] = null;
                }
            }
        }

        // ! On Site Contacts
        else if (objectKey == 'onSiteContacts') {
            let propertyUnit = this.propertyUnits.find(pu => pu.id === elevator.propertyUnitId);
            if (propertyUnit) {
                this.draftChanges[`${subKey}Id`] = propertyUnit[`${subKey}Id`];
                propertyUnit[`${subKey}Id`] = null;
            }
        }
        
        // ! Order
        else if (objectKey == 'order') {
            this.draftChanges[`${subKey}Id`] = this.selectedElevator[`${subKey}Id`];
            this.selectedElevator[`${subKey}Id`] = null;
        }
        
        const rightSidebar = this.template.querySelector('c-onboarding-right-sidebar');
        if (rightSidebar) {
            rightSidebar.clearAllInputs();
        }
    }
    





    // ! Existing Record Modal actions
    // ✅ done
    handleExistingRecordSelect(event) {
        let existingRecordId = event.detail.id;
        
        this.existingRecords = this.existingRecords.map(item => {
            if (item.id === existingRecordId && item.isSelected) {
                return {
                    ...item,
                    isSelected: false,
                    className: 'slds-card selectable-card'
                };
            }
            return {
                ...item,
                isSelected: item.id === existingRecordId,
                className: item.id === existingRecordId ? 
                    'slds-card selectable-card selected-card' : 
                    'slds-card selectable-card'
            };
        });
    }

    handleExistingRecordCancel() {
        this.showExistingRecordModal = false;
        this.isLookup = false;
        this.lookupObject = {};
    }

    // ✅ done
    handleExistingRecordSelectConfirm() {
        let selectedRecord = this.existingRecords.find(record => record.isSelected);
        
        if (this.selectedTask.id === 'property.details') {
            this.selectedElevator.propertyId = selectedRecord.id;
        } else if (this.selectedTask.id === 'propertyUnit.details') {
            this.selectedElevator.propertyUnitId = selectedRecord.id;
        } else {
            const list = this.lookupObject.objectType === 'account' ? this.accounts : this.contacts;
            const data = list.find(item => item.id === selectedRecord.id);

            const rightSidebar = this.template.querySelector('c-onboarding-right-sidebar');
            if (rightSidebar) {
                rightSidebar.setInputValues({
                    [`${this.lookupObject.objectType}.name`]: data.name,
                    [`${this.lookupObject.objectType}.email`]: data.email,
                    [`${this.lookupObject.objectType}.address`]: data.address,
                    [`${this.lookupObject.objectType}.firstName`]: data?.firstName,
                    [`${this.lookupObject.objectType}.lastName`]: data?.lastName,
                    [`${this.lookupObject.objectType}.phone`]: data?.phone,
                    [`${this.lookupObject.objectType}.title`]: data?.title
                });
            }
            
            // TODO: update the reference id of data
            const [objectKey, subKey] = this.selectedTask.id.split('.');
            const referenceList = objectKey == 'property' ? this.properties :
                                objectKey == 'order' ? this.elevators : this.propertyUnits;
            let refId = objectKey == 'order' ? 'id' : `${objectKey}Id`;
            let referenceObject = referenceList.find(item => item.id === this.selectedElevator[refId]);
            
            let refContactKey = objectKey == 'onSiteContacts' ? `${subKey}Id` : `${subKey}ContactId`;
            let referenceKey = this.lookupObject.objectType == 'account' ? `${subKey}Id` : refContactKey;
            referenceObject[referenceKey] = selectedRecord.id;
        }

        this.handleExistingRecordCancel();
    }

    handleExistingRecordCreate() {
        this.handleExistingRecordCancel();
        this.openRightSidebar();
    }




    // ! Product Assignment Modal actions
    // ✅ done
    handleProductAssignmentSelect(event) {    
        const productId = event.detail.id;
    
        const currentStatus = this.draftChanges[productId];
        const isAlreadySelected = currentStatus === 'assigned';
    
        const originallyAssigned = (this.selectedElevator.productAssignments || []).some(
            a => a.productId === productId && a.status === 'assigned'
        );
    
        if (isAlreadySelected) {
            if (originallyAssigned) {
                this.draftChanges[productId] = 'unassigned';
            } else {
                delete this.draftChanges[productId];
            }
        } else {
            this.draftChanges[productId] = 'assigned';
        }
    
        const target = this.selectedTask?.data?.find(item => item.productId === productId);
        if (target) {
            target.isSelected = !isAlreadySelected;
            target.className = target.isSelected
                ? 'slds-card selectable-card selected-card'
                : 'slds-card selectable-card';
        }
    }
    
    // ✅ done
    handleProductAssignment() {
        const original = this.selectedElevator.productAssignments || [];
        const updatedAssignments = [...original];
    
        Object.entries(this.draftChanges).forEach(([productId, status]) => {
            const existing = updatedAssignments.find(a => a.productId === productId);
    
            if (existing) {
                existing.status = status;
                existing.isChanged = true;
            } else if (status === 'assigned') {
                updatedAssignments.push({
                    productId,
                    status: 'assigned',
                    isNew: true,
                    isChanged: true
                });
            }
        });
    
        this.selectedElevator.productAssignments = updatedAssignments;
        this.draftChanges = {};
        this.selectedTask = {};
        this.showProductAssignmentModal = false;
        console.log('elevators', JSON.stringify(this.elevators));
        this.triggerToast('Success', 'Product/s assigned successfully', 'success');
    }
    
    // ✅ done
    handleProductAssignmentCancel() {
        if (!this.validateAndConfirmDraftChanges()) {
            return;
        }
        this.draftChanges = {};
        this.showProductAssignmentModal = false;
    }





    validateData() {
        const errorsByElevator = [];

        this.elevators.forEach(e => {
            const errorObj = {
                id: e.id,
                name: e.name ?? '-',
                elevatorErrors: [],
                orderErrors: [],
                propertyErrors: [],
                propertyUnitErrors: []
            };

            // Elevator fields
            if (!e.name) errorObj.elevatorErrors.push({ message: 'Elevator Name is missing', field: 'name' });
            if (!e.propertyId) errorObj.elevatorErrors.push({ message: 'Elevator Property is missing', field: 'propertyId' });
            if (!e.propertyUnitId) errorObj.elevatorErrors.push({ message: 'Elevator Property Unit is missing', field: 'propertyUnitId' });

            // Order fields
            if (!e.benefitReceiverId) errorObj.orderErrors.push({ message: 'Benefit Receiver is missing', field: 'benefitReceiverId' });
            if (!e.invoiceReceiverId) errorObj.orderErrors.push({ message: 'Invoice Receiver is missing', field: 'invoiceReceiverId' });

            // Product assignment
            if (!e.productAssignments || e.productAssignments.length === 0) {
                errorObj.orderErrors.push({ message: 'Product is not assigned', field: 'productAssignments' });
            }

            // Property errors — find related property
            const property = this.properties.find(p => p.id === e.propertyId);
            if (property) {
                if (!property.propertyOwnerId) {
                    errorObj.propertyErrors.push({ message: 'Property Owner is required', field: 'propertyOwnerId' });
                }
            }

            // Property Unit errors — find related property unit
            const propertyUnit = this.propertyUnits.find(pu => pu.id === e.propertyUnitId);
            if (propertyUnit) {
                if (!propertyUnit.operatorId) {
                    errorObj.propertyUnitErrors.push({ message: 'Operator is required', field: 'operatorId' });
                }
                if (!propertyUnit.propertyManagerId) {
                    errorObj.propertyUnitErrors.push({ message: 'Property Manager is required', field: 'propertyManagerId' });
                }
                if (!propertyUnit.houseKeeperId) {
                    errorObj.propertyUnitErrors.push({ message: 'House Keeper is required', field: 'houseKeeperId' });
                }
            }

            // Finally — only add elevator to result if it has any errors
            if (
                errorObj.elevatorErrors.length > 0 ||
                errorObj.orderErrors.length > 0 ||
                errorObj.propertyErrors.length > 0 ||
                errorObj.propertyUnitErrors.length > 0
            ) {
                errorsByElevator.push(errorObj);
            }
        });

        return errorsByElevator;
    }

    // ! Publish
    handlePublish() {
        this.validationErrors = this.validateData();
    
        this.showValidationModal = this.validationErrors.length > 0;
    
        const failedElevatorIds = new Set(this.validationErrors.map(err => err.id));
    
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            className: failedElevatorIds.has(elevator.id) ? 'tab failed-tab' : this.selectedElevator.id == elevator.id ? 'tab active-tab' : 'tab'
        }));
    }
    

    
    // ! Validation Modal actions
    handleValidationModalCancel() {
        this.showValidationModal = false;
    }



    getQueryParameters() {
        var params = {};
        var search = location.search.substring(1);

        if (search) {
            params = JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g, '":"') + '"}', (key, value) => {
                return key === "" ? value : decodeURIComponent(value)
            });
        }

        return params;
    }



    // TOAST
    triggerToast(title, message, variant = 'success') {
        this.toast = {
            title,
            message,
            variant,
            icon: this.getIconName(variant)
        }
        this.showToast = true;

        setTimeout(() => {
            this.hideToast();
        }, 3000);
    }

    hideToast() {
        this.showToast = false;
    }

    getIconName(variant) {
        switch (variant) {
            case 'success': return 'utility:success';
            case 'error': return 'utility:error';
            case 'warning': return 'utility:warning';
            case 'info': return 'utility:info';
            default: return 'utility:info';
        }
    }



    

    
}