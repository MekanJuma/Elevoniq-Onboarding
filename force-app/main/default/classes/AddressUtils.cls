public with sharing class AddressUtils {

    public static String getAddressLabel(String street, String zip, String city) {
        if(String.isNotBlank(street)) {
            String addressLabel = street;
            if(String.isNotBlank(zip) || String.isNotBlank(city)) {
                addressLabel += ',';
            }
            if(String.isNotBlank(zip)) {
                addressLabel += ' ' + zip;
            }
            if(String.isNotBlank(city)) {
                addressLabel += ' ' + city;
            }
            return addressLabel;
        }
        return null;
    }

    public static Boolean compareAddresses(String address, System.Address compareAddress) {
        return compareAddresses(address, compareAddress.getStreet(), compareAddress.getPostalCode(), compareAddress.getCity(), compareAddress.getCountry());
    }

    public static Boolean compareAddresses(String address, String street, String postalCode, String city, String country) {
        address = address != null ? address : '';
        street = street != null ? street : '';
        postalCode = postalCode != null ? postalCode : '';
        city = city != null ? city : '';
        country = country != null ? country : '';
        
        address = address.toLowerCase().remove(',').remove('\n').remove(' ');

        street = street.toLowerCase().remove(' ');
        postalCode = postalCode.toLowerCase().remove(' ');
        city = city.toLowerCase().remove(' ');
        country = String.isNotBlank(country) ? country.toLowerCase().remove(' ') : 'deutschland';

        List<String> streetVariants = new List<String>{street};
        if(street.contains('str.')) {
            streetVariants.add(street.replace('str.', 'strasse'));
            streetVariants.add(street.replace('str.', 'straße'));
        }
        else if(street.contains('strasse')) {
            streetVariants.add(street.replace('strasse', 'str.'));
            streetVariants.add(street.replace('strasse', 'straße'));
        }
        else if(street.contains('straße')) {
            streetVariants.add(street.replace('straße', 'str.'));
            streetVariants.add(street.replace('straße', 'strasse'));
        }

        Boolean addressComplete = false;
        for(String streetVariant : streetVariants) {
            addressComplete = addressComplete || address.contains(streetVariant);
        }
        addressComplete = addressComplete && address.contains(postalCode);
        addressComplete = addressComplete && address.contains(city);

        if(addressComplete) {
            for(String streetVariant : streetVariants) {
                address = address.remove(streetVariant);
            }
            address = address.remove(postalCode);
            address = address.remove(city);
            address = address.remove(country);
            address = address.remove('in');
            address = address.remove('bei');
            return Pattern.matches('[ \\t\\r\\n\\v\\f|]*', address);
        }
        return false;
    }

    public static Boolean compareCompanyNames(String company, String compareCompany) {
        company = company.toLowerCase().trim();
        compareCompany = compareCompany.toLowerCase().trim();

        Set<String> compareCompanyVariants = new Set<String>{compareCompany};
        if(compareCompany.contains('co. kg')) {
            compareCompanyVariants.add(compareCompany.replace('co. kg', 'co kg'));
            compareCompanyVariants.add(compareCompany.replace('co. kg', 'co.kg'));
        }
        else if(compareCompany.contains('co kg')) {
            compareCompanyVariants.add(compareCompany.replace('co kg', 'co. kg'));
            compareCompanyVariants.add(compareCompany.replace('co kg', 'co.kg'));
        }
        if(compareCompany.contains('co.kg')) {
            compareCompanyVariants.add(compareCompany.replace('co.kg', 'co kg'));
            compareCompanyVariants.add(compareCompany.replace('co.kg', 'co. kg'));
        }

        return compareCompanyVariants.contains(company);
    }
}