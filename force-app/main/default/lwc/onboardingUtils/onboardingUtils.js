const generateUniqueId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


const getList = (list, id) => {
    return (list || []).filter(item => item.id !== id);
}

const formatAddress = (address) => {
    if (!address) return '';
    const { street, city, postalCode, country } = address;
    return [street, city, postalCode, country].filter(Boolean).join(', ');
}

const getListType = (taskId) => {
    switch (taskId) {
        case 'property.details':
        case 'property':
            return 'property';
    
        case 'account':
        case 'property.propertyOwner':
        case 'property.assetManager':
        case 'order.benefitReceiver':
        case 'order.invoiceReceiver':
        case 'propertyUnit.pm':
        case 'propertyUnit.fm':
        case 'propertyUnit.hv':
        case 'propertyUnit.operator':
            return 'account';
    
        case 'propertyUnit':
        case 'propertyUnit.details':
            return 'propertyUnit';
    
        case 'contact':
        case 'onSiteContacts.propertyManager':
        case 'onSiteContacts.houseKeeper':
        case 'onSiteContacts.attendant':
        case 'onSiteContacts.firstAider':
            return 'contact';

        default:
            return null;
    }
    
}


const formatListItems = (list, taskId) => {
    let type = getListType(taskId);
    // console.log('type: ', type, taskId, JSON.stringify(list))
    return (list || []).map(item => {
        let title = '';
        let description = '';
        let icon = 'utility:checkin';
        switch (type) {
            case 'account':
                title = item.name || '';
                description = formatAddress(item.address);
                icon = 'utility:company';
                break;

            case 'contact':
                title = [item.firstName, item.lastName].filter(Boolean).join(' ');
                description = [item.title, item.email].filter(Boolean).join(' - ');
                icon = 'utility:people';
                break;

            case 'property':
                title = item.name;
                description = item.businessUnit || '';
                icon = 'utility:home';
                break;

            case 'propertyUnit':
                title = formatAddress(item.address);
                description = item.propertyType || '';
                icon = 'utility:puzzle';
                break;
        }

        return {
            id: item.id,
            title,
            description,
            icon,
            className: 'slds-card selectable-card'
        };
    });
}



const getData = (path, source) => {
    const parts = path.split('.');
    const baseObj = parts.reduce((acc, key) => acc?.[key], source) || {};

    const lastKey = parts[parts.length - 1];
    const parent = parts.slice(0, -1).reduce((acc, key) => acc?.[key], source);

    let contact = undefined;
    if (parent && parent[`${lastKey}Contact`]) {
        contact = parent[`${lastKey}Contact`];
    }
    return contact ? { ...baseObj, contact } : baseObj;
};

const extractPrefixedFields = (fields) => {
    const grouped = {};

    Object.entries(fields).forEach(([key, value]) => {
        if (key.includes('.')) {
            const [prefix, field] = key.split('.');
            if (!grouped[prefix]) grouped[prefix] = {};
            grouped[prefix][field] = value;
        } else {
            grouped[key] = value;
        }
    });

    return grouped;
}

const updateOrCreateAndApply = (list, existingId, template, fieldMap) => {
    let record = list.find(item => item.id === existingId);
    if (!record) {
        record = JSON.parse(JSON.stringify(template));
        record.id = `newItem_${generateUniqueId()}`;
        record.externalId = record.id;
        list.push(record);
    }

    Object.entries(fieldMap).forEach(([key, value]) => {
        if (key === 'address') {
            record.address = value;
        } else {
            record[key] = value;
        }
    });

    record.isChanged = true;
    record.completed = true;
    return record;
}



export { 
    getData,
    generateUniqueId,
    extractPrefixedFields,
    updateOrCreateAndApply,
    getList,
    formatListItems
};