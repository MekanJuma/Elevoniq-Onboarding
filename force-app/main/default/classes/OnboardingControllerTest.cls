@isTest
public class OnboardingControllerTest {
    @testSetup
    static void setupData() {
        TestDataFactory.createCustomerAccount('Test Benefit Receiver');

        Product2 testPackageProduct = TestDataFactory.createProduct('Package', 'TEST_PACKAGE');
        Product2 testServiceProduct = TestDataFactory.createProduct('Service', 'TEST_SERVICE');
        TestDataFactory.createPriceBook('Sales', 'SALES_PRICEBOOK', new List<Product2>{testPackageProduct, testServiceProduct});
        TestDataFactory.createPriceBook('Modernization', 'MOD_PRICEBOOK', new List<Product2>{testPackageProduct, testServiceProduct});
        TestDataProvider dataProvider = new TestDataProvider();
        dataProvider.prepareAccountsAndSettings();
        dataProvider.prepareElevatorEnvironment();
        
        Account company = TestDataFactory.createCompanyAccount('TEST_COMPANY');
        Opportunity testOpportunity = TestDataFactory.createOpportunity('Sales', company, 'TEST_OPPORTUNITY');
        
        Contract testContract = new Contract(
            AccountId = company.Id,
            Opportunity__c = testOpportunity.Id,
            StartDate = Date.today(),
            ContractTerm = 25,
            Name = 'TEST_CONTRACT'
        );
        insert testContract;
        
        Elevator_Staging__c es = new Elevator_Staging__c(
            Contract__c = testContract.Id,
            External_ID__c = '123456789',Details__c = '{"status":"New","propertyUnitId":"newItem_dxxi0o2R","propertyId":"newItem_gTpZ7TLa","productAssignments":[{"status":"assigned","productId":"01t1v00000FmktPAAR"}],"name":"NEW EL - 01","isNew":true,"isDeleted":null,"isChanged":true,"invoiceReceiverId":"newItem_p42bGr5H","id":"newElevator_Uri7ZhMH","benefitReceiverId":"newItem_4bICaHX3"}');
        insert es;
        
        Property_Staging__c ps = new Property_Staging__c(
            External_ID__c = 'newItem_gTpZ7TLa',
            Details__c = '{"propertyOwnerId":"newItem_u1NT5HIu","propertyOwnerContactId":"newItem_dxxi0o2R","name":"Test2","isNew":false,"isDeleted":false,"isChanged":true,"id":"newItem_rq7midzc","completed":true,"businessUnit":"test","assetManagerId":"","assetManagerContactId":null,"address":{"street":"Street 0","postalCode":"12353","country":"Germany","city":"Berlin"}}');
        insert ps;
        
        Property_Unit_Staging__c pus = new Property_Unit_Staging__c(
            External_ID__c = 'newItem_dxxi0o2R',
            Details__c = '{"propertyType":"Residence","propertyManagerId":"newItem_GnKvizFh","propertyId":"newItem_rq7midzc","pmId":"","pmContactId":"","operatorId":"newItem_LuXGVHpJ","operatorContactId":"","isNew":true,"isDeleted":null,"isChanged":true,"id":"newItem_IkuyqBRv","hvId":"","hvContactId":"","houseKeeperId":"newItem_5wgyhYWU","fmId":"","fmContactId":"","firstAiderId":null,"completed":true,"attendantId":null,"address":{"street":"Street 1","postalCode":"12353","country":"Germany","city":"Berlin"}}'
        );
        insert pus;
        
        Account_Staging__c ast = new Account_Staging__c(
            External_ID__c = 'newItem_4bICaHX3',
            Details__c = '{"type":"","name":"TEST OWNER","isNew":true,"isDeleted":null,"isChanged":true,"id":"newItem_u1NT5HIu","email":"","completed":true,"address":{"street":"","postalCode":"12353","country":"Germany","city":"Berlin"}}'  
        );
        insert ast;
        
        Contact_Staging__c cs = new Contact_Staging__c(
            External_ID__c = 'newItem_dxxi0o2R',
            Details__c = '{"title":"","phone":"","lastName":"MANAGER","isNew":true,"isDeleted":null,"isChanged":true,"id":"newItem_GnKvizFh","firstName":"TEST","email":"test@manager.com","completed":true,"accountId":""}'
        );
        insert cs;
        
        
        Elevator__c testElevator = TestDataFactory.createElevator(null, '11111');
        testElevator.Portfolio__c = company.Id;
        update testElevator;
        
        PricebookEntry pEntry = [SELECT Id FROM PricebookEntry WHERE Product2Id = :testPackageProduct.Id LIMIT 1];
        
        Order order = new Order(
            AccountId = company.Id,
            ContractId = testContract.Id,
            Pricebook2Id  = Test.getStandardPricebookId(),
            Name = 'Test Order', 
            EffectiveDate = Date.today(),
            Payment_Interval__c = 'Monthly',
            Status = 'Active', 
            Type = 'Recurring Service', 
            Due_in_Days__c = '30 days',
            Introduction_Period__c = 3,
            Introduction_Discount__c = 10
        );
        insert order;

        OrderItem orderItem = new OrderItem(
            OrderId = order.Id, 
            Product2Id = testPackageProduct.Id, 
            UnitPrice = 100, Quantity = 1,
            PricebookEntryId = pEntry.Id
        );
        insert orderItem;
        
        OrderElevatorRelation__c oer = new OrderElevatorRelation__c(Order_Item__c = orderItem.Id, Elevator__c = testElevator.Id);
        insert oer;


        Order_Staging__c os = new Order_Staging__c(
            External_ID__c = 'newItem_dxxi0o2R',
            Contract__c = testContract.Id,
            Details__c = JSON.serialize(new Map<String, Object>{
                'paymentInterval' => 'Yearly',
                'orderItems' => new List<Object>{
                    new Map<String, Object>{
                        'productName' => testPackageProduct.Name,
                        'productId'   => testPackageProduct.Id,
                        'productCode' => testPackageProduct.ProductCode,
                        'id'          => orderItem.Id
                    }
                },
                'modeOfPayment' => 'In Advance',
                'isRecurring'   => null,
                'isChanged'     => false,
                'id'            => order.Id,
                'customerOrderNumber' => '12345',
                'comment'       => 'TEST COMMENT'
            })
        );
        insert os;


    }
    
