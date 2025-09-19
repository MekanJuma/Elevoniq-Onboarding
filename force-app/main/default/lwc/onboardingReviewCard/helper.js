export const EMAIL_OPTIONS = [
    { label: 'Current User', value: 'Current' },
    { label: 'support@elevoniq.de', value: 'Support' }
];

const SALUTATION_OPTIONS = [
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Ms.', value: 'Ms.' }
];

const PROPERTY_TYPE_OPTIONS = [
    { label: 'Hospital', value: 'Hospital' },
    { label: 'Offices', value: 'Offices' },
    { label: 'Hotel', value: 'Hotel' },
    { label: 'Public Building', value: 'Public Building' },
    { label: 'Residence', value: 'Residence' },
    { label: 'Retirement', value: 'Retirement' },
    { label: 'Industry', value: 'Industry' },
    { label: 'Mall', value: 'Mall' },
    { label: 'Trade', value: 'Trade' },
    { label: 'Other', value: 'Other' }
]


export const prepareObjectData = (objectData, currentStep, isPrevious, isContact) => {
    const obj = getObject(objectData, currentStep, isPrevious, isContact);
    let isAccount = ['owner', 'am', 'pm', 'fm', 'hv', 'operator', 'benefitReceiver', 'invoiceReceiver'].includes(currentStep.key);
    
    return {
        rowId: obj ? obj.id : '',
        flag: isExisting(obj) ? 'Existing' : 'New',
        flagClass: isExisting(obj) ? 'existing-flag' : 'new-flag',
        iconName: isContact ? 'custom:custom15' : iconMap[currentStep.key],
        title: getTitle(currentStep, isContact),
        objectName: getObjectName(currentStep, isContact),
        fields: getFields(obj, currentStep, isContact, isAccount),
        lookupFields: getObjectFields(currentStep, isContact)
    }
}

const isExisting = (obj) => {
    return obj && obj.id != null && obj.id.length === 18;
}

const getObjectName = (currentStep, isContact) => {
    if (isContact) {
        return 'Contact';
    }

    return objectMap[currentStep.key];
}

const getFields = (obj, currentStep, isContact, isAccount) => {

    if (isContact || currentStep.key === 'onSiteContacts') {
        return [
            {
                id: 'contact.firstName',
                name: 'First Name',
                fieldName: 'firstName',
                value: obj ? obj.firstName : ''
            },
            {
                id: 'contact.lastName',
                name: 'Last Name',
                fieldName: 'lastName',
                value: obj ? obj.lastName : ''
            },
            {
                id: 'contact.salutation',
                name: 'Salutation',
                fieldName: 'salutation',
                isPicklist: true,
                options: SALUTATION_OPTIONS,
                value: obj ? obj.salutation : ''
            },
            {
                id: 'contact.title',
                name: 'Title',
                fieldName: 'title',
                value: obj ? obj.title : ''
            },
            {
                id: 'contact.email',
                name: 'Email',
                fieldName: 'email',
                value: obj ? obj.email : ''
            },
            {
                id: 'contact.phone',
                name: 'Phone',
                fieldName: 'phone',
                value: obj ? obj.phone : ''
            }
        ]
    }
    
    if (isAccount) {
        return [
            {
                id: `${currentStep.key}.name`,
                name: 'Name',
                fieldName: 'name',
                value: obj ? obj.name : ''
            },
            {
                id: `${currentStep.key}.email`,
                name: 'Email',
                fieldName: 'email',
                value: obj ? obj.email : ''
            },
            {
                id: `${currentStep.key}.phone`,
                name: 'Phone',
                fieldName: 'phone',
                value: obj ? obj.phone : ''
            },
            {
                id: `${currentStep.key}.address.street`,
                name: 'Street',
                fieldName: 'address.street',
                value: obj ? obj.address?.street : ''
            },
            {
                id: `${currentStep.key}.address.city`,
                name: 'City',
                fieldName: 'address.city',
                value: obj ? obj.address?.city : ''
            },
            {
                id: `${currentStep.key}.address.postalCode`,
                name: 'Postal Code',
                fieldName: 'address.postalCode',
                value: obj ? obj.address?.postalCode : ''
            }
        ]
    }

    if (currentStep.key === 'property') {
        return [
            {
                id: `${currentStep.key}.name`,
                name: 'Name',
                fieldName: 'name',
                value: obj ? obj.name : ''
            },
            {
                id: `${currentStep.key}.businessUnit`,
                name: 'Business Unit',
                fieldName: 'businessUnit',
                value: obj ? obj.businessUnit : ''
            },
            {
                id: `${currentStep.key}.address.street`,
                name: 'Street',
                fieldName: 'address.street',
                value: obj ? obj.address?.street : ''
            },
            {
                id: `${currentStep.key}.address.city`,
                name: 'City',
                fieldName: 'address.city',
                value: obj ? obj.address?.city : ''
            },
            {
                id: `${currentStep.key}.address.postalCode`,
                name: 'Postal Code',
                fieldName: 'address.postalCode',
                value: obj ? obj.address?.postalCode : ''
            }
        ]
    }

    if (currentStep.key === 'propertyUnit') {
        return [
            {
                id: `${currentStep.key}.propertyType`,
                name: 'Property Type',
                fieldName: 'propertyType',
                isPicklist: true,
                options: PROPERTY_TYPE_OPTIONS,
                value: obj ? obj.propertyType : ''
            },
            {
                id: `${currentStep.key}.address.street`,
                name: 'Street',
                fieldName: 'address.street',
                value: obj ? obj.address?.street : ''
            },
            {
                id: `${currentStep.key}.address.city`,
                name: 'City',
                fieldName: 'address.city',
                value: obj ? obj.address?.city : ''
            },
            {
                id: `${currentStep.key}.address.postalCode`,
                name: 'Postal Code',
                fieldName: 'address.postalCode',
                value: obj ? obj.address?.postalCode : ''
            }
        ]
    }

    if (currentStep.key === 'order') {
        return [
            {
                id: `${currentStep.key}.customerOrderNumber`,
                name: 'Customer Order Number',
                fieldName: 'customerOrderNumber',
                value: obj ? obj.customerOrderNumber : ''
            },
            {
                id: `${currentStep.key}.comment`,
                name: 'Comment',
                fieldName: 'comment',
                value: obj ? obj.comment : ''
            },
            {
                id: `${currentStep.key}.products`,
                name: 'Products',
                isList: true,
                list: (obj?.products || []).map(item => ({
                    type: 'icon',
                    label: item?.productCode ?? '',
                    name: item?.id ?? '',
                    iconName: 'standard:product'
                }))
            }
        ]
    }


}

