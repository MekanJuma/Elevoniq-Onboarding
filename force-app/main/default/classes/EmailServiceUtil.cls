public class EmailServiceUtil {
    public class EmailParams {
        public List<String> toAddresses;
        public List<String> ccAddresses;
        public List<Id> recipientIds; // contact, user, lead
        public String subject; // subject of the email
        public String plainTextBody; // plain text body of the email
        public String htmlBody; // html body of the email
        public Id templateId; // template id of the email
        public Id targetObjectId; // target object id of the email: contact, user, lead
        public Id whatId; // what object id of the email: relatedTo
        public Id orgWideEmailAddressId; // org wide email address id of the email
        public Boolean useSignature = false;
        public Boolean saveAsActivity = false;
        public Boolean treatTargetObjectAsRecipient = false;
        public Boolean fromCurrentUser = false;

        // public EmailParams() {}
    }

    public static void sendEmail(EmailParams params) {
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();

        if (params.toAddresses != null && !params.toAddresses.isEmpty()) {
            email.setToAddresses(params.toAddresses);
        }

        if (params.ccAddresses != null && !params.ccAddresses.isEmpty()) {
            email.setCcAddresses(params.ccAddresses);
        }

        if (params.recipientIds != null && !params.recipientIds.isEmpty()) {
            for (Id rid : params.recipientIds) {
                String prefix = String.valueOf(rid).substring(0, 3);
                if (prefix == Schema.SObjectType.Contact.getKeyPrefix() ||
                    prefix == Schema.SObjectType.User.getKeyPrefix() ||
                    prefix == Schema.SObjectType.Lead.getKeyPrefix()) {
                    email.setTargetObjectId(rid);
                    break;
                }
            }
            email.setToAddresses(params.recipientIds);
        }

        if (params.subject != null) {
            email.setSubject(params.subject);
        }

        if (params.templateId != null) {
            email.setTemplateId(params.templateId);
        } else {
            if (params.plainTextBody != null) email.setPlainTextBody(params.plainTextBody);
            if (params.htmlBody != null) email.setHtmlBody(params.htmlBody);
        }

        if (params.whatId != null) {
            email.setWhatId(params.whatId);
        }

        if (params.orgWideEmailAddressId != null) {
            email.setOrgWideEmailAddressId(params.orgWideEmailAddressId);
        } else {
            email.setReplyTo(UserInfo.getUserEmail());
            email.setSenderDisplayName(UserInfo.getName());
        }

        email.setUseSignature(params.useSignature);
        email.setSaveAsActivity(params.saveAsActivity);
        email.setTreatTargetObjectAsRecipient(params.treatTargetObjectAsRecipient);
        if (!Test.isRunningTest()) {Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });}   
    }

}