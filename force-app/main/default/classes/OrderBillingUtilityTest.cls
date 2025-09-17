@isTest
public class OrderBillingUtilityTest {
	private static final String COMPANY_NAME = 'Test Company';
	private static final String BR_NAME = 'Benefit Receiver';
	private static final String IR_NAME = 'Invoice Receiver';
	private static final String TEST_EMAIL = 'invoice.receiver@example.com';
	
	@testSetup
	static void setupTestData() {
		// Create test accounts
		Account company = createCompanyAccount();
		Account benefitReceiver = createBenefitReceiverAccount();
		Invoice_Reciever__c invoiceReceiver = createInvoiceReceiver();
		
		// Create products and elevator
		Product2 testPackageProduct = TestDataFactory.createProduct('Package', 'TEST_PACKAGE');
		Product2 testServiceProduct = TestDataFactory.createProduct('Service', 'TEST_SERVICE');
		Elevator__c testElevator = createAndUpdateTestElevator(company, benefitReceiver, invoiceReceiver);
		
		// Setup price books and other test data
		setupPriceBooksAndTestData(testPackageProduct, testServiceProduct);
		
		// Create contract
		Contract contract = createAndActivateContract(company);
		
		// Create orders with different payment intervals
		createOrderWithRelatedRecords(contract, testServiceProduct, testElevator, benefitReceiver, invoiceReceiver, 'Monthly', 'Recurring Service');
		createOrderWithRelatedRecords(contract, testServiceProduct, testElevator, benefitReceiver, invoiceReceiver, 'One-Time', 'Document');
        
        // Create api settings
        API_Settings__c zohoSettings = new API_Settings__c();
        zohoSettings.Name= 'Zoho_Billing';
        zohoSettings.Access_Token__c = 'test_access_token';
        zohoSettings.Expiration__c = Datetime.now();
        insert zohoSettings;

		// Create Billing_Target__c for whole year
        for (Integer i = 1; i <= 12; i++) {
            Billing_Target__c bt = new Billing_Target__c(
                Year__c = String.valueOf(Date.today().year()),
                Month__c = BillingTargetController.monthKey(i),
                Target__c = 1000,
                Can_Exceed__c = 100
            );
            insert bt;
        }
	}
	
	private static Account createCompanyAccount() {
		Account company = new Account(
			Name = COMPANY_NAME,
			RecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Company').getRecordTypeId()
		);
		insert company;
		return company;
	}
	
	private static Account createBenefitReceiverAccount() {
		Account benefitReceiver = new Account(
			Name = BR_NAME,
			ShippingStreet = '123 Benefit St',
			ShippingPostalCode = '12345',
			ShippingCity = 'Benefit City',
			RecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Office_PM').getRecordTypeId()
		);
		insert benefitReceiver;
		return benefitReceiver;
	}
	
	private static Invoice_Reciever__c  createInvoiceReceiver() {
		Account invoiceReceiver = new Account(
			Name = IR_NAME,
			BillingStreet = '456 Invoice St',
			BillingPostalCode = '67890',
			BillingCity = 'Invoice City',
			Email__c = TEST_EMAIL
		);
		insert invoiceReceiver;

		Invoice_Reciever__c  invoiceReceiverRecord = new Invoice_Reciever__c (
			Invoice_Receiver__c = invoiceReceiver.Id,
			Name = IR_NAME,
			Invoice_email__c = TEST_EMAIL
		);

		insert invoiceReceiverRecord;

		return invoiceReceiverRecord;
	}
	
	private static Elevator__c createAndUpdateTestElevator(Account company, Account benefitReceiver, Invoice_Reciever__c invoiceReceiver) {
		Elevator__c testElevator = TestDataFactory.createElevator(null, '11111');
		testElevator.Portfolio__c = company.Id;
		update testElevator;
		
		Property_Unit__c pu = [SELECT Id FROM Property_Unit__c WHERE Id = :testElevator.PropertyUnit__c LIMIT 1];
		pu.Invoice_Receiver__c = invoiceReceiver.Invoice_Receiver__c;
		pu.BR_Company__c = benefitReceiver.Id;
		update pu;
		
		return testElevator;
	}
	
	private static void setupPriceBooksAndTestData(Product2 testPackageProduct, Product2 testServiceProduct) {
		TestDataFactory.createPriceBook('Sales', 'SALES_PRICEBOOK', new List<Product2>{testPackageProduct, testServiceProduct});
		TestDataFactory.createPriceBook('Modernization', 'MOD_PRICEBOOK', new List<Product2>{testPackageProduct, testServiceProduct});
		
		TestDataProvider dataProvider = new TestDataProvider();
		dataProvider.prepareAccountsAndSettings();
		dataProvider.prepareElevatorEnvironment();
	}
	
	private static Contract createAndActivateContract(Account company) {
		Opportunity testOpportunity = TestDataFactory.createOpportunity('Sales', company, 'TEST_OPPORTUNITY');
		
		Contract contract = new Contract(
			AccountId = company.Id,
			StartDate = Date.newInstance(2024, 01, 01),
			Opportunity__c = testOpportunity.Id,
			Status = 'Draft'
		);
		insert contract;
		
		contract.Status = 'Activated';
		update contract;
		
		return contract;
	}
	