    @isTest
    static void testGetUserInfo() {
        Contract contract = [SELECT Id FROM Contract WHERE Name = 'TEST_CONTRACT' LIMIT 1];
        Elevator_Staging__c es = [SELECT Id FROM Elevator_Staging__c WHERE Contract__c =: contract.Id LIMIT 1];
        Order_Staging__c os = [SELECT Id FROM Order_Staging__c WHERE Contract__c =:contract.Id];
        
        OnboardingController.OnboardingData data = new OnboardingController.OnboardingData();
        List<OnboardingController.Elevator> elevators = new List<OnboardingController.Elevator>();
        OnboardingController.Elevator elevator = new OnboardingController.Elevator();
        elevator.id = 'E1';
        elevator.name = 'Elevator 1';
        elevator.status = 'Active';
        elevator.propertyUnitId = 'PU1';
        elevator.propertyId = 'P1';
        elevator.benefitReceiverId = 'BR1';
        elevator.invoiceReceiverId = 'IR1';
        
        elevators.add(elevator);
        data.elevators = elevators;
        
        
        List<OnboardingController.Property> properties = new List<OnboardingController.Property>();
        OnboardingController.Property property = new OnboardingController.Property();
        property.id = 'P1';
        property.name = 'Property 1';
        property.address = new OnboardingController.Address();
        property.address.street = '123 Main St';
        property.address.city = 'Sample City';
        property.address.postalCode = '12345';
        property.address.country = 'Sample Country';
        property.isChanged = true;
        property.isNew = true;
        properties.add(property);
        data.properties = properties;
        
        List<OnboardingController.PropertyUnit> propertyUnits = new List<OnboardingController.PropertyUnit>();
        OnboardingController.PropertyUnit propertyUnit = new OnboardingController.PropertyUnit();
        propertyUnit.id = 'PU1';
        propertyUnit.propertyType = 'Residential';
        propertyUnit.address = new OnboardingController.Address();
        propertyUnits.add(propertyUnit);
        data.propertyUnits = propertyUnits;
        
        List<OnboardingController.AccountData> accounts = new List<OnboardingController.AccountData>();
        OnboardingController.AccountData account = new OnboardingController.AccountData();
        account.id = 'A1';
        account.name = 'Account 1';
        account.email = 'account1@example.com';
        account.type = 'Customer';
        account.address = new OnboardingController.Address();
        accounts.add(account);
        data.accounts = accounts;
        
        List<OnboardingController.ContactData> contacts = new List<OnboardingController.ContactData>();
        OnboardingController.ContactData contact = new OnboardingController.ContactData();
        contact.id = 'C1';
        contact.firstName = 'John';
        contact.lastName = 'Doe';
        contact.email = 'john.doe@example.com';
        contact.accountId = 'A1';
        contacts.add(contact);
        data.contacts = contacts;
        
        
        Test.startTest();
        
        Product2 prod = new Product2(Name = 'Test Product', ProductCode = 'TP-001', IsActive = true);
        insert prod;

        Id pricebookId = Test.getStandardPricebookId();
        PricebookEntry pbe = new PricebookEntry(
            Product2Id = prod.Id,
            Pricebook2Id = pricebookId,
            UnitPrice = 100,
            IsActive = true
        );
        insert pbe;

        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Order ord = new Order(
            Name = 'Test Order',
            Status = 'Active',
            EffectiveDate = Date.today(),
            AccountId = acc.Id,
            Pricebook2Id = pricebookId
        );
        insert ord;

        OrderItem item = new OrderItem(
            OrderId = ord.Id,
            Quantity = 1,
            UnitPrice = 100,
            Product2Id = prod.Id,
            PricebookEntryId = pbe.Id
        );
        insert item;
        
        List<OnboardingController.OrderData> orders = new List<OnboardingController.OrderData>();
        OnboardingController.OrderData order = new OnboardingController.OrderData();
        order.id = ord.Id;
        orders.add(order);
        data.orders = orders;
        
        OnboardingController.UserInfos userInfo = OnboardingController.getUserInfo('john.doe@example.com');
        System.assertEquals(null, userInfo);
        OnboardingController.getOnboardingData(contract.Id);
        OnboardingController.searchContacts('TEST_CONTRACT');
        OnboardingController.sendEmail(contract.Id, false, new List<String>{contract.Id});
        OnboardingController.sendEmail(contract.Id, true, new List<String>{contract.Id});
        OnboardingController.saveOnboardingData(contract.Id, '',data);
        List<Elevator_Import_Setting__mdt> setting = [
            SELECT Column_Name__c, Field_Path__c 
            FROM Elevator_Import_Setting__mdt
        ];
        String body = JSON.serialize(new Map<String, Object>{
            'data' => new List<Object>{
                new Map<String, Object>{
                    setting[0].Column_Name__c => setting[0].Field_Path__c,
                        setting[1].Column_Name__c => setting[1].Field_Path__c
                        }
            }
        });
        OnboardingController.handleCsvUpload(body);
        Test.stopTest();
    }

    
    @isTest
    static void testUpsertRecords() {
        Contact newContact = new Contact(FirstName = 'Upsert', LastName = 'Test');
        List<SObject> records = new List<SObject>{ newContact };

        Test.startTest();
        ElevatorAssignmentController.assignElevators(records);
        Test.stopTest();

    }
    
