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
    REQUIRED_FIELDS
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

    @track showProductAssignmentModal = false;

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
                } else if (task.id == 'order.benefitReceiver') {
                    let br = this.accounts.find(account => account.id === elevator.benefitReceiverId);
                    task.completed = br != null;
                    task.className = br?.isChanged ? 'task-item changed' : 'task-item';
                } else if (task.id == 'order.invoiceReceiver') {
                    let ir = this.accounts.find(account => account.id === elevator.invoiceReceiverId);
                    task.completed = ir != null;
                    task.className = ir?.isChanged ? 'task-item changed' : 'task-item';
                } else {
                    const data = getData(task.id, elevator);
                    task.completed = data?.completed === true;
                    task.className = data?.isChanged ? 'task-item changed' : 'task-item';
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

        const newElevator = {
            ...JSON.parse(JSON.stringify(ELEVATOR)),
            id: elevatorId,
            name: elevatorName
        };
        this.elevators = this.elevators.map(elevator => (
            { 
                ...elevator, 
                className: 'tab', 
                isActive: false 
            }
        ));


        this.elevators = [...this.elevators, newElevator];
        this.closeRightSidebar(false);
    }

    // ✅ done
    selectElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            className: elevator.id === elevatorId ? 'tab active-tab' : 'tab',
            isActive: elevator.id === elevatorId
        }));

        this.closeRightSidebar(false);
    }

    // ✅ done
    deleteElevator(event) {
        const { elevatorId } = event.detail;
        this.elevators = this.elevators.filter(elevator => elevator.id !== elevatorId);

        if (this.selectedElevator == null || (this.selectedElevator?.id === elevatorId && this.elevators.length > 0)) {
            this.elevators[0].className = 'tab active-tab';
            this.elevators[0].isActive = true;
        }
    }

    // ❌ not done
    handleUpload() {
        console.log('upload');
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

        if (
            (data.completed || data?.contact?.completed || otherList.length === 0) && 
            taskId != 'property.details' && 
            taskId != 'propertyUnit.details'
        ) {
            setTimeout(() => {
                this.openRightSidebar();
            }, 200);
        } else {
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
        const { taskId, fieldName, fieldValue } = data;
    
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

    validateAndConfirmDraftChanges() {
        if (Object.keys(this.draftChanges).length > 0) {
            const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel? Changes will be lost.');
            if (!confirmCancel) {
                return false;
            }
        }
        this.draftChanges = {};
        return true;
    }

    // ✅ done
    handleBeforeUnload = (event) => {
        const elevatorsChanged = this.elevators?.some(e => e.isChanged);
        const propertiesChanged = this.properties?.some(p => p.isChanged);
        const propertyUnitsChanged = this.propertyUnits?.some(pu => pu.isChanged);
        const accountsChanged = this.accounts?.some(a => a.isChanged);
        const contactsChanged = this.contacts?.some(c => c.isChanged);
        const ordersChanged = this.orders?.some(o => o.isChanged);
    
        if (elevatorsChanged || propertiesChanged || propertyUnitsChanged || accountsChanged || contactsChanged || ordersChanged) {
            event.preventDefault();
            event.returnValue = '';
        }
    };
    
    

    // ✅ done
    handleSave() {
        const missingFields = this.validateRequiredFields();
        if (missingFields.length > 0) {
            this.triggerToast('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }
    
        const elevator = this.selectedElevatorDetails;
        const [object, prop] = this.selectedTask.id.split('.');
        const draft = this.draftChanges[object]?.[prop] || {};
    
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
    
        switch (object) {
            case 'property':
                if (prop === 'details') {
                    handleGenericDetails(this.properties, elevator.property?.details?.id, PROPERTY, draft, 'propertyId');
                } else {
                    const property = this.properties.find(p => p.id === elevator?.property?.details?.id);
                    if (!property) return;
                    handleAccountAndContact(property, prop, draft);
                }
                break;
    
            case 'propertyUnit':
                if (prop === 'details') {
                    const record = handleGenericDetails(this.propertyUnits, elevator.propertyUnit?.details?.id, PROPERTY_UNIT, draft, 'propertyUnitId');
                    record.propertyId = elevator?.property?.details?.id;
                } else {
                    const unit = this.propertyUnits.find(p => p.id === elevator?.propertyUnit?.details?.id);
                    if (!unit) return;
                    handleAccountAndContact(unit, prop, draft);
                }
                break;
    
            case 'onSiteContacts':
                const unit = this.propertyUnits.find(p => p.id === elevator?.propertyUnit?.details?.id);
                if (!unit) return;
                const groups = extractPrefixedFields(draft);
                if (groups.contact) {
                    const contact = updateOrCreateAndApply(this.contacts, unit[`${prop}Id`], CONTACT, groups.contact);
                    unit[`${prop}Id`] = contact.id;
                }
                break;
    
            case 'order':
                if (prop === 'details') {
                    this.orders = this.orders.map(order => {
                        const updated = { ...order };
                        Object.entries(draft).forEach(([key, value]) => updated[key] = value);
                        updated.isChanged = true;
                        return updated;
                    });
                } else {
                    const groups = extractPrefixedFields(draft);
                    if (groups.account) {
                        const account = updateOrCreateAndApply(this.accounts, elevator[`${prop}Id`], ACCOUNT, groups.account);
                        this.selectedElevator[`${prop}Id`] = account.id;
                    }
                }
                break;
        }
    
        this.draftChanges = {};
        this.selectedTask = {};
        this.closeRightSidebar(false);
        this.triggerToast('Success', 'Changes saved successfully', 'success');
        // console.log('save', JSON.stringify(this.selectedElevatorDetails));
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
            const [object, prop] = fieldId.split('.');

            if (field.isAddress) {
                const address = draftData[fieldId] || taskData.address || {};
                const postalCode = (address.postalCode || '').trim();
                if (!postalCode) {
                    missingFields.push(field.name);
                }
                return;
            }

            let value;
            if (object === 'contact') {
                let tempData = taskId.split('.')[0] == 'onSiteContacts' ? { contact: taskData } : taskData;
                value = draftData?.[fieldId] ?? tempData?.[object]?.[prop];
            } else {
                value = draftData[fieldId] ?? taskData[prop];
            }
            const isEmpty = value === undefined || value === null || value === '';
    
            if (isEmpty) {
                missingFields.push(field.name);
            }
        });
    
        return missingFields;
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
    }

    // ✅ done
    handleExistingRecordSelectConfirm() {
        let selectedRecord = this.existingRecords.find(record => record.isSelected);
        
        if (this.selectedTask.id === 'property.details') {
            this.selectedElevator.propertyId = selectedRecord.id;
        } else if (this.selectedTask.id === 'propertyUnit.details') {
            this.selectedElevator.propertyUnitId = selectedRecord.id;
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