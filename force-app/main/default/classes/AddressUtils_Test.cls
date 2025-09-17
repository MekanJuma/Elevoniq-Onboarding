@IsTest
private class AddressUtils_Test {

    @IsTest
    static void getAddressLabel() {
        System.assertEquals(null, AddressUtils.getAddressLabel(null, '1200', 'Berlin'));
        System.assertEquals('Teststraße 12', AddressUtils.getAddressLabel('Teststraße 12', null, null));
        System.assertEquals('Teststraße 12, Berlin', AddressUtils.getAddressLabel('Teststraße 12', null, 'Berlin'));
        System.assertEquals('Teststraße 12, 1200', AddressUtils.getAddressLabel('Teststraße 12', '1200', null));
        System.assertEquals('Teststraße 12, 1200 Berlin', AddressUtils.getAddressLabel('Teststraße 12', '1200', 'Berlin'));
    }
}