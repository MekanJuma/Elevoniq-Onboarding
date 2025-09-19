public without sharing class OnboardingController {


    @AuraEnabled
    public static OnboardingData getOnboardingData(String contractId) {

        // 1️⃣ Initialize maps
        Map<String, Elevator> elevatorMap = new Map<String, Elevator>();
        Map<String, Property> propertyMap = new Map<String, Property>();
        Map<String, PropertyUnit> propertyUnitMap = new Map<String, PropertyUnit>();
        Map<String, AccountData> accountMap = new Map<String, AccountData>();
        Map<String, ContactData> contactMap = new Map<String, ContactData>();
        Map<String, OrderData> orderDataMap = new Map<String, OrderData>();
        String contractName;
        
        // 2️⃣ Load Orders
        for (Order o : [
            SELECT Id, Is_Recurring__c, Payment_Interval__c, Description, Mode_of_Payment__c, Customer_Order_Number__c, Contract.Name
            FROM Order WHERE ContractId = :contractId
        ]) {
            if (contractName == null) contractName = o.Contract.Name;

            OrderData od = new OrderData(o.Id);
            od.isRecurring = o.Is_Recurring__c;
            od.comment = o.Description;
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
            SELECT Id, Details__c, Previous_Details__c, Status__c, Elevator__c, External_ID__c
            FROM Elevator_Staging__c
            WHERE Contract__c = :contractId
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                Elevator elevator = new Elevator(record);
                if (elevator.isDeleted) continue;

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
            SELECT Id, Details__c, Previous_Details__c, External_ID__c, Property__c
            FROM Property_Staging__c
            WHERE External_ID__c IN :propertyExtIds OR Property__c IN :propertyExtIds
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
            SELECT Id, Details__c, Previous_Details__c, External_ID__c, Property_Unit__c
            FROM Property_Unit_Staging__c
            WHERE External_ID__c IN :propertyUnitExtIds OR Property_Unit__c IN :propertyUnitExtIds
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
                SELECT Id, Details__c, Previous_Details__c, External_ID__c, Account__c
                FROM Account_Staging__c
                WHERE External_ID__c IN :accountExtIds OR Account__c IN :accountExtIds
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
                SELECT Id, Details__c, Previous_Details__c, External_ID__c, Contact__c
                FROM Contact_Staging__c
                WHERE External_ID__c IN :contactExtIds OR Contact__c IN :contactExtIds
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
            SELECT Id, Details__c, Previous_Details__c, Order__c, External_ID__c
            FROM Order_Staging__c
            WHERE Contract__c = :contractId
        ]) {
            if (!String.isEmpty(record.Details__c)) {
                OrderData stagedOrder = new OrderData(record);
                if (!String.isEmpty(stagedOrder.id)) {
                    if (orderDataMap.containsKey(stagedOrder.id)) {
                        // update existing OrderData
                        OrderData existing = orderDataMap.get(stagedOrder.id);
                        existing.customerOrderNumber = stagedOrder.customerOrderNumber;
                        existing.comment = stagedOrder.comment;
                        existing.previousObject = stagedOrder.previousObject;
                        orderDataMap.put(stagedOrder.id, existing);
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
        result.contractName = contractName;
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<ContactSearchResult> searchContacts(String searchTerm) {
        if (String.isBlank(searchTerm) || searchTerm.length() < 2) {
            return new List<ContactSearchResult>();
        }

        List<Contact> contacts = [
            SELECT Id, FirstName, LastName, Email
            FROM Contact
            WHERE (FirstName LIKE :('%' + searchTerm + '%') OR LastName LIKE :('%' + searchTerm + '%'))
            AND Email != null
            LIMIT 10
        ];

        List<ContactSearchResult> results = new List<ContactSearchResult>();
        for (Contact c : contacts) {
            results.add(new ContactSearchResult(
                c.Id,
                (c.FirstName != null ? c.FirstName + ' ' : '') + c.LastName,
                c.Email
            ));
        }

        return results;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String,Object>> fetchLookupRecords(String objectApiName, String fields, String searchKey) {
        try {
            List<Map<String, Object>> results = new List<Map<String, Object>>();
            if (String.isNotBlank(searchKey)) {
                // prepare search term
                String likePattern = '%' + String.escapeSingleQuotes(searchKey) + '%';
                
                String soql = 'SELECT ' + fields +
                ' FROM ' + objectApiName +
                ' WHERE Name LIKE :likePattern ' +
                ' ORDER BY LastModifiedDate DESC LIMIT 10';
                
                List<SObject> records = Database.query(soql);
                
                for (SObject rec : records) {
                    Map<String, Object> row = new Map<String, Object>();
                    for (String field : fields.split(',')) {
                        field = field.trim();
                        row.put(field, rec.get(field));
                    }
                    results.add(row);
                }
            }
            return results;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage() + '\n ' + e.getStackTraceString());
        }
    }


    @AuraEnabled
    public static string sendEmail(String contractId, Boolean fromCurrentUser, List<String> recipientIds) {
        try {
            EmailServiceUtil.EmailParams params = new EmailServiceUtil.EmailParams();

            params.recipientIds = recipientIds;
            params.templateId = getTemplateId('Start_Onboarding_Template');
            params.whatId = contractId;
            params.saveAsActivity = true;

            if (!fromCurrentUser) {
                params.orgWideEmailAddressId = getOrgWideEmailAddressId();
            }

            EmailServiceUtil.sendEmail(params);

            return 'Email sent successfully';

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    private static String getTemplateId(String templateName) {
        List<EmailTemplate> templates = [SELECT Id FROM EmailTemplate WHERE DeveloperName = :templateName];
        return templates.isEmpty() ? null : templates[0].Id;
    }

    private static String getOrgWideEmailAddressId() {
        List<OrgWideEmailAddress> addresses = [SELECT Id FROM OrgWideEmailAddress WHERE Address = 'support@elevoniq.de'];
        return addresses.isEmpty() ? null : addresses[0].Id;
    }
    
    @AuraEnabled
    public static String approveNewElevator(String contractId, String data) {
        Savepoint sp;
        try {
            sp = Database.setSavepoint();

            Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(data);
            if (payload == null) {
                throw new AuraHandledException('Invalid JSON payload.');
            }

            // ! Get Portfolio ID
            Id portfolioId = getPortfolioId(contractId);
            Id accountRecordTypeId = getAccountRecordTypeId();
            
            // ! Create Accounts
            Set<Account> accounts = new Set<Account>();
            Set<String> accountKeys = new Set<String>();
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'property', 'propertyOwner'));
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'property', 'assetManager'));
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'propertyUnit', 'pm'));
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'propertyUnit', 'fm'));
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'propertyUnit', 'hv'));
            addIfUnique(accounts, accountKeys, getAccountFromPayload(payload, accountRecordTypeId, 'propertyUnit', 'operator'));

            Account invoiceReceiver = getAccountFromPayload(payload, accountRecordTypeId, 'order', 'invoiceReceiver');
            if (invoiceReceiver == null || invoiceReceiver.Email__c == null || invoiceReceiver.BillingPostalCode == null) {
                throw new AuraHandledException('Invoice receiver email and address are required.');
            }
            addIfUnique(accounts, accountKeys, invoiceReceiver);

            Account benefitReceiver = getAccountFromPayload(payload, accountRecordTypeId, 'order', 'benefitReceiver');
            if (benefitReceiver == null || benefitReceiver.BillingPostalCode == null) {
                throw new AuraHandledException('Benefit receiver address is required.');
            }
            addIfUnique(accounts, accountKeys, benefitReceiver);

            // TODO: Upsert Accounts
            System.debug('accounts: ' + accounts);
            system.debug('owner: ' + getAccountFromPayload(payload, accountRecordTypeId, 'property', 'propertyOwner'));
            if (!accounts.isEmpty()) {
                Database.upsert(new List<Account>(accounts), Account.External_ID__c, true);
            }

            // ? Get Upserted Accounts
            Map<String, Account> upsertedAccounts = new Map<String, Account>();
            for (Account acc : [SELECT Id, Name, External_ID__c, BillingStreet, BillingCity, BillingPostalCode, Email__c, Phone FROM Account WHERE External_ID__c IN :accountKeys]) {
                upsertedAccounts.put(acc.External_ID__c, acc);
            }

            // TODO: Insert Invoice Receiver
            Invoice_Reciever__c invoiceReceiverCustom = getInvoiceReceiver(invoiceReceiver, upsertedAccounts);
            if (invoiceReceiverCustom != null && invoiceReceiverCustom.Id == null) {
                Database.insert(invoiceReceiverCustom, true);
            }
            
            Set<Contact> contacts = new Set<Contact>();
            Set<String> contactKeys = new Set<String>();
            // * Property Contacts
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'property', 'propertyOwnerContact'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'property', 'assetManagerContact'));

            // * Property Unit Contacts
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'pmContact'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'fmContact'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'hvContact'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'operatorContact'));

            // * Onsite Contacts
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'propertyManager'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'houseKeeper'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'attendant'));
            addIfUnique(contacts, contactKeys, getContactFromPayload(payload, 'propertyUnit', 'firstAider'));
            
            // TODO: Upsert Contacts
            if (!contacts.isEmpty()) {
                Database.upsert(new List<Contact>(contacts), Contact.External_ID__c, true);
            }

            // ? Get Upserted Contacts
            Map<String, Contact> upsertedContacts = new Map<String, Contact>();
            for (Contact con : [SELECT Id, External_ID__c, FirstName, LastName, Salutation, Title, Email, Phone FROM Contact WHERE External_ID__c IN :contactKeys]) {
                upsertedContacts.put(con.External_ID__c, con);
            }

            // TODO: Insert Property
            Property__c property = getPropertyFromPayload(payload, upsertedAccounts, upsertedContacts);
            if (property != null) {
                Database.upsert(property, Property__c.External_ID__c, true);
            }

            // TODO: Insert Property Unit
            Property_Unit__c propertyUnit = getPropertyUnitFromPayload(payload, upsertedAccounts, upsertedContacts, property);
            if (propertyUnit != null) {
                Database.upsert(propertyUnit, Property_Unit__c.External_ID__c, true);
            }

            // TODO: Insert Elevator
            Elevator__c elevator = getElevatorFromPayload(payload, portfolioId, propertyUnit);
            if (elevator != null) {
                Database.upsert(elevator, Elevator__c.External_ID__c, true);
            }
            
            // TODO: Update Order
            List<Order> orders = getOrdersFromPayload(payload);
            if (orders != null) {
                Database.update(orders, true);
            }

            // TODO: Insert OERs
            List<OrderElevatorRelation__c> oers = getOERFromPayload(payload, elevator, invoiceReceiverCustom, benefitReceiver);
            if (!oers.isEmpty()) {
                Database.insert(oers, true);
            }

            // TODO: Update Staging records
            // ? Update Elevator Staging
            Elevator_Staging__c elevatorStaging = getElevatorStagingFromPayload(payload, elevator, property, propertyUnit, benefitReceiver, invoiceReceiver);
            if (elevatorStaging != null) {
                Database.update(elevatorStaging, true);
            }
            // ? Update Property Staging
            Property_Staging__c propertyStaging = getPropertyStagingFromPayload(payload, property, upsertedContacts);
            if (propertyStaging != null) {
                Database.update(propertyStaging, true);
            }
            // ? Update Property Unit Staging
            Property_Unit_Staging__c propertyUnitStaging = getPropertyUnitStagingFromPayload(payload, propertyUnit, upsertedContacts);
            if (propertyUnitStaging != null) {
                Database.update(propertyUnitStaging, true);
            }
            // ? Update Order Staging
            // -- skipping for now
            
            // ? Update Account Staging
            List<Account_Staging__c> accountStaging = getStagingAccounts(upsertedAccounts);
            if (!accountStaging.isEmpty()) {
                Database.update(accountStaging, true);
            }
            // ? Update Contact Staging
            List<Contact_Staging__c> contactStaging = getStagingContacts(upsertedContacts);
            if (!contactStaging.isEmpty()) {
                Database.update(contactStaging, true);
            }

            return 'Success: Onboarding data processed and saved.';
            
        } catch (Exception ex) {
            if (sp != null) {
                Database.rollback(sp);
            }
            System.debug(LoggingLevel.ERROR, 'Onboarding save failed: ' + ex.getMessage() + '\n' + ex.getStackTraceString());

            if (Test.isRunningTest()) {
                throw ex;
            } else {
                throw new AuraHandledException(ex.getMessage() + '\n' + ex.getStackTraceString());
            }
        }
    }
    
    static Id getPortfolioId(String contractId) {
        List<Contract> contracts = [SELECT Id, Portfolio__c FROM Contract WHERE Id = :contractId];
        return contracts.isEmpty() ? null : contracts[0].Portfolio__c;
    }

    static Id getAccountRecordTypeId() {
        List<RecordType> recordTypes = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = 'Office' LIMIT 1];
        return recordTypes.isEmpty() ? null : recordTypes[0].Id;
    }

    static Account getAccountFromPayload(Map<String, Object> payload, Id accountRecordTypeId, String parentKey, String childKey) {
        if (payload == null) return null;
    
        Map<String, Object> parent = (Map<String, Object>) payload.get(parentKey);
        if (parent != null && parent.containsKey(childKey)) {
            Map<String, Object> child = (Map<String, Object>) parent.get(childKey);
            if (child != null && child.containsKey('id')) {
                return extractAccount(child, accountRecordTypeId);
            }
        }
        return null;
    }

    static Contact getContactFromPayload(Map<String, Object> payload, String parentKey, String childKey) {
        if (payload == null) return null;
    
        Map<String, Object> parent = (Map<String, Object>) payload.get(parentKey);
        if (parent != null && parent.containsKey(childKey)) {
            Map<String, Object> child = (Map<String, Object>) parent.get(childKey);
            if (child != null && child.containsKey('id')) {
                return extractContact(child);
            }
        }
        return null;
    }

    static Invoice_Reciever__c getInvoiceReceiver(Account acc, Map<String, Account> accountMap) {
        if (acc == null) return null;
    
        Account targetAcc = acc;
        if (targetAcc.Id == null && String.isNotBlank(acc.External_ID__c)) {
            targetAcc = accountMap.get(acc.External_ID__c);
        }
        if (targetAcc == null) return null;
    
        List<Invoice_Reciever__c> existing = [
            SELECT Id
            FROM Invoice_Reciever__c
            WHERE Invoice_Receiver__c = :targetAcc.Id
            AND Invoice_email__c = :targetAcc.Email__c
            LIMIT 1
        ];
    
        Invoice_Reciever__c ir = new Invoice_Reciever__c();
        ir.Name = targetAcc.Name;
        ir.Id = existing.isEmpty() ? null : existing[0].Id;
        ir.Invoice_Receiver__c = targetAcc.Id;
        ir.Street__c = targetAcc.BillingStreet;
        ir.City__c = targetAcc.BillingCity;
        ir.Postal_Code__c = targetAcc.BillingPostalCode;
        ir.Invoice_email__c = targetAcc.Email__c;
        return ir;
    }

    static Property__c getPropertyFromPayload(Map<String, Object> payload, Map<String, Account> accountMap, Map<String, Contact> contactMap) {
        if (payload == null) return null;
    
        Map<String, Object> propertyMap = (Map<String, Object>) payload.get('property');
        if (propertyMap != null && propertyMap.containsKey('details')) {
            Map<String, Object> details = (Map<String, Object>) propertyMap.get('details');
            if (details != null && details.containsKey('id')) {
                Map<String, Object> address = (Map<String, Object>) details.get('address');
                Property__c property = new Property__c();
                property.Id = isValidId((String) details.get('id')) ? (String) details.get('id') : null;
                property.External_ID__c = (String) details.get('externalId');
                property.Name = (String) details.get('name');
                property.Street__c = (String) address.get('street');
                property.City__c = (String) address.get('city');
                property.Zip__c = (String) address.get('postalCode');
                property.Business_Unit__c = (String) details.get('businessUnit');

                property.Property_Owner__c = isValidId((String) details.get('propertyOwnerId')) ? (String) details.get('propertyOwnerId') : accountMap.get((String) details.get('propertyOwnerId'))?.Id;
                property.AM_Company__c = isValidId((String) details.get('assetManagerId')) ? (String) details.get('assetManagerId') : accountMap.get((String) details.get('assetManagerId'))?.Id;
                property.AM_Contact__c = isValidId((String) details.get('assetManagerContactId')) ? (String) details.get('assetManagerContactId') : contactMap.get((String) details.get('assetManagerContactId'))?.Id;

                return property;
            }
        }
        return null;
    }

    static Property_Unit__c getPropertyUnitFromPayload(Map<String, Object> payload, Map<String, Account> accountMap, Map<String, Contact> contactMap, Property__c property) {
        if (payload == null) return null;
    
        Map<String, Object> propertyUnitMap = (Map<String, Object>) payload.get('propertyUnit');
        if (propertyUnitMap != null && propertyUnitMap.containsKey('details')) {
            Map<String, Object> details = (Map<String, Object>) propertyUnitMap.get('details');
            if (details != null && details.containsKey('id')) {
                Map<String, Object> address = (Map<String, Object>) details.get('address');
                String street = (String) address.get('street') ?? '';
                String city = (String) address.get('city') ?? '';
                String postalCode = (String) address.get('postalCode') ?? '';

                Property_Unit__c propertyUnit = new Property_Unit__c();
                propertyUnit.Id = isValidId((String) details.get('id')) ? (String) details.get('id') : null;
                propertyUnit.External_ID__c = (String) details.get('externalId');
                propertyUnit.Name = String.valueOf(street + ' ' + postalCode + ' ' + city).trim();
                propertyUnit.Street__c = street;
                propertyUnit.City__c = city;
                propertyUnit.Zip__c = postalCode;
                propertyUnit.Property__c = property.Id;

                propertyUnit.PM_Company__c = isValidId((String) details.get('pmId')) ? (String) details.get('pmId') : accountMap.get((String) details.get('pmId'))?.Id;
                propertyUnit.PM_Contact__c = isValidId((String) details.get('pmContactId')) ? (String) details.get('pmContactId') : contactMap.get((String) details.get('pmContactId'))?.Id;
                propertyUnit.FM_Company__c = isValidId((String) details.get('fmId')) ? (String) details.get('fmId') : accountMap.get((String) details.get('fmId'))?.Id;
                propertyUnit.FM_Contact__c = isValidId((String) details.get('fmContactId')) ? (String) details.get('fmContactId') : contactMap.get((String) details.get('fmContactId'))?.Id;
                propertyUnit.HV_Company__c = isValidId((String) details.get('hvId')) ? (String) details.get('hvId') : accountMap.get((String) details.get('hvId'))?.Id;
                propertyUnit.HV_Contact__c = isValidId((String) details.get('hvContactId')) ? (String) details.get('hvContactId') : contactMap.get((String) details.get('hvContactId'))?.Id;
                propertyUnit.Operator_Company__c = isValidId((String) details.get('operatorId')) ? (String) details.get('operatorId') : accountMap.get((String) details.get('operatorId'))?.Id;
                
                propertyUnit.BR_Company__c = isValidId((String) payload.get('benefitReceiverId')) ? (String) payload.get('benefitReceiverId') : accountMap.get((String) payload.get('benefitReceiverId'))?.Id;
                propertyUnit.Invoice_Receiver__c = isValidId((String) payload.get('invoiceReceiverId')) ? (String) payload.get('invoiceReceiverId') : accountMap.get((String) payload.get('invoiceReceiverId'))?.Id;

                propertyUnit.Property_Manager__c = isValidId((String) details.get('propertyManagerId')) ? (String) details.get('propertyManagerId') : contactMap.get((String) details.get('propertyManagerId'))?.Id;
                propertyUnit.House_Keeper__c = isValidId((String) details.get('houseKeeperId')) ? (String) details.get('houseKeeperId') : contactMap.get((String) details.get('houseKeeperId'))?.Id;
                propertyUnit.Attendant__c = isValidId((String) details.get('attendantId')) ? (String) details.get('attendantId') : contactMap.get((String) details.get('attendantId'))?.Id;
                propertyUnit.First_Aider__c = isValidId((String) details.get('firstAiderId')) ? (String) details.get('firstAiderId') : contactMap.get((String) details.get('firstAiderId'))?.Id;
                return propertyUnit;
            }
        }
        return null;
    }

    static Elevator__c getElevatorFromPayload(Map<String, Object> payload, Id portfolioId, Property_Unit__c propertyUnit) {
        if (payload == null) return null;
        
        if (payload.containsKey('id')) {
            Elevator__c elevator = new Elevator__c();
            elevator.Id = isValidId((String) payload.get('id')) ? (String) payload.get('id') : null;
            elevator.External_ID__c = (String) payload.get('externalId');
            elevator.Name = (String) payload.get('name');
            elevator.PropertyUnit__c = propertyUnit.Id;
            elevator.Portfolio__c = portfolioId;
            return elevator;
        }
        return null;
    }

    static List<Order> getOrdersFromPayload(Map<String, Object> payload) {
        if (payload == null) return null;

        List<Order> orders = new List<Order>();
        if (payload.containsKey('order')) {
            Map<String, Object> order = (Map<String, Object>) payload.get('order');
            Map<String, Object> details = (Map<String, Object>) order.get('details');
            if (details != null && details.containsKey('ids')) {
                String ids = (String) details.get('ids');
                if (String.isNotBlank(ids)) {
                    List<String> idList = ids.split(',');
                    for (String id : idList) {
                        if (isValidId(id)) {
                            Order o = new Order();
                            o.Id = id;
                            o.Customer_Order_Number__c = (String) details.get('customerOrderNumber');
                            o.Description = (String) details.get('comment');
                            orders.add(o);
                        }
                    }
                }
            }
        }
        return orders;
    }

    static List<OrderElevatorRelation__c> getOERFromPayload(Map<String, Object> payload, Elevator__c elevator, Invoice_Reciever__c invoiceReceiverCustom, Account benefitReceiver) {
        if (payload == null) return null;

        Map<String, OrderElevatorRelation__c> oerMap = new Map<String, OrderElevatorRelation__c>();
        for (OrderElevatorRelation__c oer : [SELECT Id, Order_Item__c, Elevator__c FROM OrderElevatorRelation__c WHERE Elevator__c = :elevator.Id]) {
            oerMap.put(oer.Order_Item__c, oer);
        }

        List<OrderElevatorRelation__c> oers = new List<OrderElevatorRelation__c>();
        if (payload.containsKey('order')) {
            Map<String, Object> order = (Map<String, Object>) payload.get('order');
            Map<String, Object> details = (Map<String, Object>) order.get('details');
            if (details != null && details.containsKey('products')) {
                List<Object> products = (List<Object>) details.get('products');
                for (Object product : products) {
                    Map<String, Object> productMap = (Map<String, Object>) product;
                    if (productMap != null && !oerMap.containsKey((String) productMap.get('orderItemId'))) {
                        OrderElevatorRelation__c oer = new OrderElevatorRelation__c();
                        oer.Order_Item__c = (String) productMap.get('orderItemId');
                        oer.Invoice_Receiver__c = invoiceReceiverCustom.Id;
                        oer.Benefit_Receiver__c = benefitReceiver.Id;
                        oer.Elevator__c = elevator.Id;
                        oers.add(oer);
                    }
                }
            }
        }
        return oers;
    }

    static Account extractAccount(Map<String, Object> data, Id accountRecordTypeId) {
        Map<String, Object> address = (Map<String, Object>) data.get('address');

        Account acc = new Account();
        acc.Id = isValidId((String) data.get('id')) ? (String) data.get('id') : null;
        acc.External_ID__c = (String) data.get('externalId');
        acc.Name = (String) data.get('name');
        acc.BillingStreet = (String) address.get('street');
        acc.BillingCity = (String) address.get('city');
        acc.BillingPostalCode = (String) address.get('postalCode');
        acc.Email__c = (String) data.get('email');
        acc.Phone = (String) data.get('phone');
        acc.Type = (String) data.get('type');
        return acc;
    }
    
    static Contact extractContact(Map<String, Object> data) {
        Contact con = new Contact();
        con.Id = isValidId((String) data.get('id')) ? (String) data.get('id') : null;
        con.External_ID__c = (String) data.get('externalId');
        con.FirstName = (String) data.get('firstName');
        con.LastName = (String) data.get('lastName');
        con.Salutation = (String) data.get('salutation');
        con.Title = (String) data.get('title');
        con.Email = (String) data.get('email');
        con.Phone = (String) data.get('phone');
        return con;
    }

    static Elevator_Staging__c getElevatorStagingFromPayload(Map<String, Object> payload, Elevator__c elevator, Property__c property, Property_Unit__c propertyUnit, Account benefitReceiver, Account invoiceReceiver) {
        if (payload == null) return null;

        if (payload.containsKey('id')) {
            String extId = (String) payload.get('externalId');
            List<Elevator_Staging__c> existing = [SELECT Id, Details__c, Previous_Details__c, Status__c, External_ID__c FROM Elevator_Staging__c WHERE External_ID__c = :extId];
            if (existing.isEmpty()) return null;
            Elevator_Staging__c staging = new Elevator_Staging__c();
            staging.Id = existing[0].Id;

            Elevator e = new Elevator(existing[0]);
            e.id = elevator.Id;
            e.propertyId = property.Id;
            e.propertyUnitId = propertyUnit.Id;
            e.benefitReceiverId = benefitReceiver.Id;
            e.invoiceReceiverId = invoiceReceiver.Id;
            e.status = 'Approved';
            e.previousObject = null;

            staging.Details__c = JSON.serialize(e);
            staging.Elevator__c = elevator.Id;
            staging.External_ID__c = extId;
            staging.Status__c = 'Approved';
            return staging;
        }
        return null;
    }

    static Property_Staging__c getPropertyStagingFromPayload(Map<String, Object> payload, Property__c property, Map<String, Contact> contactMap) {
        if (payload == null) return null;
        Map<String, Object> propertyMap = (Map<String, Object>) payload.get('property');
        if (propertyMap != null && propertyMap.containsKey('details')) {
            Map<String, Object> details = (Map<String, Object>) propertyMap.get('details');
            if (details != null && details.containsKey('id')) {
                String extId = (String) details.get('externalId');
                List<Property_Staging__c> existing = [SELECT Id, Details__c, Previous_Details__c, Status__c, External_ID__c FROM Property_Staging__c WHERE External_ID__c = :extId];
                if (existing.isEmpty()) return null;
                Property_Staging__c staging = new Property_Staging__c();
                staging.Id = existing[0].Id;

                Property p = new Property(existing[0]);
                p.id = property.Id;
                p.propertyOwnerId = property.Property_Owner__c;
                p.propertyOwnerContactId = contactMap.get((String) details.get('propertyOwnerContactId'))?.Id;
                p.assetManagerId = property.AM_Company__c;
                p.assetManagerContactId = property.AM_Contact__c;
                p.previousObject = null;

                staging.Details__c = JSON.serialize(p);
                staging.External_ID__c = extId;
                staging.Status__c = 'Approved';
                staging.Property__c = property.Id;
                return staging;
            }
        }
        return null;
    }

    static Property_Unit_Staging__c getPropertyUnitStagingFromPayload(Map<String, Object> payload, Property_Unit__c propertyUnit, Map<String, Contact> contactMap) {
        if (payload == null) return null;
        Map<String, Object> propertyUnitMap = (Map<String, Object>) payload.get('propertyUnit');
        if (propertyUnitMap != null && propertyUnitMap.containsKey('details')) {
            Map<String, Object> details = (Map<String, Object>) propertyUnitMap.get('details');
            if (details != null && details.containsKey('id')) {
                String extId = (String) details.get('externalId');
                List<Property_Unit_Staging__c> existing = [SELECT Id, Details__c, Previous_Details__c, Status__c, External_ID__c FROM Property_Unit_Staging__c WHERE External_ID__c = :extId];
                if (existing.isEmpty()) return null;
                Property_Unit_Staging__c staging = new Property_Unit_Staging__c();
                staging.Id = existing[0].Id;

                PropertyUnit pu = new PropertyUnit(existing[0]);
                pu.propertyId = propertyUnit.Property__c;
                pu.id = propertyUnit.Id;
                pu.pmId = propertyUnit.PM_Company__c;
                pu.pmContactId = propertyUnit.PM_Contact__c;
                pu.fmId = propertyUnit.FM_Company__c;
                pu.fmContactId = propertyUnit.FM_Contact__c;
                pu.hvId = propertyUnit.HV_Company__c;
                pu.hvContactId = propertyUnit.HV_Contact__c;
                pu.operatorId = propertyUnit.Operator_Company__c;
                pu.operatorContactId = isValidId((String) details.get('operatorContactId')) ? (String) details.get('operatorContactId') : contactMap.get((String) details.get('operatorContactId'))?.Id;
                pu.propertyManagerId = isValidId((String) details.get('propertyManagerId')) ? (String) details.get('propertyManagerId') : contactMap.get((String) details.get('propertyManagerId'))?.Id;
                pu.houseKeeperId = isValidId((String) details.get('houseKeeperId')) ? (String) details.get('houseKeeperId') : contactMap.get((String) details.get('houseKeeperId'))?.Id;
                pu.attendantId = isValidId((String) details.get('attendantId')) ? (String) details.get('attendantId') : contactMap.get((String) details.get('attendantId'))?.Id;
                pu.firstAiderId = isValidId((String) details.get('firstAiderId')) ? (String) details.get('firstAiderId') : contactMap.get((String) details.get('firstAiderId'))?.Id;
                pu.previousObject = null;

                staging.Details__c = JSON.serialize(pu);
                staging.External_ID__c = extId;
                staging.Status__c = 'Approved';
                staging.Property_Unit__c = propertyUnit.Id;
                return staging;
            }
        }
        return null;
    }

    static List<Account_Staging__c> getStagingAccounts(Map<String, Account> accounts) {
        List<Account_Staging__c> accountStaging = new List<Account_Staging__c>();

        Map<String, Account_Staging__c> existing = new Map<String, Account_Staging__c>();
        for (Account_Staging__c staging : [SELECT Id, Details__c, Status__c, Previous_Details__c, External_ID__c FROM Account_Staging__c WHERE External_ID__c IN :accounts.keySet()]) {
            existing.put(staging.External_ID__c, staging);
        }

        for (String extId : accounts.keySet()) {
            if (existing.containsKey(extId)) {
                Account acc = accounts.get(extId);

                Account_Staging__c staging = existing.get(extId);
                staging.Id = existing.get(extId).Id;

                AccountData ad = new AccountData(existing.get(extId));
                ad.id = acc.Id;
                ad.name = acc.Name;
                ad.email = acc.Email__c;
                ad.phone = acc.Phone;
                ad.address = new Address(acc.BillingStreet, acc.BillingCity, acc.BillingPostalCode, null);
                ad.previousObject = null;

                staging.Details__c = JSON.serialize(ad);
                staging.Status__c = 'Approved';
                staging.Account__c = acc.Id;
                staging.External_ID__c = extId;
                accountStaging.add(staging);
            }

        }
        return accountStaging;
    }

    static List<Contact_Staging__c> getStagingContacts(Map<String, Contact> contacts) {
        List<Contact_Staging__c> contactStaging = new List<Contact_Staging__c>();

        Map<String, Contact_Staging__c> existing = new Map<String, Contact_Staging__c>();
        for (Contact_Staging__c staging : [SELECT Id, Details__c, Status__c, Previous_Details__c, External_ID__c FROM Contact_Staging__c WHERE External_ID__c IN :contacts.keySet()]) {
            existing.put(staging.External_ID__c, staging);
        }

        for (String extId : contacts.keySet()) {
            if (existing.containsKey(extId)) {
                Contact con = contacts.get(extId);

                Contact_Staging__c staging = existing.get(extId);
                staging.Id = existing.get(extId).Id;

                ContactData cd = new ContactData(existing.get(extId));
                cd.id = con.Id;
                cd.firstName = con.FirstName;
                cd.lastName = con.LastName;
                cd.salutation = con.Salutation;
                cd.title = con.Title;
                cd.email = con.Email;
                cd.phone = con.Phone;
                cd.previousObject = null;

                staging.Details__c = JSON.serialize(cd);
                staging.Status__c = 'Approved';
                staging.Contact__c = con.Id;
                staging.External_ID__c = extId;
                contactStaging.add(staging);
            }

        }
        return contactStaging;
    }

    static Boolean isValidId(String id) {
        return id != null && String.isNotBlank(id) && id.length() == 18;
    }
    
    static void addIfUnique(Set<Account> accounts, Set<String> accountKeys, Account acc) {
        if (acc == null) return;
    
        String key = acc.Id != null ? String.valueOf(acc.Id) : String.valueOf(acc.External_ID__c);
        if (String.isNotBlank(key) && !accountKeys.contains(key)) {
            accountKeys.add(key);
            accounts.add(acc);
        }
    }

    static void addIfUnique(Set<Contact> contacts, Set<String> contactKeys, Contact con) {
        if (con == null) return;
    
        String key = con.External_ID__c;
        if (String.isNotBlank(key) && !contactKeys.contains(key)) {
            contactKeys.add(key);
            contacts.add(con);
        }
    }










    public static void saveOnboardingData(String contractId, String userId, OnboardingData data) {
        Savepoint sp;
        try {
            sp = Database.setSavepoint();
            // --- Elevators ---
            List<Elevator_Staging__c> elevatorStagingList = new List<Elevator_Staging__c>();
            for (OnboardingController.Elevator e : data.elevators) {

                Elevator_Staging__c staging = new Elevator_Staging__c();
                e.previousObject = null;
                e.status = 'Submitted';

                staging.Details__c = JSON.serialize(e);
                staging.Elevator_Name__c = e.name;
                staging.External_ID__c = e.externalId;
                staging.Contract__c = contractId;
                staging.Status__c = e.status;
                if (userId != null && userId != '' && userId != 'null') {
                    staging.External_User__c = userId;
                }
                elevatorStagingList.add(staging);
            }
            if (!elevatorStagingList.isEmpty()) {
                Database.upsert(elevatorStagingList, Elevator_Staging__c.External_ID__c, true);
            }

            // --- Properties ---
            List<Property_Staging__c> propertyStagingList = new List<Property_Staging__c>();
            for (OnboardingController.Property p : data.properties) {
                Property_Staging__c staging = new Property_Staging__c();
                p.previousObject = null;
                staging.Details__c = JSON.serialize(p);
                staging.External_ID__c = p.externalId;
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
                pu.previousObject = null;
                staging.Details__c = JSON.serialize(pu);
                staging.External_ID__c = pu.externalId;
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
                a.previousObject = null;
                staging.Details__c = JSON.serialize(a);
                staging.External_ID__c = a.externalId;
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
                c.previousObject = null;
                staging.Details__c = JSON.serialize(c);
                staging.External_ID__c = c.externalId;
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
                orderWithoutItems.previousObject = null;
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
        } catch (Exception e) {
            System.debug('Error saving onboarding data: ' + e.getMessage() + '\n' + e.getStackTraceString());
            if (sp != null) {
                Database.rollback(sp);
            }
            throw new AuraHandledException(e.getMessage());
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

        Map<String, String> propertyNameToId = new Map<String, String>();
        Map<String, String> accountNameToId = new Map<String, String>();
        Map<String, String> contactKeyToId = new Map<String, String>();
        Map<String, String> unitKeyToId = new Map<String, String>();

        Set<String> seenKeys = new Set<String>();

        for (Object row : data) {
            Map<String, Object> rowMap = (Map<String, Object>) row;
    
            Elevator elevator = new Elevator();
            Property property = new Property();
            PropertyUnit propertyUnit = new PropertyUnit();
            OrderData order = new OrderData();
            ContactData propertyManager = new ContactData();
            ContactData houseKeeper = new ContactData();
            AccountData propertyOwner = new AccountData();
            AccountData operator = new AccountData();
            AccountData invoiceReceiver = new AccountData();
            AccountData benefitReceiver = new AccountData();
    
            for (String header : rowMap.keySet()) {
                String fieldPath = headerToFieldPath.get(header);
                if (fieldPath == null) continue;
                List<String> pathParts = fieldPath.split('\\.');
                if (pathParts.size() < 2) continue;

                String obj = pathParts[0], field = pathParts[1];
                Object value = rowMap.get(header);
                
                if (obj == 'elevator') {
                    if (field == 'name') {
                        elevator.name = (String) value;
                    }
                } else if (obj == 'property') {
                    if (field == 'name') {
                        property.name = (String) value;
                    }
                } else if (obj == 'propertyUnit') {
                    if (field == 'street') {
                        propertyUnit.address.street = (String) value;
                    } else if (field == 'postalCode') {
                        propertyUnit.address.postalCode = (String) value;
                    } else if (field == 'city') {
                        propertyUnit.address.city = (String) value;
                    }
                } else if (obj == 'order') {
                    if (field == 'comment') {
                        order.comment = (String) value;
                    }
                } else if (obj == 'propertyManager') {
                    assignContactField(propertyManager, field, value);
                } else if (obj == 'houseKeeper') {
                    assignContactField(houseKeeper, field, value);
                } else if (obj == 'operator') {
                    assignAccountField(operator, field, value);
                } else if (obj == 'invoiceReceiver') {
                    assignAccountField(invoiceReceiver, field, value);
                } else if (obj == 'benefitReceiver') {
                    assignAccountField(benefitReceiver, field, value);
                } else if (obj == 'propertyOwner') {
                    assignAccountField(propertyOwner, field, value);
                }
            }

            // ! Property Part
            if (!String.isBlank(propertyOwner.name) && seenKeys.add('account:' + propertyOwner.name)) {
                result.accounts.add(propertyOwner);
                accountNameToId.put(propertyOwner.name, propertyOwner.id);
            }

            if (!String.isBlank(property.name) && seenKeys.add('property:' + property.name)) {
                property.propertyOwnerId = !String.isBlank(propertyOwner.name) ? accountNameToId.get(propertyOwner.name) : null;
                result.properties.add(property);
                propertyNameToId.put(property.name, property.id);
            }

            // ! Property Unit Part
            if (!String.isBlank(operator.name) && seenKeys.add('account:' + operator.name)) {
                result.accounts.add(operator);
                accountNameToId.put(operator.name, operator.id);
            }

            if (!String.isBlank(propertyManager.firstName) && !String.isBlank(propertyManager.lastName)) {
                String key = 'contact:' + propertyManager.firstName + '|' + propertyManager.lastName;
                if (seenKeys.add(key)) {
                    result.contacts.add(propertyManager);
                    contactKeyToId.put(key, propertyManager.id);
                }
            }

            if (!String.isBlank(houseKeeper.firstName) && !String.isBlank(houseKeeper.lastName)) {
                String key = 'contact:' + houseKeeper.firstName + '|' + houseKeeper.lastName;
                if (seenKeys.add(key)) {
                    result.contacts.add(houseKeeper);
                    contactKeyToId.put(key, houseKeeper.id);
                }
            }

            if (!String.isBlank(propertyUnit.address.street) && !String.isBlank(propertyUnit.address.postalCode)) {
                String key = 'unit:' + propertyUnit.address.street + '|' + propertyUnit.address.postalCode;
                if (seenKeys.add(key)) {
                    propertyUnit.propertyId = propertyNameToId.get(property.name);
                    propertyUnit.operatorId = accountNameToId.get(operator.name);
                    propertyUnit.propertyManagerId = contactKeyToId.get('contact:' + propertyManager.firstName + '|' + propertyManager.lastName);
                    propertyUnit.houseKeeperId = contactKeyToId.get('contact:' + houseKeeper.firstName + '|' + houseKeeper.lastName);
                    result.propertyUnits.add(propertyUnit);
                    unitKeyToId.put(key, propertyUnit.id);
                }
            }

            // ! Elevator Part
            if (!String.isBlank(invoiceReceiver.name) && seenKeys.add('account:' + invoiceReceiver.name)) {
                result.accounts.add(invoiceReceiver);
                accountNameToId.put(invoiceReceiver.name, invoiceReceiver.id);
            }
    
            if (!String.isBlank(benefitReceiver.name) && seenKeys.add('account:' + benefitReceiver.name)) {
                result.accounts.add(benefitReceiver);
                accountNameToId.put(benefitReceiver.name, benefitReceiver.id);
            }

            if (!String.isBlank(elevator.name) && seenKeys.add('elevator:' + elevator.name)) {
                elevator.propertyUnitId = unitKeyToId.get('unit:' + propertyUnit.address.street + '|' + propertyUnit.address.postalCode);
                elevator.propertyId = propertyNameToId.get(property.name);
                elevator.benefitReceiverId = accountNameToId.get(benefitReceiver.name);
                elevator.invoiceReceiverId = accountNameToId.get(invoiceReceiver.name);
                result.elevators.add(elevator);
            }

            // ! Order Part
            if (!String.isBlank(order.comment) && seenKeys.add('order:' + order.comment)) {
                result.orders.add(order);
            }
        }
    
        return result;
    }

    private static void assignContactField(ContactData contact, String field, Object value) {
        if (field == 'firstName') {
            contact.firstName = (String) value;
        } else if (field == 'lastName') {
            contact.lastName = (String) value;
        } else if (field == 'phone') {
            contact.phone = (String) value;
        } else if (field == 'salutation') {
            contact.salutation = (String) value;
        }
    }

    private static void assignAccountField(AccountData acct, String field, Object value) {
        if (field == 'name') {
            acct.name = (String) value;
        } else if (field == 'street') {
            acct.address.street = (String) value;
        } else if (field == 'city') {
            acct.address.city = (String) value;
        } else if (field == 'postalCode') {
            acct.address.postalCode = (String) value;
        } else if (field == 'email') {
            acct.email = (String) value;
        }
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
        @AuraEnabled public String contractName;
        @AuraEnabled public List<Elevator> elevators = new List<Elevator>();
        @AuraEnabled public List<AccountData> accounts = new List<AccountData>();
        @AuraEnabled public List<ContactData> contacts = new List<ContactData>();
        @AuraEnabled public List<Property> properties = new List<Property>();
        @AuraEnabled public List<PropertyUnit> propertyUnits = new List<PropertyUnit>();
        @AuraEnabled public List<OrderData> orders = new List<OrderData>();
    }
    
    public class ProductAssignment {
        @AuraEnabled public String productId;
        @AuraEnabled public String status;
    }

    public class Elevator {
        @AuraEnabled public String id;
        @AuraEnabled public String externalId;
        @AuraEnabled public String name;
        @AuraEnabled public String status;
        @AuraEnabled public String propertyUnitId;
        @AuraEnabled public String propertyId;

        @AuraEnabled public String benefitReceiverId;
        @AuraEnabled public String invoiceReceiverId;

        @AuraEnabled public List<ProductAssignment> productAssignments;

        @AuraEnabled public Boolean isChanged;
        @AuraEnabled public Boolean isDeleted;
        @AuraEnabled public Boolean isNew;

        @AuraEnabled public Elevator previousObject;

        public Elevator() {
            String id = generateUniqueId();
            this.id = id;
            this.externalId = id;
            this.isNew = true;
            this.isChanged = true;
        }

        public Elevator(Elevator_Staging__c record) {
            Elevator elevatorObj = (Elevator)JSON.deserialize(record.Details__c, Elevator.class);
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (Elevator)JSON.deserialize(record.Previous_Details__c, Elevator.class) : null;
            this.id = elevatorObj.id;
            this.externalId = record.External_ID__c;
            this.name = elevatorObj.name;
            this.status = record.Status__c;
            this.propertyUnitId = elevatorObj.propertyUnitId;
            this.propertyId = elevatorObj.propertyId;
            this.benefitReceiverId = elevatorObj.benefitReceiverId;
            this.invoiceReceiverId = elevatorObj.invoiceReceiverId;
            this.productAssignments = elevatorObj.productAssignments;
            this.isChanged = false;
            this.isDeleted = elevatorObj.isDeleted ?? false;
            this.isNew = false;

        }
    }

    public class Property {
        @AuraEnabled public String id;
        @AuraEnabled public String externalId;
        @AuraEnabled public String name;
        @AuraEnabled public Address address;
        @AuraEnabled public String businessUnit;
        @AuraEnabled public String propertyOwnerId;
        @AuraEnabled public String propertyOwnerContactId;
        @AuraEnabled public String assetManagerId;
        @AuraEnabled public String assetManagerContactId;

        @AuraEnabled public Boolean isChanged;
        @AuraEnabled public Boolean completed;
        @AuraEnabled public Boolean isNew;
        @AuraEnabled public Boolean isDeleted;

        @AuraEnabled public Property previousObject;

        public Property() {
            String id = generateUniqueId();
            this.id = id;
            this.externalId = id;
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
            this.address = new Address();
        }

        public Property(Property_Staging__c record) {
            Property propertyObj = (Property)JSON.deserialize(record.Details__c, Property.class);
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (Property)JSON.deserialize(record.Previous_Details__c, Property.class) : null;
            this.name = propertyObj.name;
            this.id = propertyObj.id;
            this.externalId = record.External_ID__c;
            this.address = propertyObj.address;
            this.businessUnit = propertyObj.businessUnit;
            this.propertyOwnerId = propertyObj.propertyOwnerId;
            this.propertyOwnerContactId = propertyObj.propertyOwnerContactId;
            this.assetManagerId = propertyObj.assetManagerId;
            this.assetManagerContactId = propertyObj.assetManagerContactId;
            this.isChanged = false;
            this.completed = propertyObj.completed;
            this.isNew = false;
            this.isDeleted = propertyObj.isDeleted ?? false;
        }
    }

    public class PropertyUnit {
        @AuraEnabled public String id;
        @AuraEnabled public String externalId;
        @AuraEnabled public String propertyType;
        @AuraEnabled public Address address;

        @AuraEnabled public String propertyId;
        @AuraEnabled public String pmId;
        @AuraEnabled public String pmContactId;
        @AuraEnabled public String fmId;
        @AuraEnabled public String fmContactId;
        @AuraEnabled public String hvId;
        @AuraEnabled public String hvContactId;
        @AuraEnabled public String operatorId;
        @AuraEnabled public String operatorContactId;

        @AuraEnabled public String propertyManagerId;
        @AuraEnabled public String houseKeeperId;
        @AuraEnabled public String attendantId;
        @AuraEnabled public String firstAiderId;

        @AuraEnabled public Boolean isChanged;
        @AuraEnabled public Boolean completed;
        @AuraEnabled public Boolean isNew;
        @AuraEnabled public Boolean isDeleted;

        @AuraEnabled public PropertyUnit previousObject;

        public PropertyUnit() {
            String id = generateUniqueId();
            this.id = id;
            this.externalId = id;
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
            this.address = new Address();
        }

        public PropertyUnit(Property_Unit_Staging__c record) {
            PropertyUnit propertyUnitObj = (PropertyUnit) JSON.deserialize(record.Details__c, PropertyUnit.class);
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (PropertyUnit)JSON.deserialize(record.Previous_Details__c, PropertyUnit.class) : null;
            this.id = propertyUnitObj.id;
            this.externalId = record.External_ID__c;
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
            this.isDeleted = propertyUnitObj.isDeleted ?? false;
        }
    }

    public class AccountData {
        @AuraEnabled public String id;
        @AuraEnabled public String externalId;
        @AuraEnabled public String name;
        @AuraEnabled public String email;
        @AuraEnabled public String phone;
        @AuraEnabled public String type;
        @AuraEnabled public Address address;

        @AuraEnabled public Boolean isChanged;
        @AuraEnabled public Boolean completed;
        @AuraEnabled public Boolean isNew;
        @AuraEnabled public Boolean isDeleted;

        @AuraEnabled public AccountData previousObject;

        public AccountData() {
            String id = generateUniqueId();
            this.id = id;
            this.externalId = id;
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
            this.address = new Address();
        }

        public AccountData(Account_Staging__c record) {
            AccountData accountObj = (AccountData) JSON.deserialize(record.Details__c, AccountData.class);
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (AccountData)JSON.deserialize(record.Previous_Details__c, AccountData.class) : null;
            this.id = accountObj.id;
            this.externalId = record.External_ID__c;
            this.name = accountObj.name;
            this.email = accountObj.email;
            this.phone = accountObj.phone;
            this.type = accountObj.type;
            this.address = accountObj.address;
            this.isChanged = false;
            this.completed = accountObj.completed;
            this.isNew = false;
            this.isDeleted = accountObj.isDeleted ?? false;
        }
    }

    public class ContactData {
        @AuraEnabled public String id;
        @AuraEnabled public String externalId;
        @AuraEnabled public String firstName;
        @AuraEnabled public String lastName;
        @AuraEnabled public String salutation;
        @AuraEnabled public String title;
        @AuraEnabled public String email;
        @AuraEnabled public String phone;
        @AuraEnabled public String accountId;

        @AuraEnabled public Boolean isChanged;
        @AuraEnabled public Boolean completed;
        @AuraEnabled public Boolean isNew;
        @AuraEnabled public Boolean isDeleted;

        @AuraEnabled public ContactData previousObject;

        public ContactData() {
            String id = generateUniqueId();
            this.id = id;
            this.externalId = id;
            this.isNew = true;
            this.isChanged = true;
            this.completed = true;
        }

        public ContactData(Contact_Staging__c record) {
            ContactData contactObj = (ContactData) JSON.deserialize(record.Details__c, ContactData.class);
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (ContactData)JSON.deserialize(record.Previous_Details__c, ContactData.class) : null;
            this.id = contactObj.id;
            this.externalId = record.External_ID__c;
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
            this.isDeleted = contactObj.isDeleted ?? false;
        }
    }

    public class OrderData {
        @AuraEnabled public String id;
        @AuraEnabled public String customerOrderNumber;
        @AuraEnabled public Boolean isRecurring;
        @AuraEnabled public String comment;
        @AuraEnabled public List<OrderItemData> orderItems; 

        @AuraEnabled public OrderData previousObject;

        @AuraEnabled public Boolean isChanged;

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
            this.previousObject = !String.isEmpty(record.Previous_Details__c) ? (OrderData)JSON.deserialize(record.Previous_Details__c, OrderData.class) : null;
            this.id = record.External_ID__c;
            this.customerOrderNumber = orderDataObj.customerOrderNumber;
            this.comment = orderDataObj.comment;

            this.isChanged = false;
        }
    }

    public class OrderItemData {
        @AuraEnabled public String id;
        @AuraEnabled public String productId;
        @AuraEnabled public String productName;
        @AuraEnabled public String productCode;
    }

    public class Address {
        @AuraEnabled public String street;
        @AuraEnabled public String city;
        @AuraEnabled public String postalCode;
        @AuraEnabled public String country;

        public Address() {}

        public Address(String street, String city, String postalCode, String country) {
            this.street = street;
            this.city = city;
            this.postalCode = postalCode;
            this.country = country;
        }
    }

    public class ContactSearchResult {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String email;

        public ContactSearchResult(Id id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
    }



    public class UserInfos {
        @AuraEnabled public String userId;
        @AuraEnabled public String userName;
        @AuraEnabled public String companyName;
    }

    public static UserInfos getUserInfo(String userEmail) {
        List<External_User__c> users = [SELECT Id, Contact__r.Name, Contact__r.Account.Name FROM External_User__c WHERE Contact__r.Email = :userEmail];
        if (users.isEmpty()) {
            return null;
        }
        UserInfos userInfos = new UserInfos();
        userInfos.userId = users[0].Id;
        userInfos.userName = users[0].Contact__r.Name;
        userInfos.companyName = users[0].Contact__r.Account.Name;
        return userInfos;
    }

}