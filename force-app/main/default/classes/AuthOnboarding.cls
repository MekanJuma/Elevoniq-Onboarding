public without sharing class AuthOnboarding {

    public static String baseUrl = System.URL.getOrgDomainUrl().toExternalForm() + '/services/apexrest/onboarding';
    
    
    
    
    private static HttpResponse makeRequest(String method, String body, Map<String, String> queryParams) {
        HttpRequest req = new HttpRequest();
        String endpoint = baseUrl;
    
        if (queryParams != null && !queryParams.isEmpty()) {
            List<String> encodedParams = new List<String>();
            for (String key : queryParams.keySet()) {
                encodedParams.add(
                    EncodingUtil.urlEncode(key, 'UTF-8') + '=' +
                    EncodingUtil.urlEncode(queryParams.get(key), 'UTF-8')
                );
            }
            endpoint += '?' + String.join(encodedParams, '&');
        }
    
        req.setEndpoint(endpoint);
        req.setMethod(method);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + getAccessToken());
    
        if (String.isNotBlank(body)) {
            req.setBody(body);
        }
    
        return new Http().send(req);
    }


    @AuraEnabled
    public static string authorize(){
        return getAccessToken();
    }

    public static String getAccessToken() {
        String domain = [SELECT IsSandbox FROM Organization LIMIT 1].IsSandbox ? 'test' : 'login';
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://' + domain + '.salesforce.com/services/oauth2/token');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setBody(
            'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer' +
            '&assertion=' + EncodingUtil.urlEncode(System.Label.JWT_Bearer_Token, 'UTF-8')
        );

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> resMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            return (String) resMap.get('access_token');
        } else {
            throw new CalloutException('JWT Auth failed: ' + res.getBody());
        }
    }
}