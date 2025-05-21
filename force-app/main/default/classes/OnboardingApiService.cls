@RestResource(urlMapping='/onboarding/*')
global with sharing class OnboardingApiService {

    @HttpGet
    global static void doGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String contractId = req.params.get('contractId');
        if (String.isBlank(contractId)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, 'Missing required parameter: contractId')
            ));
            return;
        }

        String pathId = req.requestURI.substring(req.requestURI.lastIndexOf('/') + 1);
        Boolean isByElevatorId = !String.isBlank(pathId) && pathId != 'onboarding';

        if (isByElevatorId) {
            Elevator_Staging__c elevator = [
                SELECT Id, Property_Details__c, Property_Unit_Details__c, 
                    On_Site_Contacts__c, Order_Details__c
                FROM Elevator_Staging__c
                WHERE Id = :pathId AND Contract__c = :contractId
                LIMIT 1
            ];

            Map<String, Object> record = new Map<String, Object>{
                'id' => elevator.Id,
                'propertyDetails' => elevator.Property_Details__c,
                'propertyUnitDetails' => elevator.Property_Unit_Details__c,
                'onSiteContacts' => elevator.On_Site_Contacts__c,
                'orderDetails' => elevator.Order_Details__c
            };

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(true, record, 'Elevator details fetched')
            ));
        } else {
            List<Elevator_Staging__c> elevators = [
                SELECT Id, Status__c, Elevator_Name__c
                FROM Elevator_Staging__c
                WHERE Contract__c = :contractId
            ];

            List<Map<String, Object>> data = new List<Map<String, Object>>();
            for (Elevator_Staging__c e : elevators) {
                data.add(new Map<String, Object>{
                    'id' => e.Id,
                    'status' => e.Status__c,
                    'name' => e.Elevator_Name__c
                });
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(true, data, 'Elevators fetched')
            ));
        }
    }



    @HttpPost
    global static void doPost() {
        RestRequest req = RestContext.request;
        
    }

    @HttpPatch
    global static void doPatch() {
        RestRequest req = RestContext.request;
        
    }


    public class ApiResponse {
        public Boolean success;
        public Object data;
        public String message;
    
        public ApiResponse(Boolean success, Object data, String message) {
            this.success = success;
            this.data = data;
            this.message = message;
        }
    }
    
}
