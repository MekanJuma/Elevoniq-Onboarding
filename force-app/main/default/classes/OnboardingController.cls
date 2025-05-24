public with sharing class OnboardingController {
    



    public static OnboardingData getOnboardingData(String contractId, String userId) {
        List<Elevator_Staging__c> stagedElevators = [
            SELECT 
                Id, Status__c, Elevator__c, Elevator_Details__c,
                Property_Details__c, Property_Unit_Details__c,
                Accounts__c, Contacts__c, Order_Details__c
            FROM Elevator_Staging__c
            WHERE Contract__c = :contractId
        ];

        Map<String, Elevator> elevatorMap = new Map<String, Elevator>();
        Map<String, Property> propertyMap = new Map<String, Property>();
        Map<String, PropertyUnit> propertyUnitMap = new Map<String, PropertyUnit>();
        Map<String, AccountData> accountMap = new Map<String, AccountData>();
        Map<String, ContactData> contactMap = new Map<String, ContactData>();
        Map<String, OrderData> orderDataMap = new Map<String, OrderData>();
        for (Order o : [
            SELECT Id, Type, Payment_Interval__c, Description, Mode_of_Payment__c, Customer_Order_Number__c
            FROM Order WHERE ContractId = :contractId
        ]) {
            OrderData od = new OrderData(o.Id);
            od.isRecurring = o.Type == 'Recurring Service' ? true : false;
            od.paymentInterval = o.Payment_Interval__c;
            od.comment = o.Description;
            od.modeOfPayment = o.Mode_of_Payment__c;
            od.customerOrderNumber = o.Customer_Order_Number__c;
            orderDataMap.put(o.Id, od);
        }


        for (Elevator_Staging__c stagedElevator : stagedElevators) {
            // Elevator
            if (!String.isEmpty(stagedElevator.Elevator_Details__c)) {
                Elevator elevator = new Elevator(stagedElevator.Elevator_Details__c);
                if (!String.isEmpty(elevator.id) && !elevatorMap.containsKey(elevator.id)) {
                    elevatorMap.put(elevator.id, elevator);
                }
            }

            // Property
            if (!String.isEmpty(stagedElevator.Property_Details__c)) {
                Property property = new Property(stagedElevator.Property_Details__c);
                if (!String.isEmpty(property.id) && !propertyMap.containsKey(property.id)) {
                    propertyMap.put(property.id, property);
                }
            }

            // Property Unit
            if (!String.isEmpty(stagedElevator.Property_Unit_Details__c)) {
                PropertyUnit propertyUnit = new PropertyUnit(stagedElevator.Property_Unit_Details__c);
                if (!String.isEmpty(propertyUnit.id) && !propertyUnitMap.containsKey(propertyUnit.id)) {
                    propertyUnitMap.put(propertyUnit.id, propertyUnit);
                }
            }

            // Account
            if (!String.isEmpty(stagedElevator.Accounts__c)) {
                List<AccountData> accounts = (List<AccountData>)JSON.deserialize(stagedElevator.Accounts__c, List<AccountData>.class);
                for (AccountData acc : accounts) {
                    if (!String.isEmpty(acc.id) && !accountMap.containsKey(acc.id)) {
                        accountMap.put(acc.id, acc);
                    }
                }
            }            

            // Contact
            if (!String.isEmpty(stagedElevator.Contacts__c)) {
                List<ContactData> contacts = (List<ContactData>)JSON.deserialize(stagedElevator.Contacts__c, List<ContactData>.class);
                for (ContactData con : contacts) {
                    if (!String.isEmpty(con.id) && !contactMap.containsKey(con.id)) {
                        contactMap.put(con.id, con);
                    }
                }
            }
            

            // Order
            if (!String.isEmpty(stagedElevator.Order_Details__c)) {
                OrderData stagedOrderData = new OrderData(stagedElevator.Order_Details__c);
                if (!String.isEmpty(stagedOrderData.id) && orderDataMap.containsKey(stagedOrderData.id)) {
                    OrderData existing = orderDataMap.get(stagedOrderData.id);
                    existing.modeOfPayment = stagedOrderData.modeOfPayment;
                    existing.paymentInterval = stagedOrderData.paymentInterval;
                    existing.customerOrderNumber = stagedOrderData.customerOrderNumber;
                    existing.comment = stagedOrderData.comment;
                }
            }
        }

        OnboardingData result = new OnboardingData();
        result.elevators.addAll(elevatorMap.values());
        result.accounts.addAll(accountMap.values());
        result.contacts.addAll(contactMap.values());
        result.properties.addAll(propertyMap.values());
        result.propertyUnits.addAll(propertyUnitMap.values());
        result.orders.addAll(orderDataMap.values());
        return result;
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
        public Boolean isNew;

        public Elevator(String elevatorDetails) {
            Elevator elevatorObj = (Elevator)JSON.deserialize(elevatorDetails, Elevator.class);
            this.id = elevatorObj.id;
            this.name = elevatorObj.name;
            this.status = elevatorObj.status;
            this.propertyUnitId = elevatorObj.propertyUnitId;
            this.propertyId = elevatorObj.propertyId;
            this.benefitReceiverId = elevatorObj.benefitReceiverId;
            this.invoiceReceiverId = elevatorObj.invoiceReceiverId;
            this.productAssignments = elevatorObj.productAssignments;
            this.isChanged = false;
            this.isNew = false;
        }
    }

    public class Property {
        public String id;
        public Address address;
        public String propertyOwnerId;
        public String propertyOwnerContactId;
        public String assetManagerId;
        public String assetManagerContactId;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
        public Property(String propertyDetails) {
            Property propertyObj = (Property)JSON.deserialize(propertyDetails, Property.class);
            this.id = propertyObj.id;
            this.address = propertyObj.address;
            this.propertyOwnerId = propertyObj.propertyOwnerId;
            this.propertyOwnerContactId = propertyObj.propertyOwnerContactId;
            this.assetManagerId = propertyObj.assetManagerId;
            this.assetManagerContactId = propertyObj.assetManagerContactId;
            this.isChanged = false;
            this.completed = propertyObj.completed;
            this.isNew = false;
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
        public PropertyUnit(String propertyUnitDetails) {
            PropertyUnit propertyUnitObj = (PropertyUnit)JSON.deserialize(propertyUnitDetails, PropertyUnit.class);
            this.id = propertyUnitObj.id;
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
    }

    public class ContactData {
        public String id;
        public String firstName;
        public String lastName;
        public String title;
        public String email;
        public String phone;
        public String accountId;

        public Boolean isChanged;
        public Boolean completed;
        public Boolean isNew;
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

        public OrderData(String orderDetails) {
            OrderData orderDataObj = (OrderData)JSON.deserialize(orderDetails, OrderData.class);
            this.id = orderDataObj.id;
            this.modeOfPayment = orderDataObj.modeOfPayment;
            this.paymentInterval = orderDataObj.paymentInterval;
            this.customerOrderNumber = orderDataObj.customerOrderNumber;
            this.isRecurring = orderDataObj.isRecurring;
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
    }

}