const getObject = (objectData, currentStep, isPrevious, isContact) => {
    let obj;

    if (currentStep.key === 'owner') {
        obj = isContact ? objectData.property.propertyOwnerContact : objectData.property.propertyOwner;
    } else if (currentStep.key === 'am') {
        obj = isContact ? objectData.property.assetManagerContact : objectData.property.assetManager;
    } else if (currentStep.key === 'pm') {
        obj = isContact ? objectData.propertyUnit.pmContact : objectData.propertyUnit.pm;
    } else if (currentStep.key === 'fm') {
        obj = isContact ? objectData.propertyUnit.fmContact : objectData.propertyUnit.fm;
    } else if (currentStep.key === 'hv') {
        obj = isContact ? objectData.propertyUnit.hvContact : objectData.propertyUnit.hv;
    } else if (currentStep.key === 'operator') {
        obj = isContact ? objectData.propertyUnit.operatorContact : objectData.propertyUnit.operator;
    } else if (currentStep.key === 'benefitReceiver') {
        obj = objectData.order.benefitReceiver;
    } else if (currentStep.key === 'invoiceReceiver') {
        obj = objectData.order.invoiceReceiver;
    } else if (currentStep.key === 'property') {
        obj = objectData.property.details;
    } else if (currentStep.key === 'propertyUnit') {
        obj = objectData.propertyUnit.details;
    } else if (currentStep.key === 'order') {
        obj = objectData.order.details;
    } else if (currentStep.key === 'onSiteContacts') {
        let key = currentStep.contactTab ?? 'propertyManager';
        obj = objectData.onSiteContacts[key];
    }

    return isPrevious ? obj?.previousObject : obj;
}

const getTitle = (currentStep, isContact) => {
    if (isContact) {
        return 'Contact Information';
    }

    if (currentStep.key === 'onSiteContacts') {
        return `${contactMap[currentStep.contactTab] || 'Property Manager'} Information`;
    }

    return `${currentStep.label} Information`;
}

const iconMap = {
    property: 'custom:custom24',
    propertyUnit: 'custom:custom107',
    owner: 'custom:custom24',
    am: 'custom:custom24',
    pm: 'custom:custom24',
    fm: 'custom:custom24',
    hv: 'custom:custom24',
    operator: 'custom:custom24',
    order: 'custom:custom17',
    benefitReceiver: 'custom:custom24',
    invoiceReceiver: 'custom:custom24',
    contact: 'custom:custom15',
    onSiteContacts: 'custom:custom15'
}

const objectMap = {
    property: 'Property__c',
    propertyUnit: 'Property_Unit__c',
    owner: 'Account',
    am: 'Account',
    pm: 'Account',
    fm: 'Account',
    hv: 'Account',
    operator: 'Account',
    benefitReceiver: 'Account',
    invoiceReceiver: 'Account',
    onSiteContacts: 'Contact'
}

const contactMap = {
    propertyManager: 'Property Manager',
    houseKeeper: 'House Keeper',
    attendant: 'Attendant',
    firstAider: 'First Aider'
}



export const getObjectFields = (currentStep, isContact) => {
    if (isContact || currentStep.key === 'onSiteContacts') {
        return 'Id,Salutation,FirstName,LastName,Title,Email,Phone';
    }

    const isAccount = ['owner', 'am', 'pm', 'fm', 'hv', 'operator', 'benefitReceiver', 'invoiceReceiver'].includes(currentStep.key);
    if (isAccount) {
        return 'Id,Name,Email__c,Phone,BillingStreet,BillingCity,BillingPostalCode';
    }

    if (currentStep.key === 'property') {
        return 'Id,Name,Business_Unit__c,Street__c,City__c,Zip__c';
    } else if (currentStep.key === 'propertyUnit') {
        return 'Id,Name,PropertyUnit_Type__c,Street__c,City__c,Zip__c,Property__c';
    }
}