import { LightningElement, track } from 'lwc';
import OnboardingPageUrl from '@salesforce/label/c.Onboarding_Page';

import { 
    getOnboardingData,
    publishOnboardingData,
    uploadCsvData,
    getUserInfo
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
    formatListItems,
    generateUniqueId
} from 'c/onboardingUtils';




export default class OnboardingPageLwc extends LightningElement {
    noElevatorsFound = NO_ELEVATORS_FOUND;
    loginUrl = `${OnboardingPageUrl}/login`;

    parameters = {};

    @track rightSidebarWidth = 400;
    @track isRightSidebarOpen = false;

    @track selectedTask = {};

    isResizing = false;
    startX = 0;
    startWidth = 0;

    @track isLoading = false;
    @track error;

    @track userData = {};
    @track contractName = '';

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
        return this.elevators.filter(elevator => !elevator.isDeleted);
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

    get context() {
        return {
            contractId: this.parameters?.contractId,
            userId: localStorage.getItem('auth_user_id'),
            userEmail: localStorage.getItem('auth_email')
        };
    }
    

    async fetchOnboardingData() {
        try {
            this.isLoading = true;

            this.elevators = [];
            this.properties = [];
            this.propertyUnits = [];
            this.accounts = [];
            this.contacts = [];
            this.orders = [];
    
            console.log('this.parameters', JSON.stringify(this.context));
            let onboarding = await getOnboardingData(this.context);

            this.contractName = onboarding.data.contractName;

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
    }

    // ✅ done
    async connectedCallback() {
        this.isLoading = true;
        this.parameters = this.getQueryParameters();
        const isAuthenticated = this.handleAuthentication(this.parameters);
    
        if (!isAuthenticated) return;
    
        const userInfo = await getUserInfo({...this.context, mode: 'userinfo'});
        console.log('userInfo', userInfo, JSON.stringify(this.context));

        this.userData = userInfo.data;
        this.isLoading = false;

        await this.fetchOnboardingData();
    
        this.applyBodyStyles();
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    handleAuthentication(params) {
        const tokenKey = 'auth_token';
        const expiryKey = 'auth_token_expiry';
        const emailKey = 'auth_email';
        
        const now = Date.now();
        const token = params.token;
    
        if (token) {
            localStorage.setItem(tokenKey, token);
            localStorage.setItem(expiryKey, (now + 30 * 24 * 60 * 60 * 1000).toString());
        }
    
        if (params.email) {
            localStorage.setItem(emailKey, params.email);
        }
    
        if (token) {
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            url.searchParams.delete('userId');
            url.searchParams.delete('email');
            window.history.replaceState({}, '', url.toString());
        }
    
        const validToken = localStorage.getItem(tokenKey);
        const validExpiry = parseInt(localStorage.getItem(expiryKey), 10);
    
        if (!validToken || isNaN(validExpiry) || now > validExpiry) {
            const currentUrl = encodeURIComponent(window.location.href);
            const loginUrl = `${this.loginUrl}?redirectUrl=${currentUrl}`;
            window.location.href = loginUrl;
            return false;
        }
    
        return true;
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
            externalId: elevatorId,
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

        let elevatorToDelete = this.elevators.find(e => e.id === this.deleteElevatorId);
        if (elevatorToDelete && !elevatorToDelete.isNew) {
            this.elevators = this.elevators.map(elevator => {
                if (elevator.id === this.deleteElevatorId) {
                    return {
                        ...elevator,
                        isDeleted: true,
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
            const firstActiveElevator = this.elevators.find(e => !e.isDeleted);

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

    async handleUploadCsvModalUpload(event) {
        const { fileName, fileContent } = event.detail;
        this.isLoading = true;
        // console.log('Uploaded:', fileName, JSON.stringify(fileContent));

        try {
            const extraHeaders = {
                ...this.context,
                mode: 'upload'
            }
            const result = await uploadCsvData({data: fileContent}, extraHeaders);
            this.mergeUploadedData(result);

        } catch (error) {
            console.error('Error uploading CSV:', error);
            this.triggerToast('Error', error.message || error.body?.message || 'Failed to upload CSV', 'error');
        } finally {
            this.showUploadCsvModal = false;
            this.isLoading = false;
        }
    }

    mergeUploadedData(result) {
        const { elevators, properties, propertyUnits, accounts, contacts, orders } = result.data;
            
        let newElevatorsCount = 0;
        let skippedElevatorsCount = 0;
        const newElevatorIds = new Set();

        // ! === Merge Elevators ===
        for (const uploaded of elevators) {
            const exists = this.elevators.some(e => e.name?.trim() === uploaded.name?.trim());
            if (exists) {
                skippedElevatorsCount++;
            } else {
                uploaded.isNew = true;
                uploaded.isChanged = true;
                uploaded.status = "New";
                uploaded.icon = "utility:add";
                uploaded.className = "tab";
                uploaded.tooltip = "New";
                uploaded.isEditing = true;

                this.elevators.push(uploaded);
                newElevatorIds.add(uploaded.id);
                newElevatorsCount++;
            }
        }

        // ! === Merge Order Comments ===
        if (orders?.length && this.orders?.length) {
            const uploadedComments = orders.map(o => o.comment).filter(Boolean).join('\n');
            if (uploadedComments) {
                this.orders.forEach(order => {
                    order.comment = order.comment 
                        ? order.comment + '\n' + uploadedComments
                        : uploadedComments;
                });
            }
        }

        // ! === Merge related records only if linked to new elevators ===
        const relatedPropertyIds = new Set();
        const relatedPropertyUnitIds = new Set();
        const relatedAccountIds = new Set();
        const relatedContactIds = new Set();

        elevators.forEach(e => {
            if (newElevatorIds.has(e.id)) {
                if (e.propertyId) relatedPropertyIds.add(e.propertyId);
                if (e.propertyUnitId) relatedPropertyUnitIds.add(e.propertyUnitId);
                if (e.invoiceReceiverId) relatedAccountIds.add(e.invoiceReceiverId);
                if (e.benefitReceiverId) relatedAccountIds.add(e.benefitReceiverId);
            }
        });

        propertyUnits.forEach(pu => {
            if (
                relatedPropertyUnitIds.has(pu.id) &&
                !this.propertyUnits.some(existing => existing.id === pu.id)
            ) {
                this.propertyUnits.push(pu);
                if (pu.operatorId) relatedAccountIds.add(pu.operatorId);
                if (pu.propertyManagerId) relatedContactIds.add(pu.propertyManagerId);
                if (pu.houseKeeperId) relatedContactIds.add(pu.houseKeeperId);
            }
        });

        properties.forEach(p => {
            if (
                relatedPropertyIds.has(p.id) &&
                !this.properties.some(existing => existing.id === p.id)
            ) {
                this.properties.push(p);
                if (p.propertyOwnerId) relatedAccountIds.add(p.propertyOwnerId);
            }
        });

        accounts.forEach(acc => {
            if (
                relatedAccountIds.has(acc.id) &&
                !this.accounts.some(existing => existing.id === acc.id)
            ) {
                this.accounts.push(acc);
            }
        });

        contacts.forEach(c => {
            if (
                relatedContactIds.has(c.id) &&
                !this.contacts.some(existing => existing.id === c.id)
            ) {
                this.contacts.push(c);
            }
        });

        // ! === Toast modal summary ===
        const total = newElevatorsCount + skippedElevatorsCount;
        this.triggerToast(
            'Hochladen abgeschlossen',
            `${total} Aufzüge verarbeitet: ${newElevatorsCount} hochgeladen, ${skippedElevatorsCount} ausgelassen aufgrund von Duplikaten.`,
            'success'
        );
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
                    let baseDescription = "";

                    if (order.customerOrderNumber) {
                        baseDescription = `${order.customerOrderNumber}`;
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

        setTimeout(() => {
            this.openRightSidebar(); 
        }, 200);
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
            const confirmCancel = window.confirm('Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie abbrechen möchten? Änderungen werden verlorengehen.');
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
            this.triggerToast('Pflichtfelder fehlen', `Bitte ausfüllen: ${missingFields.join(', ')}`, 'error');
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
                    unit.isChanged = true;
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
                    console.log('groups: ', JSON.stringify(groups));
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

        this.triggerToast('Success', 'Änderungen erfolgreich gespeichert', 'success');
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
            } else if (objectKey === 'property') {
                value = draftData?.[subKey] ?? taskData?.[subKey];
            } else {
                value = draftData[fieldId] ?? taskData[subKey];
            }
            console.log('value', value);
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

        let list = object === 'account' ? 
                    this.accounts : object === 'property' ? 
                    this.properties : object === 'propertyUnit' ? 
                    this.propertyUnits : this.contacts;
        let currentId = object === 'account' ? 
                        this.selectedTask.data.id : object === 'property' ? 
                        this.selectedTask.data.id : object === 'propertyUnit' ? 
                        this.selectedTask.data.id : this.selectedTask.data?.contact?.id;
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
        const rightSidebar = this.template.querySelector('c-onboarding-right-sidebar');
        const list = this.lookupObject.objectType === 'account' ? this.accounts : 
                        this.lookupObject.objectType === 'property' ? this.properties : 
                        this.lookupObject.objectType === 'propertyUnit' ? this.propertyUnits : this.contacts;
        
        const data = list.find(item => item.id === selectedRecord.id);
        
        if (this.selectedTask.id === 'property.details') {
            const currentPropertyId = this.selectedElevator.propertyId;

            this.propertyUnits
                .filter(unit => unit.propertyId === currentPropertyId)
                .forEach(unit => {
                    unit.propertyId = selectedRecord.id;
                    unit.isChanged = true;
                });

            this.selectedElevator.propertyId = selectedRecord.id;

            if (rightSidebar) {
                rightSidebar.setInputValues({
                    name: data.name,
                    address: data.address,
                    businessUnit: data.businessUnit
                })
            }
        } else if (this.selectedTask.id === 'propertyUnit.details') {
            this.selectedElevator.propertyUnitId = selectedRecord.id;
            if (rightSidebar) {
                rightSidebar.setInputValues({
                    name: data.name,
                    address: data.address,
                    propertyType: data.propertyType
                })
            }
        } else {
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
            let refId = objectKey == 'order' ? 'id' : objectKey == 'onSiteContacts' ? `propertyUnitId` : `${objectKey}Id`;
            let referenceObject = referenceList.find(item => item.id === this.selectedElevator[refId]);
            
            let refContactKey = objectKey == 'onSiteContacts' ? `${subKey}Id` : `${subKey}ContactId`;
            let referenceKey = this.lookupObject.objectType == 'account' ? `${subKey}Id` : refContactKey;
            
            referenceObject[referenceKey] = selectedRecord.id;
            referenceObject.isChanged = true;

            if (objectKey == 'onSiteContacts') {
                this.contacts.find(c => c.id === selectedRecord.id).isChanged = true;
            }
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
        this.triggerToast('Success', 'Produkt(e) erfolgreich zugewiesen', 'success');
    }
    
    // ✅ done
    handleProductAssignmentCancel() {
        if (!this.validateAndConfirmDraftChanges()) {
            return;
        }
        this.draftChanges = {};
        this.showProductAssignmentModal = false;
    }



    // ✅ done
    prepareFinalData() {
        const elevatorPropertyIds = new Set(this.elevators.map(e => e.propertyId));
        const elevatorPropertyUnitIds = new Set(this.elevators.map(e => e.propertyUnitId));

        const properties = this.properties.filter(p => elevatorPropertyIds.has(p.id) && p.isChanged);
        const propertyUnits = this.propertyUnits.filter(pu => elevatorPropertyUnitIds.has(pu.id) && pu.isChanged);
        
        // ! Account IDs
        const accountIds = new Set();
        this.elevators.forEach(e => {
            accountIds.add(e.benefitReceiverId);
            accountIds.add(e.invoiceReceiverId);
        });
        properties.forEach(p => {
            accountIds.add(p.propertyOwnerId);
            accountIds.add(p.assetManagerId);
        });
        propertyUnits.forEach(pu => {
            accountIds.add(pu.pmId);
            accountIds.add(pu.fmId);
            accountIds.add(pu.hvId);
            accountIds.add(pu.operatorId);
        });

        // ! Contact IDs
        const contactIds = new Set();
        properties.forEach(p => {
            contactIds.add(p.propertyOwnerContactId);
            contactIds.add(p.assetManagerContactId);
        });
        propertyUnits.forEach(pu => {
            contactIds.add(pu.pmContactId);
            contactIds.add(pu.fmContactId);
            contactIds.add(pu.hvContactId);
            contactIds.add(pu.operatorContactId);
            contactIds.add(pu.propertyManagerId);
            contactIds.add(pu.houseKeeperId);
            contactIds.add(pu.attendantId);
            contactIds.add(pu.firstAiderId);
        });

        const accounts = this.accounts.filter(a => accountIds.has(a.id) && a.isChanged);
        const contacts = this.contacts.filter(c => contactIds.has(c.id) && c.isChanged);

        return {
            accounts,
            contacts,
            properties,
            propertyUnits
        }
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
            if (!e.name) errorObj.elevatorErrors.push({ message: 'Name ist erforderlich', field: 'name' });
            if (!e.propertyId) errorObj.elevatorErrors.push({ message: 'Liegenschaft ist erforderlich', field: 'propertyId' });
            if (!e.propertyUnitId) errorObj.elevatorErrors.push({ message: 'Verwaltungseinheit ist erforderlich', field: 'propertyUnitId' });

            // Order fields
            if (!e.benefitReceiverId) errorObj.orderErrors.push({ message: 'Leistungsempfänger ist erforderlich', field: 'benefitReceiverId' });
            if (!e.invoiceReceiverId) errorObj.orderErrors.push({ message: 'Rechnungsempfänger ist erforderlich', field: 'invoiceReceiverId' });

            // Product assignment
            if (!e.productAssignments || e.productAssignments.length === 0) {
                errorObj.orderErrors.push({ message: 'Produkt ist nicht zugewiesen', field: 'productAssignments' });
            }

            // Property errors — find related property
            const property = this.properties.find(p => p.id === e.propertyId);
            if (property) {
                if (!property.propertyOwnerId) {
                    errorObj.propertyErrors.push({ message: 'Eigentümer ist erforderlich', field: 'propertyOwnerId' });
                }
            }

            // Property Unit errors — find related property unit
            const propertyUnit = this.propertyUnits.find(pu => pu.id === e.propertyUnitId);
            if (propertyUnit) {
                if (!propertyUnit.operatorId) {
                    errorObj.propertyUnitErrors.push({ message: 'Betreiber ist erforderlich', field: 'operatorId' });
                }
                if (!propertyUnit.propertyManagerId) {
                    errorObj.propertyUnitErrors.push({ message: 'Objektbetreuer ist erforderlich', field: 'propertyManagerId' });
                }
                if (!propertyUnit.houseKeeperId) {
                    errorObj.propertyUnitErrors.push({ message: 'Hausmeister ist erforderlich', field: 'houseKeeperId' });
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

    isAnyRelatedChanged(elevator) {
        let property = this.properties.find(p => p.id === elevator.propertyId);
        let propertyUnit = this.propertyUnits.find(pu => pu.id === elevator.propertyUnitId);

        return this.properties.some(p => p.id === elevator.propertyId && p.isChanged) ||
            this.propertyUnits.some(pu => pu.id === elevator.propertyUnitId && pu.isChanged) ||
            this.accounts.some(a => a.id === elevator.benefitReceiverId && a.isChanged) ||
            this.accounts.some(a => a.id === elevator.invoiceReceiverId && a.isChanged) ||
            this.accounts.some(a => a.id === property.propertyOwnerId && a.isChanged) ||
            this.accounts.some(a => a.id === property.assetManagerId && a.isChanged) ||
            this.accounts.some(a => a.id === propertyUnit.pmId && a.isChanged) ||
            this.accounts.some(a => a.id === propertyUnit.fmId && a.isChanged) ||
            this.accounts.some(a => a.id === propertyUnit.hvId && a.isChanged) ||
            this.accounts.some(a => a.id === propertyUnit.operatorId && a.isChanged) ||
            this.contacts.some(c => c.id === property.propertyOwnerContactId && c.isChanged) ||
            this.contacts.some(c => c.id === property.assetManagerContactId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.pmContactId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.fmContactId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.hvContactId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.operatorContactId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.propertyManagerId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.houseKeeperId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.attendantId && c.isChanged) ||
            this.contacts.some(c => c.id === propertyUnit.firstAiderId && c.isChanged);
    }

    // ! Publish
    async handlePublish() {
        this.isLoading = true;
        this.validationErrors = this.validateData();
    
        this.showValidationModal = this.validationErrors.length > 0;
    
        const failedElevatorIds = new Set(this.validationErrors.map(err => err.id));
    
        this.elevators = this.elevators.map(elevator => ({
            ...elevator,
            isChanged: this.isAnyRelatedChanged(elevator),
            className: failedElevatorIds.has(elevator.id) ? 'tab failed-tab' : this.selectedElevator.id == elevator.id ? 'tab active-tab' : 'tab'
        }));

        if (this.validationErrors.length == 0) {
            try {
                const data = {
                    elevators: this.elevators.filter(e => e.isChanged),
                    orders: this.orders.filter(o => o.isChanged),
                    ...this.prepareFinalData()
                }
                console.log('context', JSON.stringify(this.context));
                console.log('data', JSON.stringify(data));
                const result = await publishOnboardingData(data, this.context);
                console.log('result', result);
                this.triggerToast('Success', 'Daten erfolgreich veröffentlicht', 'success');
                this.fetchOnboardingData();
            } catch (error) {
                this.isLoading = false;
                console.error('Error publishing data', error);
                this.triggerToast('Error', error.message || error.body?.message || 'Failed to publish data', 'error');
            }
        } else {
            this.isLoading = false;
        }
    }
    

    
    // ! Validation Modal actions
    handleValidationModalCancel() {
        this.showValidationModal = false;
    }



    // ! Sign out
    handleSignOut() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expiry');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_user_id');
        localStorage.removeItem('auth_name');
        localStorage.removeItem('auth_company');
    
        const currentUrl = encodeURIComponent(window.location.href);
        const loginUrl = `${this.loginUrl}?redirectUrl=${currentUrl}`;
        window.location.href = loginUrl;
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