    @isTest
    static void testFetchElevatorAssignments() {
        Contract contract = [SELECT Id FROM Contract LIMIT 1];

        Test.startTest();
        ElevatorAssignmentController.fetchOrderItemsAndElevators(contract.Id);
        Test.stopTest();
    }
    
    @isTest
    static void testFetchLookupRecordsForStandardObject() {
        Test.startTest();
        List<Account> accounts = new List<Account>();
        for(Integer i = 1; i <= 5; i++) {
            accounts.add(new Account(
                Name = 'TestAccount' + i
            ));
        }
        insert accounts;
        List<Map<String,Object>> result = OnboardingController.fetchLookupRecords(
            'Account', 
            'Id, Name', 
            'TestAccount1'
        );
        Test.stopTest();
        
        System.assertNotEquals(0, result.size(), 'Should return at least 1 record');
        System.assertEquals('TestAccount1', result[0].get('Name'));
    }
        
    @IsTest
    static void testOnboardingDataSaveWithElevatorJson() {
        
        Account account = new Account(Name = 'PortfolioAcc',External_ID__c = 'qytt4kFVgmJI');
        insert account;
            
        Contract testContract = new Contract(
            Name = 'Test Contract',
            Portfolio__c = account.Id,
            StartDate = Date.today(),
            AccountId = account.Id
        );
        insert testContract;
        Property_Unit__c propUnit = new Property_Unit__c();
        propUnit.External_ID__c = 'Qnh5cfYaSG3b';
        insert propUnit;
        
        Contract con = [SELECT Id, Portfolio__c FROM Contract LIMIT 1];
        
        String jsonData = getTestJson();
        
        Test.startTest();
        String result = OnboardingController.approveNewElevator(con.Id, jsonData);
        Test.stopTest();
        
        System.assert(result.contains('Success'), 'Onboarding method did not return success');
    }

