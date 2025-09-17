const getContactName = (contact) => {
    const salutation = contact?.salutation || '';
    const firstName = contact?.firstName || '';
    const lastName = contact?.lastName || '';
    return `${salutation} ${firstName} ${lastName}`.trim();
}

export const prepareProperty = (property) => {
    return [
        {
            id: property.details.id ?? 'Details',
            title: "Details",
            icon: { name: "utility:info", size: "x-small", class: "", variant: "success" },
            values: [
                { id: 0, ...formatValue(formatAddress(property.details.address), "Address", true) },
                { id: 1, ...formatValue(property.details.businessUnit, "Business Unit", false) }
            ],
        },
        {
            id: property.propertyOwner?.id ?? 'Owner',
            title: "Property Owner",
            icon: { name: "utility:user", size: "x-small", class: "", variant: "success" },
            values: [
                { id: 0, ...formatValue(property.propertyOwner?.name, "Owner", true) },
                { id: 1, ...formatValue(getContactName(property.propertyOwnerContact), "Owner Contact", false) }
            ],
        },
        {
            id: property.assetManager?.id ?? 'AM',
            title: "Asset Manager",
            icon: { name: "utility:graph", size: "x-small", class: "", variant: "success" },
            values: [
                { id: 0, ...formatValue(property.assetManager?.name, "Asset Manager", true) },
                { id: 1, ...formatValue(getContactName(property.assetManagerContact), "Asset Manager Contact", false) }
            ],
        }
    ];
};


export const preparePropertyUnit = (propertyUnit) => {
    return [
        {
            id: propertyUnit.details.id ?? 'Details',
            title: "Details",
            icon: { name: "utility:info", size: "x-small", class: "blue-icon" },
            values: [
                { id: 0, ...formatValue(formatAddress(propertyUnit.details.address), "Address", true) }, 
                { id: 1, ...formatValue(propertyUnit.details.propertyType, "Property Type", false) }
            ],
        },
        {
            id: propertyUnit.pm?.id ?? 'PM',
            title: "Property Management",
            icon: { name: "utility:user_role", size: "x-small", class: "blue-icon" },
            values: [
                { id: 0, ...formatValue(propertyUnit.pm?.name, "PM", true) },
                { id: 1, ...formatValue(getContactName(propertyUnit.pmContact), "PM Contact", false) }
            ],
        },
        {
            id: propertyUnit.fm?.id ?? 'FM',
            title: "Facility Management",
            icon: { name: "utility:custom_apps", size: "x-small", class: "blue-icon" },
            values: [
                { id: 0, ...formatValue(propertyUnit.fm?.name, "FM", true) }, 
                { id: 1, ...formatValue(getContactName(propertyUnit.fmContact), "FM Contact", false) }],
        },
        {
            id: propertyUnit.hv?.id ?? 'HV',
            title: "HV",
            icon: { name: "utility:fallback", size: "x-small", class: "blue-icon" },
            values: [
                { id: 0, ...formatValue(propertyUnit.hv?.name, "HV", true) }, 
                { id: 1, ...formatValue(getContactName(propertyUnit.hvContact), "HV Contact", false) }
            ],
        },
        {
            id: propertyUnit.operator?.id ?? 'Operator',
            title: "Operator",
            icon: { name: "action:new_custom67", size: "x-small", class: "blueop-icon" },
            values: [
                { id: 0, ...formatValue(propertyUnit.operator?.name, "Operator", true) }, 
                { id: 1, ...formatValue(getContactName(propertyUnit.operatorContact), "Operator Contact", false) }
            ],
        }
    ];
};


export const prepareOnSiteContacts = (contacts) => {
    return [
        {
            id: contacts.propertyManager?.id ?? 'PM',
            title: "Property Manager",
            icon: { name: "standard:channel_program_members", size: "small", class: "proman-icon" },
            values: [
                { id: 0, ...formatValue(getContactName(contacts.propertyManager), "Property Manager", true) }, 
                { id: 1, ...formatValue(contacts.propertyManager?.email ?? contacts.propertyManager?.phone, "Email or Phone", false) }
            ],
        },
        {
            id: contacts.houseKeeper?.id ?? 'HK',
            title: "House Keeper",
            icon: { name: "utility:brush", size: "x-small", class: "new-icon" },
            values: [
                { id: 0, ...formatValue(getContactName(contacts.houseKeeper), "House Keeper", true) },
                { id: 1, ...formatValue(contacts.houseKeeper?.email ?? contacts.houseKeeper?.phone, "Email or Phone", false) }
            ],
        },
        {
            id: contacts.attendant?.id ?? 'AT',
            title: "Attendant",
            icon: { name: "utility:approval", size: "x-small", class: "new-icon" },
            values: [
                { id: 0, ...formatValue(contacts.attendant?.name, "Attendant", true) }, 
                { id: 1, ...formatValue(contacts.attendant?.email ?? contacts.attendant?.phone, "Email or Phone", false) }],
        },
        {
            id: contacts.firstAider?.id ?? 'FA',
            title: "First Aider",
            icon: { name: "utility:new", size: "x-small", class: "new-icon" },
            values: [
                { id: 0, ...formatValue(contacts.firstAider?.name, "First Aider", true) }, 
                { id: 1, ...formatValue(contacts.firstAider?.email ?? contacts.firstAider?.phone, "Email or Phone", false) }
            ],
        },
    ];
};


export const prepareOrders = (orders) => {
    return [
        {
            id: orders.details.ids ?? 'Details',
            title: "Order Comments",
            icon: { name: "utility:prompt", size: "x-small", class: "ordercomm-icon" },
            values: [
                { id: 0, ...formatValue(orders.details.customerOrderNumber, "Order Number", true) },
                { id: 1, ...formatValue(orders.details.comment, "Comment", false) }
            ],
        },
        {
            id: 'Products',
            title: "Product Assignments",
            icon: { name: "utility:quote", size: "x-small", class: "ordercomm-icon" },
            values: [
                { id: 0, ...formatValue(formatProducts(orders.details.products), "Product Assignments", true) }
            ],
        },
        {
            id: orders.benefitReceiver?.id ?? 'Benefit Receiver',
            title: "Benefit Receiver",
            icon: { name: "action:share_thanks", size: "x-small", class: "gift-icon" },
            values: [
                { id: 0, ...formatValue(orders.benefitReceiver?.name, "Benefit Receiver", true) },
                { id: 1, ...formatValue(formatAddress(orders.benefitReceiver?.address), "Address", false) }
            ],
        },
        {
            id: orders.invoiceReceiver?.id ?? 'Invoice Receiver',
            title: "Invoice Receiver",
            icon: { name: "utility:contract_payment", size: "x-small", class: "ordercomm-icon" },
            values: [
                { id: 0, ...formatValue(orders.invoiceReceiver?.name, "Invoice Receiver", true) },
                { id: 1, ...formatValue(orders.invoiceReceiver?.email, "Email", false) }
            ],
        }
    ];
};


const formatAddress = (address) => {
    if (!address || Object.keys(address).length === 0) return "";

    const { street = "", postalCode = "", city = "" } = address;
    let parts = [];

    if (street) parts.push(street);
    if (postalCode || city) parts.push([postalCode, city].filter(Boolean).join(" "));

    return parts.join(" , ");
};

const formatValue = (value, field, isPrimary) => {
    let baseClass = isPrimary ? "highlight" : "base";
    if (!value || value.trim() === "") {
        return { name: `No ${field}`, class: `${baseClass} no-content` };
    }
    return { name: value, class: baseClass };
};

const formatProducts = (products) => {
    return products.map(product => product.productCode).join(", ");
};