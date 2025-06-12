import { generateUniqueId } from 'c/onboardingUtils';


// ! CONSTANTS
const ELEVATOR_STATUS = {
    APPROVED: 'Approved',
    CHANGED: 'Changed',
    PENDING: 'Pending'
}

const NO_ELEVATORS_FOUND = {
    ILLUSTRATOR: 'noContent',
    TITLE: 'No Elevators Found',
    MESSAGE: "It's time to add your first elevator",
}

const ERROR = {
    ILLUSTRATOR: 'noAccess',
    TITLE: 'Something went wrong',
    MESSAGE: "Please try again",
}




// ! PICKLIST OPTIONS
const COUNTRY_OPTIONS = [
    { label: 'Germany', value: 'DE' },
    { label: 'Austria', value: 'AT' }
]

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

const PAYMENT_INTERVAL_OPTIONS = [
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Quarterly', value: 'Quarterly' },
    { label: 'Yearly', value: 'Yearly' },
    { label: 'One-time', value: 'One-time' }
]

const MODE_OF_PAYMENT_OPTIONS = [
    { label: 'In Advance', value: 'In Advance' },
    { label: 'Retrospectively', value: 'Retrospectively' }
]

const SALUTATION_OPTIONS = [
    { label: 'Herr.', value: 'Herr.' },
    { label: 'Frau.', value: 'Frau.' }
]


// ! REQUIRED FIELDS
const PROPERTY_REQUIRED_FIELDS = [
    {
        id: 'property.name',
        name: "Property Name"
    }
]

const PROPERTY_UNIT_REQUIRED_FIELDS = [
    {
        id: 'address',
        isAddress: true,
        name: "Address - Zip Code"
    }
]

const ACCOUNT_REQUIRED_FIELDS = [
    {
        id: 'account.name',
        name: "Account Name"
    },
    {
        id: 'account.address',
        isAddress: true,
        name: "Address - Zip Code"
    }
]

const CONTACT_REQUIRED_FIELDS = [
    {
        id: 'contact.firstName',
        name: "First Name"
    },
    {
        id: 'contact.lastName',
        name: "Last Name"
    },
    {
        id: 'contact.email',
        name: "Email"
    }
]

const REQUIRED_FIELDS = {
    'property.details': PROPERTY_REQUIRED_FIELDS,
    'property.propertyOwner': [...ACCOUNT_REQUIRED_FIELDS],
    'property.assetManager': [...ACCOUNT_REQUIRED_FIELDS],
    'propertyUnit.details': PROPERTY_UNIT_REQUIRED_FIELDS,
    'propertyUnit.pm': [...ACCOUNT_REQUIRED_FIELDS, ...CONTACT_REQUIRED_FIELDS],
    'propertyUnit.fm': [...ACCOUNT_REQUIRED_FIELDS],
    'propertyUnit.hv': [...ACCOUNT_REQUIRED_FIELDS, ...CONTACT_REQUIRED_FIELDS],
    'propertyUnit.operator': [...ACCOUNT_REQUIRED_FIELDS, ...CONTACT_REQUIRED_FIELDS],
    'onSiteContacts.propertyManager': CONTACT_REQUIRED_FIELDS,
    'onSiteContacts.houseKeeper': CONTACT_REQUIRED_FIELDS,
    'onSiteContacts.attendant': CONTACT_REQUIRED_FIELDS,
    'onSiteContacts.firstAider': CONTACT_REQUIRED_FIELDS,
    'order.details': [],
    'order.benefitReceiver': ACCOUNT_REQUIRED_FIELDS,
    'order.invoiceReceiver': [...ACCOUNT_REQUIRED_FIELDS, { id: 'account.email', name: "Email" }]
}



// ! DATA STEPS
const STEPS = {
    STEP1: {
        title: "Schritt 1: Liegenschaft",
        icon: "utility:home",
        tasks: [
            { id: 'property.details', name: "Liegenschaft" },
            { id: 'property.propertyOwner', name: "Eigentümer" },
            { id: 'property.assetManager', name: "AM Unternehmen" }
        ]
    },
    STEP2: {
        title: "Schritt 2: Verwaltungseinheit",
        icon: "utility:puzzle",
        tasks: [
            { id: 'propertyUnit.details', name: "Verwaltungseinheit" },
            { id: 'propertyUnit.pm', name: "PM Unternehmen" },
            { id: 'propertyUnit.fm', name: "FM Unternehmen" },
            { id: 'propertyUnit.hv', name: "HV (Hausverwaltung)" },
            { id: 'propertyUnit.operator', name: "Betreiber" }
        ]
    },
    STEP3: {
        title: "Schritt 3: Vor-Ort-Kontakte",
        icon: "utility:people",
        tasks: [
            { id: 'onSiteContacts.propertyManager', name: "Objektbetreuer" },
            { id: 'onSiteContacts.houseKeeper', name: "Hausmeister" },
            { id: 'onSiteContacts.attendant', name: "Aufzugswärter" },
            { id: 'onSiteContacts.firstAider', name: "Ersthelfer" }
        ]
    },
    STEP4: {
        title: "Schritt 4: Bestellung",
        icon: "utility:money",
        tasks: [
            { id: 'order.details', name: "Bestellung" },
            { id: 'order.productAssignment', name: "Produktzuordnung" },
            { id: 'order.benefitReceiver', name: "Leistungsempfänger" },
            { id: 'order.invoiceReceiver', name: "Rechnungsempfänger" }
        ]
    }
};