    static String getTestJson() {
        Order ord = [SELECT Id FROM Order LIMIT 1];
        OrderItem ordItem = [SELECT Id, Product2Id FROM OrderItem WHERE OrderId = :ord.Id LIMIT 1];

        Map<String, Object> productAssignment = new Map<String, Object>{
            'id' => ordItem.Id,
            'productCode' => 'ESE',
            'productId' => ordItem.Product2Id,
            'productName' => 'Elevator SERVICES | Essential'
        };

        Map<String, Object> root = new Map<String, Object>{
            'benefitReceiverId' => 'ETPhTeju7bQB',
            'id' => 'um7kwlfH73gm',
            'invoiceReceiverId' => 'qytt4kFVgmJI',
            'name' => '891234',
            'propertyId' => 'gTpZ7TLa',
            'propertyUnitId' => 'Qnh5cfYaSG3b',
            'status' => 'Submitted'
        };

        Map<String, Object> propertyOwner = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '12345', 'street' => 'Street 0' },
            'completed' => true,
            'id' => '7Mm2L3xWD5tY',
            'name' => 'Owner Name'
        };

        Map<String, Object> propertyOwnerContact = new Map<String, Object>{
            'email' => 'test.pm@mail.com',
            'firstName' => 'Test',
            'id' => 'j4P6sLQV',
            'lastName' => 'Property Manager Contact',
            'phone' => '9999999',
            'title' => 'Property Manager'
        };

        Map<String, Object> assetManager = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'country' => 'Germany', 'postalCode' => '22222', 'street' => '' },
            'email' => '',
            'id' => 'hHOAd9cK',
            'name' => 'Test Operator',
            'type' => ''
        };

        Map<String, Object> assetManagerContact = new Map<String, Object>{
            'email' => 'test.op@mail.com',
            'firstName' => 'Test',
            'id' => 'WrUHx38a',
            'lastName' => 'OP Contact',
            'phone' => '',
            'title' => ''
        };

        Map<String, Object> property = new Map<String, Object>{
            'details' => new Map<String, Object>{
                'address' => new Map<String, Object>{ 'city' => 'Berlin', 'country' => 'Germany', 'postalCode' => '11111', 'street' => '' },
                'assetManagerContactId' => 'WrUHx38a',
                'assetManagerId' => 'hHOAd9cK',
                'businessUnit' => 'bU',
                'id' => 'gTpZ7TLa',
                'name' => 'Test Prop, 111, Berlin',
                'propertyOwnerContactId' => 'j4P6sLQV',
                'propertyOwnerId' => '7Mm2L3xWD5tY'
            },
            'propertyOwner' => propertyOwner,
            'propertyOwnerContact' => propertyOwnerContact,
            'assetManager' => assetManager,
            'assetManagerContact' => assetManagerContact
        };


        Map<String, Object> pm = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'country' => 'Germany', 'postalCode' => '3333', 'street' => 'Test Street 1' },
            'email' => '',
            'id' => '4bICaHX3',
            'name' => 'Test Benefit Receiver'
        };

        Map<String, Object> pmContact = new Map<String, Object>{
            'email' => 'test.pm@mail.com',
            'firstName' => 'Test',
            'id' => 'j4P6sLQV',
            'lastName' => 'Property Manager Contact',
            'phone' => '9999999',
            'title' => 'Property Manager'
        };

        Map<String, Object> fm = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '54321', 'street' => 'Street 2' },
            'id' => 'ETPhTeju7bQB',
            'name' => 'Test BR'
        };

        Map<String, Object> fmContact = new Map<String, Object>{
            'firstName' => 'Test',
            'id' => 'qtKhs1yKOY',
            'lastName' => 'HouseKeeper',
            'phone' => '123891',
            'salutation' => 'Herr.'
        };
        
        Map<String, Object> hv = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'country' => 'Germany', 'postalCode' => '4444', 'street' => 'Street 2' },
            'email' => 'test.ir@mail.com',
            'id' => 'p42bGr5H',
            'name' => 'Test Invoice Receiver',
            'type' => ''
        };
        
        Map<String, Object> hvContact = new Map<String, Object>{
            'firstName' => 'Test',
            'id' => 'qtKhs1yKOY',
            'lastName' => 'HouseKeeper',
            'phone' => '123891',
            'salutation' => 'Herr.'
        };
        
        Map<String, Object> operator = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '', 'street' => 'Street 1' },
            'id' => 'nufF6lGLM56j',
            'name' => 'Test Operator'
        };
        
        Map<String, Object> operatorContact = new Map<String, Object>{
            'firstName' => 'Test',
            'id' => 'qtKhs1yKOY',
            'lastName' => 'HouseKeeper',
            'phone' => '123891',
            'salutation' => 'Herr.'
        };

        Map<String, Object> propertyUnit = new Map<String, Object>{
            'details' => new Map<String, Object>{
                'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '12345', 'street' => 'Street 1' },
                'attendantId' => 'WrUHx38a',
                'firstAiderId' => 'Nud6HayJ',
                'fmContactId' => 'qtKhs1yKOY',
                'fmId' => 'ETPhTeju7bQB',
                'houseKeeperId' => 'qtKhs1yKOY',
                'hvContactId' => 'qtKhs1yKOY',
                'hvId' => 'p42bGr5H',
                'id' => 'Qnh5cfYaSG3b',
                'operatorContactId' => 'qtKhs1yKOY',
                'operatorId' => 'nufF6lGLM56j',
                'pmContactId' => 'j4P6sLQV',
                'pmId' => '4bICaHX3',
                'propertyId' => 'gTpZ7TLa',
                'propertyManagerId' => '1xWIXi9rOL',
                'propertyType' => 'Hospital'
            },
            'pm' => pm,
            'pmContact' => pmContact,
            'fm' => fm,
            'fmContact' => fmContact,
            'hv' => hv,
            'hvContact' => hvContact,
            'operator' => operator,
            'operatorContact' => operatorContact
        };

        Map<String, Object> onSiteContacts = new Map<String, Object>{
            'propertyManager' => new Map<String, Object>{ 'firstName' => 'Test', 'id' => '1xWIXi9rOL', 'lastName' => 'Manager', 'phone' => '89753451', 'salutation' => 'Herr.' },
            'houseKeeper' => new Map<String, Object>{ 'firstName' => 'Test', 'id' => 'qtKhs1yKOY', 'lastName' => 'HouseKeeper', 'phone' => '123891', 'salutation' => 'Herr.' },
            'attendant' => new Map<String, Object>{ 'email' => 'test.op@mail.com', 'firstName' => 'Test', 'id' => 'WrUHx38a', 'lastName' => 'OP Contact', 'phone' => '', 'title' => '' },
            'firstAider' => new Map<String, Object>{ 'email' => 'test.hk@mail.com', 'firstName' => 'Test HK', 'id' => 'Nud6HayJ', 'lastName' => 'Contact', 'phone' => '', 'title' => 'House Keeper' }
        };
        

        Map<String, Object> benefitReceiver = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '54321', 'street' => 'Street 2' },
            'id' => 'ETPhTeju7bQB',
            'name' => 'Test BR'
        };
        
        Map<String, Object> invoiceReceiver = new Map<String, Object>{
            'address' => new Map<String, Object>{ 'city' => 'Berlin', 'postalCode' => '65432', 'street' => 'Street 3' },
            'email' => 'test@invoice.com',
            'id' => 'qytt4kFVgmJI',
            'name' => 'Test IR'
        };

        Map<String, Object> order = new Map<String, Object>{
            'details' => new Map<String, Object>{
                'comment' => 'TEST COMMENT New',
                'customerOrderNumber' => '12345 New',
                'ids' => ord.Id,
                'isRecurring' => true,
                'products' => new List<Object>{
                    new Map<String, Object>{ 'orderItemId' => ordItem.Id, 'productCode' => 'ESE', 'productId' => ordItem.Product2Id, 'productName' => 'Elevator SERVICES | Essential' }
                }
            },
            'benefitReceiver' => benefitReceiver,
            'invoiceReceiver' => invoiceReceiver
        };
        
        root.put('property', property);
        root.put('propertyUnit', propertyUnit);
        root.put('onSiteContacts', onSiteContacts);
        root.put('order', order);

        String jsonData = JSON.serialize(root);
        return jsonData;
    }
}