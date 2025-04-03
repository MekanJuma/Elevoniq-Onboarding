public without sharing class OnboardingController {
    
    public class UserWrapper {
        @AuraEnabled
        public String id { get; set; }
        @AuraEnabled
        public String name { get; set; }
        @AuraEnabled
        public String email { get; set; }
        @AuraEnabled
        public String companyId { get; set; }
        @AuraEnabled
        public String companyName { get; set; }
    }

    public class OrderWrapper {
        @AuraEnabled
        public String orderItemId { get; set; }
        @AuraEnabled
        public String productName { get; set; }
        @AuraEnabled
        public Decimal unitPrice { get; set; }
        @AuraEnabled
        public String interval { get; set; }
    }

    public class OnboardingDataWrapper {
        @AuraEnabled
        public UserWrapper user { get; set; }
        @AuraEnabled
        public List<OrderWrapper> orders { get; set; }
    }

    @AuraEnabled(cacheable=true)
    public static OnboardingDataWrapper getOnboardingData(String userId, String contractId) {
        try {
            OnboardingDataWrapper response = new OnboardingDataWrapper();
            
            // Get User and Company Details
            External_User__c externalUser = [
                SELECT 
                    Id, 
                    Contact__r.Name,
                    Contact__r.Email,
                    Contact__r.Account.Name,
                    Contact__r.AccountId
                FROM External_User__c 
                WHERE User_Id__c = :userId
                LIMIT 1
            ];
            
            // Set User Info
            UserWrapper userInfo = new UserWrapper();
            userInfo.id = externalUser.Id;
            userInfo.name = externalUser.Contact__r.Name;
            userInfo.email = externalUser.Contact__r.Email;
            userInfo.companyId = externalUser.Contact__r.AccountId;
            userInfo.companyName = externalUser.Contact__r.Account.Name;
            response.user = userInfo;
            
            // Get Order Details
            List<OrderItem> orderItems = [
                SELECT 
                    Id,
                    Product2.Name,
                    Quantity,
                    Adjusted_Unit_Price__c,
                    Order.Payment_Interval__c
                FROM OrderItem 
                WHERE Order.ContractId = :contractId
            ];
            
            // Set Order Info
            response.orders = new List<OrderWrapper>();
            for(OrderItem item : orderItems) {
                OrderWrapper order = new OrderWrapper();
                order.orderItemId = item.Id;
                order.productName = item.Product2.Name;
                order.unitPrice = item.Adjusted_Unit_Price__c;
                order.interval = item.Order.Payment_Interval__c;
                response.orders.add(order);
            }
            
            return response;
        } catch (Exception e) {
            String errorMessage = 'Error retrieving onboarding data:\n' + 
                                'Message: ' + e.getMessage() + '\n' +
                                'Line number: ' + e.getLineNumber() + '\n' +
                                'Stack trace: ' + e.getStackTraceString();
            throw new AuraHandledException(errorMessage);
        }
    }
}