	private static void createOrderWithRelatedRecords(Contract contract, Product2 testServiceProduct, Elevator__c testElevator, Account benefitReceiver, Invoice_Reciever__c invoiceReceiver, String paymentInterval, String orderType) {
		// Create Order
		Order testOrder = new Order(
			Name = 'Test Order - ' + paymentInterval,
			Status = 'Active',
			ContractId = contract.Id,
			Pricebook2Id = Test.getStandardPricebookId(),
			EffectiveDate = System.today().addYears(-1),
			EndDate = System.today().addYears(2),
			Mode_of_Payment__c = 'In Advance',
			Payment_Interval__c = paymentInterval,
			Type = orderType,
			Invoice_Method__c = 'By Benefit Receiver'
		);
		insert testOrder;
		
		// Create Order Items
		PricebookEntry pEntry = [SELECT Id FROM PricebookEntry WHERE Product2Id = :testServiceProduct.Id LIMIT 1];
		OrderItem testOrderItem = new OrderItem(
            OrderId = testOrder.Id,
            Product2Id = testServiceProduct.Id,
            UnitPrice = 100.00,
            Quantity = 1,
            PricebookEntryId = pEntry.Id
        );
        insert testOrderItem;
		
		// Create Order Elevator Relations
		OrderElevatorRelation__c orderElevatorRelation = new OrderElevatorRelation__c(
            Order_Item__c = testOrderItem.Id,
            Elevator__c = testElevator.Id,
            Benefit_Receiver__c = benefitReceiver.Id,
            Invoice_Receiver__c = invoiceReceiver.Id
        );
		insert orderElevatorRelation;
	}

	@isTest
    static void testBenefitReceiverSync() {
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = BenefitReceiverSyncScheduler.scheduleDaily();
        Test.stopTest();
    }
    
    @isTest
    static void testProductSync() {
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = ProductSyncScheduler.scheduleDaily();
        Test.stopTest();
    }
    
    @isTest
    static void testInvoiceSyncRecurring() {
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = InvoiceScheduler.scheduleRecurringInvoiceSync();
        Test.stopTest();
    }

    @isTest
    static void testInvoiceSyncOneTime() {
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = InvoiceScheduler.scheduleOneTimeInvoiceSync();
        Test.stopTest();
    }
	
	@isTest
	static void testGetInvoices() {
		Test.startTest();
		List<OrderBillingUtility.InvoiceData> invoiceList = OrderBillingUtility.getInvoices(true);
		Test.stopTest();
        
        List<Order> orders = [SELECT Id FROM Order];
        List<Id> orderIds = new List<Id>();
        for (Order ord : orders) {
            orderIds.add(ord.Id);
        }
        
        OrderBillingUtility.getInvoices(true, '01.07.2025 - 30.09.2025', '01.07.2025', orderIds);
	}
    
    @isTest
	static void testGetInvoices_Onetimers() {
        List<Service_Fulfillment__c> fulfillments = [SELECT Id, Status__c FROM Service_Fulfillment__c WHERE Status__c = 'Pending'];
        for (Service_Fulfillment__c f : fulfillments) {
            f.Status__c = 'Fulfilled';
        }
        update fulfillments;
        
		Test.startTest();
		List<OrderBillingUtility.InvoiceData> invoiceList = OrderBillingUtility.getInvoices(false);
		Test.stopTest();
	}

    @isTest
    static void testBenefitReceiverSyncWithZoho() {
        // Get a benefit receiver account
        Account benefitReceiver = [SELECT Id, Zoho_Customer_Id__c, Synced_with_Zoho__c 
                                 FROM Account 
                                 WHERE Name = :BR_NAME LIMIT 1];
        
        // Set Zoho Customer Id but not synced
        benefitReceiver.Zoho_Customer_Id__c = 'TEST_ZOHO_ID';
        benefitReceiver.Synced_with_Zoho__c = false;
        update benefitReceiver;
        
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = BenefitReceiverSyncScheduler.scheduleDaily();
        Test.stopTest();
    }
    
    @isTest
    static void testProductSyncWithZoho() {
        // Get a test product
        Product2 testProduct = [SELECT Id, Zoho_Item_Id__c, Synced_with_Zoho__c 
                              FROM Product2 
                              WHERE ProductCode = 'TEST_SERVICE' LIMIT 1];
        
        // Set Zoho Item Id but not synced
        testProduct.Zoho_Item_Id__c = 'TEST_ITEM_ID';
        testProduct.Synced_with_Zoho__c = false;
        update testProduct;
        
        Test.setMock(HttpCalloutMock.class, new ZohoBillingAPIMock());
        
        Test.startTest();
        String jobId = ProductSyncScheduler.scheduleDaily();
        Test.stopTest();
        
        OrderBillingUtility.logError('ProductSyncScheduler', 'Test Message', new DummyException('Custom boom'));
    }
    
    private class DummyException extends Exception {}
}