const SECTIONS_MAP = {
    'property.details': {
        isProperty: true,
        title: "Property Details",
        icon: "utility:checkin",
    },
    'property.propertyOwner': {
        isAccount: true,
        isContact: true,
        title: "Property Owner",
        icon: "utility:company",
    },
    'property.assetManager': {
        isAccount: true,
        isContact: true,
        title: "Asset Manager",
        icon: "utility:company",
    },
    'propertyUnit.details': {
        isPropertyUnit: true,
        title: "Property Unit Details",
        icon: "utility:checkin",
    },
    'propertyUnit.pm': {
        isAccount: true,
        isContact: true,
        title: "Property Management",
        icon: "utility:company",
    },
    'propertyUnit.fm': {
        isAccount: true,
        isContact: true,
        title: "Facility Management",
        icon: "utility:company",
    },
    'propertyUnit.hv': {
        isAccount: true,
        isContact: true,
        title: "Hausverwaltung",
        icon: "utility:company",
    },
    'propertyUnit.operator': {
        isAccount: true,
        isContact: true,
        title: "Operator",
        icon: "utility:company",
    },
    'onSiteContacts.propertyManager': {
        isContact: true,
        title: "Property Manager",
        icon: "utility:company",
    },
    'onSiteContacts.houseKeeper': {
        isContact: true,
        title: "Housekeeper",
        icon: "utility:company",
    },
    'onSiteContacts.attendant': {
        isContact: true,
        title: "Attendant",
        icon: "utility:company",
    },
    'onSiteContacts.firstAider': {
        isContact: true,
        title: "First Aider",
        icon: "utility:company",
    },
    'order.details': {
        isOrderDetails: true,
        title: "Order Details",
        icon: "utility:money",
    },
    'order.productAssignment': {
        isProductAssignment: true,
        title: "Product Assignment",
        icon: "utility:assignment",
    },
    'order.benefitReceiver': {
        isAccount: true,
        title: "Benefit Receiver",
        icon: "utility:company",
    },
    'order.invoiceReceiver': {
        isAccount: true,
        title: "Invoice Receiver",
        icon: "utility:company",
    }
}



// ! LOOKUP
const LOOKUP_OBJECTS = {
    account: {
        objectType: 'account',
        title: "Firmen suchen",
        icon: "utility:company",
    },
    contact: {
        objectType: 'contact',
        title: "Kontakt suchen",
        icon: "utility:people",
    },
    property: {
        objectType: 'property',
        title: "Liegenschaft suchen",
        icon: "utility:home",
    },
    propertyUnit: {
        objectType: 'propertyUnit',
        title: "Verwaltungseinheit suchen",
        icon: "utility:puzzle",
    }
}



// ! DATA/OBJECT STRUCTURE
const PROPERTY = {
    id: `newProperty_${generateUniqueId()}`,
    businessUnit: "",
    address: {
        street: "",
        city: "",
        postalCode: "",
        country: ""
    },
    propertyOwnerId: "",
    assetManagerId: "",
    isChanged: true,
    completed: true,
    isNew: true
}

const PROPERTY_UNIT = {
    id: `newPropertyUnit_${generateUniqueId()}`,
    propertyType: "",
    address: {
        street: "",
        city: "",
        postalCode: "",
        country: ""
    },
    propertyId: "",
    pmId: "",
    pmContactId: "",
    fmId: "",
    fmContactId: "",
    hvId: "",
    hvContactId: "",
    operatorId: "",
    operatorContactId: "",
    isChanged: false,
    completed: false,
    isNew: true
}

const ELEVATOR = {
    name: "Neuer Aufzug",
    status: "New",
    propertyUnitId: "",
    propertyId: "",
    benefitReceiverId: "",
    invoiceReceiverId: "",
    className: "tab active-tab",
    icon: 'utility:add',
    tooltip: 'Neu',
    isChanged: true,
    isActive: true,
    isEditing: true,
    isNew: true,
}

const ACCOUNT = {
    id: `newAccount_${generateUniqueId()}`,
    name: "",
    email: "",
    type: "",
    address: {
        street: "",
        city: "",
        postalCode: "",
        country: ""
    },
    isChanged: false,
    isNew: true,
    completed: false
}

const CONTACT = {
    id: `newContact_${generateUniqueId()}`,
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    accountId: "",
    isChanged: false,
    completed: false,
    isNew: true
}

const ORDER = {
    order: {
        id: `newOrder_${generateUniqueId()}`,
        modeOfPayment: "",
        paymentInterval: "",
        customerOrderNumber: "",
        type: "",
        comment: ""
    },
    orderItem: {
        id: `newOrderItem_${generateUniqueId()}`,
        product: {
            id: `newProduct_${generateUniqueId()}`,
            name: "",
        }
    }     
}






export { 
    ELEVATOR_STATUS,
    NO_ELEVATORS_FOUND,
    ERROR,

    PROPERTY_TYPE_OPTIONS, 
    PAYMENT_INTERVAL_OPTIONS, 
    MODE_OF_PAYMENT_OPTIONS,
    COUNTRY_OPTIONS,
    SALUTATION_OPTIONS,

    ELEVATOR,
    PROPERTY,
    PROPERTY_UNIT,
    ACCOUNT,
    CONTACT,
    ORDER,

    STEPS,

    SECTIONS_MAP,
    REQUIRED_FIELDS,

    LOOKUP_OBJECTS
};
