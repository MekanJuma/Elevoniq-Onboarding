const ELEVATOR_STATUS = {
    APPROVED: 'Approved',
    CHANGED: 'Changed',
    PENDING: 'Pending'
}

const NO_ELEVATORS_FOUND = {
    ILLUSTRATOR: 'desert',
    TITLE: 'No Elevators Found',
    MESSAGE: "It's time to add your first elevator",
}

const ERROR = {
    ILLUSTRATOR: 'noAccess',
    TITLE: 'Something went wrong',
    MESSAGE: "Please try again",
}

const STEPS = {
    STEP1: {
        title: 'Step 1: Property',
        tasks: [
            { 
                id: 'propertyDetails.details', 
                name: 'Property Details', 
                className: 'task-item',
                completed: false
            },
            { 
                id: 'propertyDetails.owner', 
                name: 'Property Owner', 
                className: 'task-item',
                completed: false
            },
            { 
                id: 'propertyDetails.manager', 
                name: 'Asset Manager', 
                className: 'task-item',
                completed: false 
            },
        ]
    },
    STEP2: {
        title: 'Step 2: Property Unit',
        tasks: [
            { id: 'propertyUnitDetails.details', name: 'Property Unit Details', className: 'task-item', completed: false },
            { id: 'propertyUnitDetails.pm', name: 'Property Management', className: 'task-item', completed: false },
            { id: 'propertyUnitDetails.fm', name: 'Facility Management', className: 'task-item', completed: false },
            { id: 'propertyUnitDetails.hv', name: 'HV Company', className: 'task-item', completed: false },
            { id: 'propertyUnitDetails.operator', name: 'Operator', className: 'task-item', completed: false }
        ]
    },
    STEP3: {
        title: 'Step 3: On Site Contacts',
        tasks: [
            { id: 'onSiteContacts.propertyManager', name: 'Property Manager', className: 'task-item', completed: false },
            { id: 'onSiteContacts.houseKeeper', name: 'House Keeper', className: 'task-item', completed: false },
            { id: 'onSiteContacts.attendant', name: 'Attendant', className: 'task-item', completed: false },
            { id: 'onSiteContacts.firstAider', name: 'First Aider', className: 'task-item', completed: false }
        ]
    },
    STEP4: {
        title: 'Step 4: Order Details',
        tasks: [
            { id: 'orderDetails.details', name: 'Order Details', className: 'task-item', completed: false },
            { id: 'orderDetails.productAssignment', name: 'Product Assignment', className: 'task-item', completed: false },
            { id: 'orderDetails.br', name: 'Benefit Receiver', className: 'task-item', completed: false },
            { id: 'orderDetails.ir', name: 'Invoice Receiver', className: 'task-item', completed: false }
        ]
    }
    
}

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

const DEFAULT_CONTACT = {
    section: 'Contact details',
    icon: 'utility:people',
    fields: [
        {
            id: 'contact.firstName',
            name: 'First Name',
            isText: true,
            value: '',
            required: true
        },
        {
            id: 'contact.lastName',
            name: 'Last Name',
            isText: true,
            value: '',
            required: true
        },
        {
            id: 'contact.title',
            name: 'Title',
            isText: true,
            value: '',
            required: false 
        },
        {
            id: 'contact.email',
            name: 'Email',
            isEmail: true,
            value: '',
            required: false
        },
        {
            id: 'contact.phone',
            name: 'Phone',
            isText: true,
            value: '',
            required: false
        }
    ]
}

const DEFAULT_ACCOUNT = {
    section: 'Company details',
    icon: 'utility:company',
    fields: [
        {
            id: 'account.name',
            name: 'Name',
            isText: true,
            value: '',
            required: true
        },
        {
            id: 'account.email',
            name: 'Email',
            isEmail: true,
            value: '',
            required: false
        },
        {
            id: 'account.address',
            name: 'Address',
            isAddress: true,
            value: {
                street: '',
                city: '',
                postalCode: '',
                country: ''
            },
            required: true
        }
    ]
}

const DEFAULT_PROPERTY_DETAILS = {
    section: 'Property details',
    icon: 'utility:checkin',
    fields: [
        {
            id: 'address',
            name: 'Address',
            isAddress: true,
            value: {
                street: '',
                city: '',
                postalCode: '',
                country: ''
            },
            required: true
        },
        {
            id: 'businessUnit',
            name: 'Business Unit',
            isText: true,
            value: '',
            required: false
        }
    ]
}

const DEFAULT_PROPERTY_UNIT_DETAILS = {
    section: 'Property unit details',
    icon: 'utility:checkin',
    fields: [
        {
            id: 'propertyType',
            name: 'Property Type',
            isPicklist: true,
            value: '',
            required: false,
            options: PROPERTY_TYPE_OPTIONS
        },
        {
            id: 'address',
            name: 'Address',
            isAddress: true,
            value: {
                street: '',
                city: '',
                postalCode: '',
                country: ''
            },
            required: true
        }
    ]
}

const DEFAULT_ORDER_DETAILS = {
    section: 'Order details',
    icon: 'utility:check',
    fields: [
        {
            id: 'orderNumber',
            name: 'Customer Order Number',
            isText: true,
            value: '',
            required: false
        },
        {
            id: 'paymentInterval',
            name: 'Payment Interval',
            isPicklist: true,
            value: '',
            required: false,
            options: PAYMENT_INTERVAL_OPTIONS
        },
        {
            id: 'modeOfPayment',
            name: 'Mode of Payment',
            isPicklist: true,
            value: '',
            required: false,
            options: MODE_OF_PAYMENT_OPTIONS
        }
    ]
}

const DEFAULT_PRODUCT_ASSIGNMENT = {
    section: 'Assign the elevator to a product',
    icon: 'utility:assignment',
    fields: [
        {
            id: 'product',
            name: 'Product',
            isText: true,
            value: '',
            required: false
        }
    ]
}

const DEFAULT_ELEVATOR_DETAILS = {
    propertyDetails: {
        details: [
            DEFAULT_PROPERTY_DETAILS
        ],
        owner: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ],
        manager: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ]
    },
    propertyUnitDetails: {
        details: [
            DEFAULT_PROPERTY_UNIT_DETAILS
        ],
        pm: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ],
        fm: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ],
        hv: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ],
        operator: [
            DEFAULT_ACCOUNT,
            DEFAULT_CONTACT
        ]
    },
    onSiteContacts: {
        propertyManager: [
            DEFAULT_CONTACT
        ],
        houseKeeper: [
            DEFAULT_CONTACT
        ],
        attendant: [
            DEFAULT_CONTACT
        ],
        firstAider: [
            DEFAULT_CONTACT
        ]
    },
    orderDetails: {
        details: [
            DEFAULT_ORDER_DETAILS
        ],
        productAssignment: [
            DEFAULT_PRODUCT_ASSIGNMENT
        ],
        br: [
            DEFAULT_ACCOUNT
        ],
        ir: [
            DEFAULT_ACCOUNT
        ]
    }
}

export { 
    ELEVATOR_STATUS,
    NO_ELEVATORS_FOUND,
    ERROR,
    STEPS, 
    PROPERTY_TYPE_OPTIONS, 
    PAYMENT_INTERVAL_OPTIONS, 
    MODE_OF_PAYMENT_OPTIONS,
    DEFAULT_ELEVATOR_DETAILS,
    COUNTRY_OPTIONS
};
