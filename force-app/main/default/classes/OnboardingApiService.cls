@RestResource(urlMapping='/onboarding/*')
global with sharing class OnboardingApiService {

    @HttpGet
    global static void doGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String contractId = req.params.get('contractId');
        String userId = req.params.get('userId');

        if (String.isBlank(contractId) || String.isBlank(userId)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, 'Missing required parameter: contractId or userId')
            ));
        }

        try {
            OnboardingController.OnboardingData data = OnboardingController.getOnboardingData(contractId, userId);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(true, data, 'Elevators fetched')
            ));
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, e.getMessage())
            ));
        }

        // String pathId = req.requestURI.substring(req.requestURI.lastIndexOf('/') + 1);
        // Boolean isByElevatorId = !String.isBlank(pathId) && pathId != 'onboarding';        
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
