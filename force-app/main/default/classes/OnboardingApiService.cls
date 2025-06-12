@RestResource(urlMapping='/onboarding/*')
global with sharing class OnboardingApiService {

    @HttpGet
    global static void doGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String userId = req.headers.get('userid');
        String contractId = req.headers.get('contractid');

        if (String.isBlank(contractId) || String.isBlank(userId)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, 'Missing required parameter: contractId or userId')
            ));
            return;
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
                new ApiResponse(false, null, e.getMessage() + ' - ' + e.getStackTraceString())
            ));
        }
    }



    @HttpPost
    global static void doPost() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String userId = req.headers.get('userid');
        String contractId = req.headers.get('contractid');
        String mode = req.headers.get('mode');

        if (String.isBlank(userId) && String.isBlank(contractId)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, 'Missing required parameters: userId and contractId')
            ));
            return;
        }

        try {
            String body = req.requestBody.toString();
            if (mode != null && mode.toLowerCase() == 'upload') {
                OnboardingController.OnboardingData data = OnboardingController.handleCsvUpload(body);
    
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(
                    new ApiResponse(true, data, 'CSV data uploaded and processed successfully')
                ));
                return;
            }



            OnboardingController.OnboardingData data = (OnboardingController.OnboardingData) JSON.deserialize(body, OnboardingController.OnboardingData.class);

            if (
                data.elevators.size() > 200 || 
                data.properties.size() > 200 || 
                data.propertyUnits.size() > 200 ||
                data.accounts.size() > 200 ||
                data.contacts.size() > 200
            ) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(
                    new ApiResponse(false, null, 'You cannot onboard more than 200 elevators.')
                ));
                return;
            }
            
            // Save the data to the database
            OnboardingController.saveOnboardingData(contractId, userId, data);

            // Success Response
            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(true, null, 'Onboarding data submitted successfully')
            ));

        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new ApiResponse(false, null, e.getMessage() + ' - ' + e.getStackTraceString())
            ));
        }
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
