public with sharing class OnboardingController {
    



    public static OnboardingData getOnboardingData(String contractId, String userId) {

        // 1️⃣ Initialize maps
        Map<String, Elevator> elevatorMap = new Map<String, Elevator>();
        Map<String, Property> propertyMap = new Map<String, Property>();
        Map<String, PropertyUnit> propertyUnitMap = new Map<String, PropertyUnit>();
        Map<String, AccountData> accountMap = new Map<String, AccountData>();
        Map<String, ContactData> contactMap = new Map<String, ContactData>();
        Map<String, OrderData> orderDataMap = new Map<String, OrderData>();
        
        // 2️⃣ Load Orders
        for (Order o : [
            SELECT Id, Is_Recurring__c, Payment_Interval__c, Description, Mode_of_Payment__c, Customer_Order_Number__c
            FROM Order WHERE ContractId = :contractId
        ]) {
            OrderData od = new OrderData(o.Id);
            od.isRecurring = o.Is_Recurring__c;
            od.paymentInterval = o.Payment_Interval__c;
            od.comment = o.Description;
            od.modeOfPayment = o.Mode_of_Payment__c;
            od.customerOrderNumber = o.Customer_Order_Number__c;
            orderDataMap.put(o.Id, od);
        }
    
        // Sets to collect External IDs
        Set<String> propertyExtIds = new Set<String>();
        Set<String> propertyUnitExtIds = new Set<String>();
        Set<String> accountExtIds = new Set<String>();
        Set<String> contactExtIds = new Set<String>();
    
        // 3️⃣ Load Elevator Staging
        for (Elevator_Staging__c record : [
            SELECT Id, Details__c, Status__c, Elevator__c, External_ID__c
            FROM Elevator_Staging__c
            WHERE Contract__c = :contractId
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                Elevator elevator = new Elevator(record);
                if (!String.isEmpty(elevator.id) && !elevatorMap.containsKey(elevator.id)) {
                    elevatorMap.put(elevator.id, elevator);
                }
    
                // collect Property + PropertyUnit
                if (!String.isEmpty(elevator.propertyId)) propertyExtIds.add(elevator.propertyId);
                if (!String.isEmpty(elevator.propertyUnitId)) propertyUnitExtIds.add(elevator.propertyUnitId);
    
                // collect Accounts
                if (!String.isEmpty(elevator.benefitReceiverId)) accountExtIds.add(elevator.benefitReceiverId);
                if (!String.isEmpty(elevator.invoiceReceiverId)) accountExtIds.add(elevator.invoiceReceiverId);
            }
        }
    
        // 4️⃣ Load Property Staging
        for (Property_Staging__c record : [
            SELECT Id, Details__c, External_ID__c, Property__c
            FROM Property_Staging__c
            WHERE External_ID__c IN :propertyExtIds
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                Property property = new Property(record);
                if (!String.isEmpty(property.id) && !propertyMap.containsKey(property.id)) {
                    propertyMap.put(property.id, property);
                }
    
                // collect account + contact
                if (!String.isEmpty(property.propertyOwnerId)) accountExtIds.add(property.propertyOwnerId);
                if (!String.isEmpty(property.assetManagerId)) accountExtIds.add(property.assetManagerId);
    
                if (!String.isEmpty(property.propertyOwnerContactId)) contactExtIds.add(property.propertyOwnerContactId);
                if (!String.isEmpty(property.assetManagerContactId)) contactExtIds.add(property.assetManagerContactId);
            }
        }
    
        // 5️⃣ Load Property Unit Staging
        for (Property_Unit_Staging__c record : [
            SELECT Id, Details__c, External_ID__c, Property_Unit__c
            FROM Property_Unit_Staging__c
            WHERE External_ID__c IN :propertyUnitExtIds
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                PropertyUnit propertyUnit = new PropertyUnit(record);
                if (!String.isEmpty(propertyUnit.id) && !propertyUnitMap.containsKey(propertyUnit.id)) {
                    propertyUnitMap.put(propertyUnit.id, propertyUnit);
                }
    
                // collect accounts
                if (!String.isEmpty(propertyUnit.pmId)) accountExtIds.add(propertyUnit.pmId);
                if (!String.isEmpty(propertyUnit.fmId)) accountExtIds.add(propertyUnit.fmId);
                if (!String.isEmpty(propertyUnit.hvId)) accountExtIds.add(propertyUnit.hvId);
                if (!String.isEmpty(propertyUnit.operatorId)) accountExtIds.add(propertyUnit.operatorId);
    
                // collect contacts
                if (!String.isEmpty(propertyUnit.pmContactId)) contactExtIds.add(propertyUnit.pmContactId);
                if (!String.isEmpty(propertyUnit.fmContactId)) contactExtIds.add(propertyUnit.fmContactId);
                if (!String.isEmpty(propertyUnit.hvContactId)) contactExtIds.add(propertyUnit.hvContactId);
                if (!String.isEmpty(propertyUnit.operatorContactId)) contactExtIds.add(propertyUnit.operatorContactId);
                if (!String.isEmpty(propertyUnit.propertyManagerId)) contactExtIds.add(propertyUnit.propertyManagerId);
                if (!String.isEmpty(propertyUnit.houseKeeperId)) contactExtIds.add(propertyUnit.houseKeeperId);
                if (!String.isEmpty(propertyUnit.attendantId)) contactExtIds.add(propertyUnit.attendantId);
                if (!String.isEmpty(propertyUnit.firstAiderId)) contactExtIds.add(propertyUnit.firstAiderId);
            }
        }
    
        // 6️⃣ Load Account Staging
        if (!accountExtIds.isEmpty()) {
            for (Account_Staging__c record : [
                SELECT Id, Details__c, External_ID__c, Account__c
                FROM Account_Staging__c
                WHERE External_ID__c IN :accountExtIds
            ]) {
                if (!String.isEmpty(record.Details__c)) {
                    AccountData account = new AccountData(record);
                    if (!String.isEmpty(account.id) && !accountMap.containsKey(account.id)) {
                        accountMap.put(account.id, account);
                    }
                }
            }
        }
    
        // 7️⃣ Load Contact Staging
        if (!contactExtIds.isEmpty()) {
            for (Contact_Staging__c record : [
                SELECT Id, Details__c, External_ID__c, Contact__c
                FROM Contact_Staging__c
                WHERE External_ID__c IN :contactExtIds
            ]) {
                if (!String.isEmpty(record.Details__c)) {
                    ContactData contact = new ContactData(record);
                    if (!String.isEmpty(contact.id) && !contactMap.containsKey(contact.id)) {
                        contactMap.put(contact.id, contact);
                    }
                }
            }
        }
    
        // 8️⃣ Load Order Staging (merge with Orders)
        for (Order_Staging__c record : [
            SELECT Id, Details__c, Order__c, External_ID__c
            FROM Order_Staging__c
            WHERE Contract__c = :contractId
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                OrderData stagedOrder = new OrderData(record);
                if (!String.isEmpty(stagedOrder.id)) {
                    if (orderDataMap.containsKey(stagedOrder.id)) {
                        // update existing OrderData
                        OrderData existing = orderDataMap.get(stagedOrder.id);
                        existing.modeOfPayment = stagedOrder.modeOfPayment;
                        existing.paymentInterval = stagedOrder.paymentInterval;
                        existing.customerOrderNumber = stagedOrder.customerOrderNumber;
                        existing.comment = stagedOrder.comment;
                    } else {
                        // if new order
                        orderDataMap.put(stagedOrder.id, stagedOrder);
                    }
                }
            }
        }
    
        // 9️⃣ Build final result
        OnboardingData result = new OnboardingData();
        result.elevators.addAll(elevatorMap.values());
        result.accounts.addAll(accountMap.values());
        result.contacts.addAll(contactMap.values());
        result.properties.addAll(propertyMap.values());
        result.propertyUnits.addAll(propertyUnitMap.values());
        result.orders.addAll(orderDataMap.values());
    
        return result;
    }


    public static void saveOnboardingData(String contractId, String userId, OnboardingData data) {
        // --- Elevators ---
        List<Elevator_Staging__c> elevatorStagingList = new List<Elevator_Staging__c>();
        for (OnboardingController.Elevator e : data.elevators) {
            Elevator_Staging__c staging = new Elevator_Staging__c();
            staging.Details__c = JSON.serialize(e);
            staging.Elevator_Name__c = e.name;
            staging.External_ID__c = e.id;
            staging.External_User__c = userId;
            staging.Contract__c = contractId;
            staging.Status__c = 'Submitted';
            elevatorStagingList.add(staging);
        }
        if (!elevatorStagingList.isEmpty()) {
            Database.upsert(elevatorStagingList, Elevator_Staging__c.External_ID__c, true);
        }

        // --- Properties ---
        List<Property_Staging__c> propertyStagingList = new List<Property_Staging__c>();
        for (OnboardingController.Property p : data.properties) {
            Property_Staging__c staging = new Property_Staging__c();
            staging.Details__c = JSON.serialize(p);
            staging.External_ID__c = p.id;
            staging.Status__c = 'Submitted';
            propertyStagingList.add(staging);
        }
        if (!propertyStagingList.isEmpty()) {
            Database.upsert(propertyStagingList, Property_Staging__c.External_ID__c, true);
        }

        // --- Property Units ---
        List<Property_Unit_Staging__c> propertyUnitStagingList = new List<Property_Unit_Staging__c>();
        for (OnboardingController.PropertyUnit pu : data.propertyUnits) {
            Property_Unit_Staging__c staging = new Property_Unit_Staging__c();
            staging.Details__c = JSON.serialize(pu);
            staging.External_ID__c = pu.id;
            staging.Status__c = 'Submitted';
            propertyUnitStagingList.add(staging);
        }
        if (!propertyUnitStagingList.isEmpty()) {
            Database.upsert(propertyUnitStagingList, Property_Unit_Staging__c.External_ID__c, true);
        }

        // --- Accounts ---
        List<Account_Staging__c> accountStagingList = new List<Account_Staging__c>();
        for (OnboardingController.AccountData a : data.accounts) {
            Account_Staging__c staging = new Account_Staging__c();
            staging.Details__c = JSON.serialize(a);
            staging.External_ID__c = a.id;
            staging.Status__c = 'Submitted';
            accountStagingList.add(staging);
        }
        if (!accountStagingList.isEmpty()) {
            Database.upsert(accountStagingList, Account_Staging__c.External_ID__c, true);
        }

        // --- Contacts ---
        List<Contact_Staging__c> contactStagingList = new List<Contact_Staging__c>();
        for (OnboardingController.ContactData c : data.contacts) {
            Contact_Staging__c staging = new Contact_Staging__c();
            staging.Details__c = JSON.serialize(c);
            staging.External_ID__c = c.id;
            staging.Status__c = 'Submitted';
            contactStagingList.add(staging);
        }
        if (!contactStagingList.isEmpty()) {
            Database.upsert(contactStagingList, Contact_Staging__c.External_ID__c, true);
        }

        // --- Orders ---
        List<Order_Staging__c> orderStagingList = new List<Order_Staging__c>();
        for (OnboardingController.OrderData o : data.orders) {
            Order_Staging__c staging = new Order_Staging__c();

            OnboardingController.OrderData orderWithoutItems = new OnboardingController.OrderData(o.id);
            orderWithoutItems.modeOfPayment = o.modeOfPayment;
            orderWithoutItems.paymentInterval = o.paymentInterval;
            orderWithoutItems.customerOrderNumber = o.customerOrderNumber;
            orderWithoutItems.comment = o.comment;

            staging.Details__c = JSON.serialize(orderWithoutItems);
            staging.External_ID__c = o.id;
            staging.Status__c = 'Submitted';
            staging.Order__c = o.id;
            staging.Contract__c = contractId;
            orderStagingList.add(staging);
        }
        if (!orderStagingList.isEmpty()) {
            Database.upsert(orderStagingList, Order_Staging__c.External_ID__c, true);
        }
    }
    
    public static OnboardingData handleCsvUpload(String body) {
        Map<String, Object> csvData = 
            (Map<String, Object>) JSON.deserializeUntyped(body);
    
        List<Object> data = (List<Object>) csvData.get('data');
    
        Map<String, String> headerToFieldPath = new Map<String, String>();
        for (Elevator_Import_Setting__mdt setting : [
            SELECT Column_Name__c, Field_Path__c 
            FROM Elevator_Import_Setting__mdt
        ]) {
            headerToFieldPath.put(setting.Column_Name__c, setting.Field_Path__c);
        }
    
        OnboardingData result = new OnboardingData();
    
        Set<String> elevatorNames = new Set<String>();
        Set<String> propertyNames = new Set<String>();
        Set<String> propertyUnitKeys = new Set<String>();
        Set<String> contactKeys = new Set<String>();
        Set<String> accountNames = new Set<String>();
        Set<String> orderComments = new Set<String>();

        for (Object row : data) {
            Map<String, Object> rowMap = (Map<String, Object>) row;
    
            Elevator elevator;
            Property property;
            PropertyUnit propertyUnit;
            OrderData order;
            ContactData propertyManager;
            ContactData houseKeeper;
            AccountData operator;
            AccountData invoiceReceiver;
            AccountData benefitReceiver;
    
            String elevatorName = null;
            String propertyName = null;
            String propertyUnitStreet = null;
            String propertyUnitPostalCode = null;
    
            String propertyManagerFirstName = null;
            String propertyManagerLastName = null;
    
            String houseKeeperFirstName = null;
            String houseKeeperLastName = null;
    
            String operatorName = null;
            String invoiceReceiverName = null;
            String benefitReceiverName = null;

            String orderComment = null;
    
            for (String header : rowMap.keySet()) {
                String fieldPath = headerToFieldPath.get(header);
                Object value = rowMap.get(header);
                if (fieldPath == null) continue;
    
                List<String> fieldPathParts = fieldPath.split('\\.');
                String objectName = fieldPathParts[0];
                String fieldName = fieldPathParts[1];
                
                if (objectName == 'elevator') {
                    if (elevator == null) elevator = new Elevator();
                    if (fieldName == 'name') {
                        elevator.name = (String) value;
                        elevatorName = elevator.name;
                    }
                } else if (objectName == 'property') {
                    if (property == null) property = new Property();
                    if (fieldName == 'name') {
                        property.name = (String) value;
                        propertyName = property.name;
                    }
                } else if (objectName == 'propertyUnit') {
                    if (propertyUnit == null) propertyUnit = new PropertyUnit();
                    if (propertyUnit.address == null) propertyUnit.address = new Address();
    
                    if (fieldName == 'street') {
                        propertyUnit.address.street = (String) value;
                        propertyUnitStreet = propertyUnit.address.street;
                    } else if (fieldName == 'postalCode') {
                        propertyUnit.address.postalCode = (String) value;
                        propertyUnitPostalCode = propertyUnit.address.postalCode;
                    } else if (fieldName == 'city') {
                        propertyUnit.address.city = (String) value;
                    }
                } else if (objectName == 'order') {
                    if (order == null) order = new OrderData();
                    if (fieldName == 'comment') {
                        order.comment = (String) value;
                        orderComment = order.comment;
                    }
                } else if (objectName == 'propertyManager') {
                    if (propertyManager == null) propertyManager = new ContactData();
    
                    if (fieldName == 'firstName') {
                        propertyManager.firstName = (String) value;
                        propertyManagerFirstName = propertyManager.firstName;
                    } else if (fieldName == 'lastName') {
                        propertyManager.lastName = (String) value;
                        propertyManagerLastName = propertyManager.lastName;
                    } else if (fieldName == 'phone') {
                        propertyManager.phone = (String) value;
                    } else if (fieldName == 'salutation') {
                        propertyManager.salutation = (String) value;
                    }
                } else if (objectName == 'houseKeeper') {
                    if (houseKeeper == null) houseKeeper = new ContactData();
    
                    if (fieldName == 'firstName') {
                        houseKeeper.firstName = (String) value;
                        houseKeeperFirstName = houseKeeper.firstName;
                    } else if (fieldName == 'lastName') {
                        houseKeeper.lastName = (String) value;
                        houseKeeperLastName = houseKeeper.lastName;
                    } else if (fieldName == 'phone') {
                        houseKeeper.phone = (String) value;
                    } else if (fieldName == 'salutation') {
                        houseKeeper.salutation = (String) value;
                    }
                } else if (objectName == 'operator') {
                    if (operator == null) operator = new AccountData();
                    if (operator.address == null) operator.address = new Address();
    
                    if (fieldName == 'name') {
                        operator.name = (String) value;
                        operatorName = operator.name;
                    } else if (fieldName == 'street') {
                        operator.address.street = (String) value;
                    } else if (fieldName == 'city') {
                        operator.address.city = (String) value;
                    } else if (fieldName == 'postalCode') {
                        operator.address.postalCode = (String) value;
                    }
                } else if (objectName == 'invoiceReceiver') {
                    if (invoiceReceiver == null) invoiceReceiver = new AccountData();
                    if (invoiceReceiver.address == null) invoiceReceiver.address = new Address();
    
                    if (fieldName == 'name') {
                        invoiceReceiver.name = (String) value;
                        invoiceReceiverName = invoiceReceiver.name;
                    } else if (fieldName == 'street') {
                        invoiceReceiver.address.street = (String) value;
                    } else if (fieldName == 'city') {
                        invoiceReceiver.address.city = (String) value;
                    } else if (fieldName == 'postalCode') {
                        invoiceReceiver.address.postalCode = (String) value;
                    } else if (fieldName == 'email') {
                        invoiceReceiver.email = (String) value;
                    }
                } else if (objectName == 'benefitReceiver') {
                    if (benefitReceiver == null) benefitReceiver = new AccountData();
                    if (benefitReceiver.address == null) benefitReceiver.address = new Address();
    
                    if (fieldName == 'name') {
                        benefitReceiver.name = (String) value;
                        benefitReceiverName = benefitReceiver.name;
                    } else if (fieldName == 'street') {
                        benefitReceiver.address.street = (String) value;
                    } else if (fieldName == 'city') {
                        benefitReceiver.address.city = (String) value;
                    } else if (fieldName == 'postalCode') {
                        benefitReceiver.address.postalCode = (String) value;
                    }
                }
            }

            if (property != null && !String.isBlank(propertyName) && !propertyNames.contains(propertyName)) {
                result.properties.add(property);
                propertyNames.add(propertyName);
            }

            if (operator != null && !String.isBlank(operatorName) && !accountNames.contains(operatorName)) {
                result.accounts.add(operator);
                accountNames.add(operatorName);
            }

            if (propertyManager != null && !String.isBlank(propertyManagerFirstName) && !String.isBlank(propertyManagerLastName)) {
                String key = propertyManagerFirstName + '|' + propertyManagerLastName;
                if (!contactKeys.contains(key)) {
                    result.contacts.add(propertyManager);
                    contactKeys.add(key);
                }
            }
            if (houseKeeper != null && !String.isBlank(houseKeeperFirstName) && !String.isBlank(houseKeeperLastName)) {
                String key = houseKeeperFirstName + '|' + houseKeeperLastName;
                if (!contactKeys.contains(key)) {
                    result.contacts.add(houseKeeper);
                    contactKeys.add(key);
                }
            }

            if (propertyUnit != null && !String.isBlank(propertyUnitStreet) && !String.isBlank(propertyUnitPostalCode)) {
                String key = propertyUnitStreet + '|' + propertyUnitPostalCode;
                if (!propertyUnitKeys.contains(key)) {
                    propertyUnit.propertyId = property != null ? property.id : null;
                    propertyUnit.operatorId = operator != null ? operator.id : null;
                    propertyUnit.propertyManagerId = propertyManager != null ? propertyManager.id : null;
                    propertyUnit.houseKeeperId = houseKeeper != null ? houseKeeper.id : null;
                    result.propertyUnits.add(propertyUnit);
                    propertyUnitKeys.add(key);
                }
            }

            if (invoiceReceiver != null && !String.isBlank(invoiceReceiverName) && !accountNames.contains(invoiceReceiverName)) {
                result.accounts.add(invoiceReceiver);
                accountNames.add(invoiceReceiverName);
            }
            if (benefitReceiver != null && !String.isBlank(benefitReceiverName) && !accountNames.contains(benefitReceiverName)) {
                result.accounts.add(benefitReceiver);
                accountNames.add(benefitReceiverName);
            }

    
            if (elevator != null && !String.isBlank(elevatorName) && !elevatorNames.contains(elevatorName)) {
                elevator.propertyUnitId = propertyUnit != null ? propertyUnit.id : null;
                elevator.propertyId = property != null ? property.id : null;
                elevator.benefitReceiverId = benefitReceiver != null ? benefitReceiver.id : null;
                elevator.invoiceReceiverId = invoiceReceiver != null ? invoiceReceiver.id : null;
                result.elevators.add(elevator);
                elevatorNames.add(elevatorName);
            }

            
            if (order != null && !String.isBlank(orderComment) && !orderComments.contains(orderComment)) {
                result.orders.add(order);
                orderComments.add(orderComment);
            }
        }
    
        return result;
    }
    
    
    public static String generateUniqueId() {
        final String chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
        String randStr = '';
        
        while (randStr.length() < 12) {
            Integer idx = Math.mod(Math.abs(Crypto.getRandomInteger()), chars.length());
            randStr += chars.substring(idx, idx + 1);
        }
        
        return randStr;
    }
    



    public class OnboardingData {
        public List<Elevator> elevators = new List<Elevator>();
        public List<AccountData> accounts = new List<AccountData>();
        public List<ContactData> contacts = new List<ContactData>();
        public List<Property> properties = new List<Property>();
        public List<PropertyUnit> propertyUnits = new List<PropertyUnit>();
        public List<OrderData> orders = new List<OrderData>();
    }



    public class ProductAssignment {
        public String productId;
        public String status;
    }

    public class Elevator {
        public String id;
        public String name;
        public String status;
        public String propertyUnitId;
        public String propertyId;

        public String benefitReceiverId;
        public String invoiceReceiverId;

        public List<ProductAssignment> productAssignments;

        public Boolean isChanged;
        public Boolean isDeleted;
        public Boolean isNew;

        public Elevator() {
            this.id = generateUniqueId();
            this.isNew = true;
            this.isChanged = true;
        }

        public Elevator(Elevator_Staging__c record) {
            Elevator elevatorObj = (Elevator)JSON.deserialize(record.Details__c, Elevator.class);
            this.id = record.External_ID__c;
            this.name = elevatorObj.name;
            this.status = record.Status__c;
            this.propertyUnitId = elevatorObj.propertyUnitId;
            this.propertyId = elevatorObj.propertyId;
            this.benefitReceiverId = elevatorObj.benefitReceiverId;
            this.invoiceReceiverId = elevatorObj.invoiceReceiverId;
            this.productAssignments = elevatorObj.productAssignments;
            this.isChanged = false;
            this.isDeleted = false;
            this.isNew = false;

        }
    }

    public class Property {
        public String id;
        public String name;
        public Address address;
        public String businessUnit;
        public String propertyOwnerId;
        public String propertyOwnerContactId;
        public String assetManagerId;
        public String assetManagerContactId;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
        public Boolean isDeleted;

        public Property() {
            this.id = generateUniqueId();
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
        }

        public Property(Property_Staging__c record) {
            Property propertyObj = (Property)JSON.deserialize(record.Details__c, Property.class);
            this.name = propertyObj.name;
            this.id = record.External_ID__c;
            this.address = propertyObj.address;
            this.businessUnit = propertyObj.businessUnit;
            this.propertyOwnerId = propertyObj.propertyOwnerId;
            this.propertyOwnerContactId = propertyObj.propertyOwnerContactId;
            this.assetManagerId = propertyObj.assetManagerId;
            this.assetManagerContactId = propertyObj.assetManagerContactId;
            this.isChanged = false;
            this.completed = propertyObj.completed;
            this.isNew = false;
            this.isDeleted = false;
        }
    }

    public class PropertyUnit {
        public String id;
        public String propertyType;
        public Address address;

        public String propertyId;
        public String pmId;
        public String pmContactId;
        public String fmId;
        public String fmContactId;
        public String hvId;
        public String hvContactId;
        public String operatorId;
        public String operatorContactId;

        public String propertyManagerId;
        public String houseKeeperId;
        public String attendantId;
        public String firstAiderId;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
        public Boolean isDeleted;

        public PropertyUnit() {
            this.id = generateUniqueId();
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
        }

        public PropertyUnit(Property_Unit_Staging__c record) {
            PropertyUnit propertyUnitObj = (PropertyUnit) JSON.deserialize(record.Details__c, PropertyUnit.class);
            this.id = record.External_ID__c;
            this.propertyType = propertyUnitObj.propertyType;
            this.address = propertyUnitObj.address;
            this.propertyId = propertyUnitObj.propertyId;

            this.pmId = propertyUnitObj.pmId;
            this.pmContactId = propertyUnitObj.pmContactId;
            this.fmId = propertyUnitObj.fmId;
            this.fmContactId = propertyUnitObj.fmContactId;
            this.hvId = propertyUnitObj.hvId;
            this.hvContactId = propertyUnitObj.hvContactId;
            this.operatorId = propertyUnitObj.operatorId;
            this.operatorContactId = propertyUnitObj.operatorContactId;

            this.propertyManagerId = propertyUnitObj.propertyManagerId;
            this.houseKeeperId = propertyUnitObj.houseKeeperId;
            this.attendantId = propertyUnitObj.attendantId;
            this.firstAiderId = propertyUnitObj.firstAiderId;

            this.isChanged = false;
            this.completed = propertyUnitObj.completed;
            this.isNew = false;
        }
    }

    public class AccountData {
        public String id;
        public String name;
        public String email;
        public String type;
        public Address address;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
        public Boolean isDeleted;

        public AccountData() {
            this.id = generateUniqueId();
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
        }

        public AccountData(Account_Staging__c record) {
            AccountData accountObj = (AccountData) JSON.deserialize(record.Details__c, AccountData.class);
            this.id = record.External_ID__c;
            this.name = accountObj.name;
            this.email = accountObj.email;
            this.type = accountObj.type;
            this.address = accountObj.address;
            this.isChanged = false;
            this.completed = accountObj.completed;
            this.isNew = false;
            this.isDeleted = accountObj.isDeleted;
        }
    }

    public class ContactData {
        public String id;
        public String firstName;
        public String lastName;
        public String salutation;
        public String title;
        public String email;
        public String phone;
        public String accountId;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
        public Boolean isDeleted;

        public ContactData() {
            this.id = generateUniqueId();
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
        }

        public ContactData(Contact_Staging__c record) {
            ContactData contactObj = (ContactData) JSON.deserialize(record.Details__c, ContactData.class);
            this.id = record.External_ID__c;
            this.firstName = contactObj.firstName;
            this.lastName = contactObj.lastName;
            this.salutation = contactObj.salutation;
            this.title = contactObj.title;
            this.email = contactObj.email;
            this.phone = contactObj.phone;
            this.accountId = contactObj.accountId;
            this.isChanged = false;
            this.completed = contactObj.completed;
            this.isNew = false;
            this.isDeleted = contactObj.isDeleted;
        }
    }

    public class OrderData {
        public String id;
        public String modeOfPayment;
        public String paymentInterval;
        public String customerOrderNumber;
        public Boolean isRecurring;
        public String comment;
        public List<OrderItemData> orderItems; 

        public Boolean isChanged;

        public OrderData() {}

        public OrderData(Id orderId) {
            this.id = orderId;
            this.isChanged = false;
            this.orderItems = new List<OrderItemData>();

            for (OrderItem oi : [
                SELECT Id, Product2Id, Product2.ProductCode, Product2.Name
                FROM OrderItem
                WHERE OrderId = :orderId
            ]) {
                OrderItemData oid = new OrderItemData();
                oid.id = oi.Id;
                oid.productId = oi.Product2Id;
                oid.productCode = oi.Product2 != null ? oi.Product2.ProductCode : null;
                oid.productName = oi.Product2 != null ? oi.Product2.Name : null;
                this.orderItems.add(oid);
            }
        }

        public OrderData(Order_Staging__c record) {
            OrderData orderDataObj = (OrderData)JSON.deserialize(record.Details__c, OrderData.class);
            this.id = record.External_ID__c;
            this.modeOfPayment = orderDataObj.modeOfPayment;
            this.paymentInterval = orderDataObj.paymentInterval;
            this.customerOrderNumber = orderDataObj.customerOrderNumber;
            this.comment = orderDataObj.comment;

            this.isChanged = false;
        }
    }

    public class OrderItemData {
        public String id;
        public String productId;
        public String productName;
        public String productCode;
    }


    public class Address {
        public String street;
        public String city;
        public String postalCode;
        public String country;

        public Address() {}
    }

}