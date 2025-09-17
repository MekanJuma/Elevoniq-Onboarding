/**
 * @description Utility class for handling order billing and invoice generation in the elevator service system
 * @author Mekan Jumayev
 * @date 2025-03-16
 */
public without sharing class OrderBillingUtility {
    
    
    public static List<InvoiceData> getInvoices(Boolean isRecurring) {
        return getInvoices(isRecurring, null, null, null);
    }


    public static List<InvoiceData> getInvoices(Boolean isRecurring, String billingPeriodParam, String invoiceDateParam, List<Id> orderIds){
        List<OrderElevatorRelation__c> oers = getOers(isRecurring, billingPeriodParam, orderIds);
        PricebookEntry fehlProduct = getFehlProduct();

        Map<Id, Order> orders = new Map<Id, Order>();
        Map<Id, Date> nextBillingDates = new Map<Id, Date>();
        Map<Id, List<OrderElevatorRelation__c>> groupedByOrder = new Map<Id, List<OrderElevatorRelation__c>>();

        // Calculate Next Billing Date for each order
        for (OrderElevatorRelation__c oer : oers) {
            orders.put(oer.Order_Item__r.Order.Id, oer.Order_Item__r.Order);
            if (!nextBillingDates.containsKey(oer.Order_Item__r.Order.Id) && billingPeriodParam == null) {
                nextBillingDates.put(oer.Order_Item__r.Order.Id, getNextBillingDate(oer.Order_Item__r.Order));
            }
        }

        // Group OERs by Order
        for (OrderElevatorRelation__c oer : oers) {
            Order order = oer.Order_Item__r.Order;
            Date nextBillingDate = nextBillingDates.get(order.Id);
            
            if (billingPeriodParam != null || nextBillingDate == System.today()) {
                if (!groupedByOrder.containsKey(order.Id)) {
                    groupedByOrder.put(order.Id, new List<OrderElevatorRelation__c>());
                }
                groupedByOrder.get(order.Id).add(oer);
            }
        }

        List<InvoiceData> invoices = new List<InvoiceData>();
        for (Id orderId : groupedByOrder.keySet()) {
            Order order = orders.get(orderId);
            List<OrderElevatorRelation__c> groupOers = groupedByOrder.get(orderId);
            Map<Id, List<OrderElevatorRelation__c>> groupedInvoices = groupRecordsByInvoiceMethod(order, groupOers);

            for (Id key : groupedInvoices.keySet()) {
                if (groupedInvoices.get(key).isEmpty()) continue;

                List<OrderElevatorRelation__c> invoiceOers = groupedInvoices.get(key);
                String recipientEmail = invoiceOers.get(0).Invoice_Receiver__r.Invoice_email__c;
                Integer dueDays = order.Due_in_Days__c != null ? Integer.valueOf(order.Due_in_Days__c.replace('days', '').trim()) : 14;
                String billingPeriod = billingPeriodParam != null 
                    ? billingPeriodParam
                    : order.Is_Recurring__c 
                    ? 'Leistungszeitraum: ' + getNextBillingPeriod(order, System.today()) 
                    : '';


                Map<String, Object> invoiceData = new Map<String, Object>{
                    'customer_id' => invoiceOers.get(0).Benefit_Receiver__r.Zoho_Customer_Id__c,
                    'template_id' => getTemplateIdByOrderType(order.Type),
                    'invoice_items' => prepareLineItems(order, invoiceOers, fehlProduct),
                    'custom_fields' => new List<Map<String, Object>>{
                        new Map<String, Object>{ 'label' => 'Due Days', 'value' => dueDays },
                        new Map<String, Object>{ 'label' => 'Description', 'value' => getInvoiceDescription(invoiceOers) },
                        new Map<String, Object>{ 'label' => 'Additional Notes', 'value' => getInvoiceAdditionalNotes(order, invoiceOers.get(0).Invoice_Receiver__r.Invoice_Receiver__r, invoiceOers.get(0).Benefit_Receiver__r) },
                        new Map<String, Object>{ 'label' => 'Invoice Date', 'value' => invoiceDateParam != null ? invoiceDateParam : System.today().format() },
                        new Map<String, Object>{ 'label' => 'Invoice Email', 'value' => recipientEmail },
                        new Map<String, Object>{ 'label' => 'Billing Period', 'value' => billingPeriod },
                        new Map<String, Object>{ 'label' => 'Portfolio', 'value' => invoiceOers.get(0).Elevator__r.Portfolio__r.Name },
                        new Map<String, Object>{ 'label' => 'KV #', 'value' => order.Contract.Name },
                        new Map<String, Object>{ 'label' => 'Billing Price Guide', 'value' => getBillingPriceGuide(order) }
                    }
                };
                
                invoices.add(
                    new InvoiceData(
                        invoiceData,
                        getFulfillments(invoiceOers),
                        billingPeriod,
                        recipientEmail,
                        getProductSummary(order, invoiceOers, fehlProduct),
                        order.Id,
                        invoiceDateParam != null ? invoiceDateParam : System.today().format()
                    )
                );
            }
        }

        Billing_Target__c target = getCurrentMonthTarget();
        if (!isRecurring && target != null && !invoices.isEmpty()) {
            Decimal currentMonthBilled = getCurrentMonthBilled();
            Map<String,Decimal> recurringBillable = BillingTargetController.getRecurringBillable(Date.today().year());

            Decimal lmt = (target.Target__c != null ? target.Target__c : 0) + 
                            (target.Can_Exceed__c != null ? target.Can_Exceed__c : 0);
            
            String mk = BillingTargetController.monthKey(Date.today().month());
            Decimal runningTotal = recurringBillable.get(mk) + currentMonthBilled;
            List<InvoiceData> filtered = new List<InvoiceData>();
            System.debug('Billed: ' + currentMonthBilled);
            System.debug('Limit: ' + lmt);
            for (InvoiceData inv : invoices) {
                System.debug('Running Total: ' + runningTotal);
                Decimal invoiceTotal = inv.total;
                if (runningTotal + invoiceTotal <= lmt) {
                    filtered.add(inv);
                    runningTotal += invoiceTotal;
                } else {
                    break;
                }
            }
            invoices = filtered;
        }
        return invoices;
    }

    public static Decimal getCurrentMonthBilled() {
        Date monthStart = Date.newInstance(Date.today().year(), Date.today().month(), 1);
        Date monthEnd = monthStart.addMonths(1).addDays(-1);

        List<Service_Fulfillment__c> sfs = [
            SELECT Id, Status__c, Invoiced_Date__c,
                   Work_Order__r.Status__c,
                   Order_Elevator_Relation__r.Order_Item__c,
                   Order_Elevator_Relation__r.Order_Item__r.Adjusted_Unit_Price__c
            FROM Service_Fulfillment__c
            WHERE Status__c = 'Invoiced'
              AND Invoiced_Date__c >= :monthStart
              AND Invoiced_Date__c <= :monthEnd
              AND Order_Elevator_Relation__r.Order_Item__c != null
        ];

        Decimal total = 0;
        for (Service_Fulfillment__c sf : sfs) {
            if (sf.Invoiced_Date__c == null) continue;

            Decimal unitPrice = (sf.Work_Order__r != null && sf.Work_Order__r.Status__c == 'Futile Travel')
                ? 490
                : sf.Order_Elevator_Relation__r.Order_Item__r.Adjusted_Unit_Price__c;

            total += unitPrice;
        }
        return total;
    }

    public static Billing_Target__c getCurrentMonthTarget() {
        List<Billing_Target__c> targets = [
            SELECT Id, Year__c, Month_as_Number__c, Target__c, Can_Exceed__c, Billed_Amount__c
            FROM Billing_Target__c
            WHERE Year__c = :String.valueOf(Date.today().year()) AND Month_as_Number__c = :Date.today().month()
        ];
        return !targets.isEmpty() ? targets[0] : null;
    }

    
    public static List<OrderElevatorRelation__c> getOers(Boolean isRecurring, String billingPeriod, List<Id> orderIds) {
        // Add CRUD check
        if (!Schema.sObjectType.OrderElevatorRelation__c.isAccessible()) {
            throw new SecurityException('Insufficient permissions to access OrderElevatorRelation__c');
        }

        String query = 'SELECT Id, Order_Item__r.Order.Id, Order_Item__r.Order.OrderNumber, ' +
            'Order_Item__r.Order.Due_in_Days__c, Order_Item__r.Order.Customer_Order_Number__c, Order_Item__r.Unit__c, ' +
            'Order_Item__r.Order.EffectiveDate, Order_Item__r.Order.EndDate, ' +
            'Order_Item__r.Order.Introduction_Discount__c, Order_Item__r.Order.Introduction_Period__c, ' +
            'Order_Item__r.Order.Type, Order_Item__r.Order.Is_Recurring__c, ' +
            'Order_Item__r.Order.Payment_Interval__c, Order_Item__r.Order.Invoice_Method__c, ' +
            'Order_Item__r.Order.Mode_of_Payment__c, Order_Item__r.Order.Invoice_Date__c, ' +
            'Order_Item__r.Order.Contract.Name, Order_Item__c, Order_Item__r.UnitPrice, ' +
            'Order_Item__r.Adjusted_Unit_Price__c, Order_Item__r.Adjusted_Total_Price__c, Order_Item__r.Quantity, ' +
            'Order_Item__r.Description, Order_Item__r.Product2Id, Order_Item__r.Product2.Is_Recurring__c, ' +
            'Order_Item__r.Product2.Name, Order_Item__r.Product2.ProductCode, Order_Item__r.Product2.Description, ' +
            'Order_Item__r.Product2.Zoho_Item_Id__c, Elevator__c, Elevator__r.Name, ' +
            'Elevator__r.Portfolio__r.Name, Elevator__r.PropertyUnit__r.Property__c, Elevator__r.PropertyUnit__r.Property__r.Name, ' +
            'Elevator__r.PropertyUnit__r.Street__c, Elevator__r.PropertyUnit__r.City__c, ' +
            'Benefit_Receiver__c, Benefit_Receiver__r.Name, ' +
            'Benefit_Receiver__r.ShippingStreet, Benefit_Receiver__r.ShippingPostalCode, ' +
            'Benefit_Receiver__r.ShippingCity, Benefit_Receiver__r.Email__c, ' +
            'Benefit_Receiver__r.Zoho_Customer_Id__c, ' +
            'Invoice_Receiver__r.Invoice_Receiver__c, Invoice_Receiver__r.Invoice_Receiver__r.Name, ' +
            'Invoice_Receiver__r.Invoice_Receiver__r.BillingStreet, Invoice_Receiver__r.Invoice_Receiver__r.BillingPostalCode, ' +
            'Invoice_Receiver__r.Invoice_Receiver__r.BillingCity, Invoice_Receiver__r.Invoice_email__c, ' +
            '(SELECT Id, Elevator__c, Elevator__r.Name, Invoice_Id__c, Period__c, Is_Invoiced__c, Status__c, ' +
            'Notes__c, Invoiced_Date__c, Work_Order__c, Work_Order__r.Status__c, Work_Order__r.Reason_Futile_Travel__c ' +
            'FROM Service_Fulfillments__r ORDER BY CreatedDate DESC LIMIT 2) ' +
            'FROM OrderElevatorRelation__c WHERE ';

        if (orderIds != null && !orderIds.isEmpty()) {
            query += ' Order_Item__r.Order.Id IN :orderIds';
        } else {
            String typeFilter = isRecurring
                ? '\'Recurring Service\''
                : '\'Document\', \'Modernization\'';
            
            query += 'Order_Item__r.Order.Contract.Status = \'Activated\' ' +
             'AND Order_Item__r.Order.Type IN (' + typeFilter + ') ' +
             'AND Order_Item__r.Order.EffectiveDate <= TODAY';
        }
        List<OrderElevatorRelation__c> allOers = Database.query(query);
        List<OrderElevatorRelation__c> filteredOers = new List<OrderElevatorRelation__c>();
        
        for(OrderElevatorRelation__c oer : allOers) {
            Service_Fulfillment__c lastFulfillment = !oer.Service_Fulfillments__r.isEmpty() ? oer.Service_Fulfillments__r.get(0) : null;
            if (lastFulfillment != null && lastFulfillment.Is_Invoiced__c == true) continue;
            
            if (billingPeriod != null) {
                Service_Fulfillment__c prevFulfillment = !oer.Service_Fulfillments__r.isEmpty() && oer.Service_Fulfillments__r.size() > 1 
                    ? oer.Service_Fulfillments__r.get(1) 
                    : null;
                
                if (prevFulfillment != null && String.valueOf(prevFulfillment.Period__c).contains(String.valueOf(billingPeriod))) continue;
            }
            if (oer.Order_Item__r.Order.Type == 'Document') {
                if (lastFulfillment != null && lastFulfillment.Is_Invoiced__c == false && lastFulfillment.Work_Order__r.Status__c == 'Futile Travel') {
                    Service_Fulfillment__c previousFulfillment = !oer.Service_Fulfillments__r.isEmpty() && oer.Service_Fulfillments__r.size() > 1 ? oer.Service_Fulfillments__r.get(1) : null;
                    if (previousFulfillment != null && previousFulfillment.Is_Invoiced__c == true && previousFulfillment.Period__c == 'Futile Travel') {
                        continue;
                    } else {
                        filteredOers.add(oer);
                    }
                } else if(
                    lastFulfillment != null 
                    && lastFulfillment.Is_Invoiced__c == false 
                    && lastFulfillment.Status__c == 'Fulfilled' 
                    && lastFulfillment.Work_Order__r.Status__c != 'not_relevant'
                ) {
                    filteredOers.add(oer);
                } 
            } else if (oer.Order_Item__r.Order.Type == 'Modernization') {
                if (
                	lastFulfillment != null 
                    && lastFulfillment.Is_Invoiced__c == false 
                    && lastFulfillment.Status__c == 'Fulfilled'
                ) {
                    filteredOers.add(oer);
                }
            } else {
                filteredOers.add(oer);
            }
        }
        
        return filteredOers;
    }

    public static PricebookEntry getFehlProduct() {
        List<PricebookEntry> fehlProducts = [
            SELECT Id, Product2Id, Product2.Zoho_Item_Id__c, Product2.ProductCode, UnitPrice, Product2.Name, Product2.Description
            FROM PricebookEntry
            WHERE ProductCode = 'Fehl'
            AND Pricebook2.IsStandard = false
            AND Product2.IsActive = true
            LIMIT 1
        ];
        return !fehlProducts.isEmpty() ? fehlProducts[0] : null;
    }

    public static Date getNextBillingDate(Order order) {
        if (order.Type != 'Recurring Service') {
            return System.today();
        }

        Date today = Date.today();
		Date startDate = order.EffectiveDate;
        Integer intervalMonths = 0;
        Date calculatedNextBillingDate;

        if (order.Payment_Interval__c == 'Monthly') {
            intervalMonths = 1;
            Integer monthsPassed = ((today.year() - startDate.year()) * 12 + today.month() - startDate.month());
            calculatedNextBillingDate = startDate.addMonths(monthsPassed);

            if (calculatedNextBillingDate < today || calculatedNextBillingDate.day() < startDate.day()) {
                calculatedNextBillingDate = calculatedNextBillingDate.addMonths(intervalMonths);
            }
        } else if (order.Payment_Interval__c == 'Quarterly') {
            intervalMonths = 3;
            Integer monthsPassed = ((today.year() - startDate.year()) * 12 + today.month() - startDate.month());
            Integer quartersPassed = monthsPassed / intervalMonths;
            calculatedNextBillingDate = startDate.addMonths(quartersPassed * intervalMonths);

            if (calculatedNextBillingDate < today || calculatedNextBillingDate.day() < startDate.day()) {
                calculatedNextBillingDate = calculatedNextBillingDate.addMonths(intervalMonths);
            }
        } else if (order.Payment_Interval__c == 'Half-Yearly') {
            intervalMonths = 6;
            Integer monthsPassed = ((today.year() - startDate.year()) * 12 + today.month() - startDate.month());
            Integer halfYearsPassed = monthsPassed / intervalMonths;
            calculatedNextBillingDate = startDate.addMonths(halfYearsPassed * intervalMonths);

            if (calculatedNextBillingDate < today || calculatedNextBillingDate.day() < startDate.day()) {
                calculatedNextBillingDate = calculatedNextBillingDate.addMonths(intervalMonths);
            }
        } else if (order.Payment_Interval__c == 'Yearly' || String.isBlank(order.Payment_Interval__c)) {
            intervalMonths = 12;
            Integer yearsPassed = today.year() - startDate.year();
            calculatedNextBillingDate = startDate.addMonths(yearsPassed * intervalMonths);

            if (calculatedNextBillingDate < today || calculatedNextBillingDate.day() < startDate.day()) {
                calculatedNextBillingDate = calculatedNextBillingDate.addMonths(intervalMonths);
            }
        }

        if (order.Mode_of_Payment__c != 'In Advance') {
            Date finalDate = calculatedNextBillingDate.addDays(-1);
            if (finalDate < today) {
                return finalDate.addMonths(intervalMonths);
            }
            return finalDate;
        }

        return calculatedNextBillingDate;
    }

    public static String getNextBillingPeriod(Order order, Date nextBillingDate) {
        if (order.Type != 'Recurring Service') {
            return '';
        }
    
        Integer intervalMonths = 1;
        if (order.Payment_Interval__c == 'Monthly') {
            intervalMonths = 1;
        } else if (order.Payment_Interval__c == 'Quarterly') {
            intervalMonths = 3;
        } else if (order.Payment_Interval__c == 'Half-Yearly') {
            intervalMonths = 6;
        } else if (order.Payment_Interval__c == 'Yearly') {
            intervalMonths = 12;
        }
    
        Date nextPeriodEnd = nextBillingDate.addMonths(intervalMonths).addDays(-1);
        return nextBillingDate.format() + ' - ' + nextPeriodEnd.format();
    }
    
    public static String getBillingPriceGuide(Order order) {
        String priceGuide = '';
        if (order.Is_Recurring__c == true) {
            priceGuide = order.Payment_Interval__c == 'Monthly' ? 
            	'Monatsrechnung: Der unten genannte Einzelpreis bezieht sich auf 1 Monat.' :
        		order.Payment_Interval__c == 'Quarterly' ? 
                'Quartalsrechnung: Der unten genannte Einzelpreis bezieht sich auf 3 Monate.' :
                order.Payment_Interval__c == 'Half-Yearly' ? 
                'Der unten genannte Einzelpreis bezieht sich auf 6 Monate.' :
                order.Payment_Interval__c == 'Yearly' ? 
                'Jahresrechnung: Der unten genannte Einzelpreis bezieht sich auf 12 Monate.' : '';
        }
        return priceGuide;
    }

    public static Map<Id, List<OrderElevatorRelation__c>> groupRecordsByInvoiceMethod(Order order, List<OrderElevatorRelation__c> oers) {
        Map<Id, List<OrderElevatorRelation__c>> groupedRecords = new Map<Id, List<OrderElevatorRelation__c>>();
        for (OrderElevatorRelation__c oer : oers) {
            Id key = getGroupKey(order.Invoice_Method__c, oer);
            if (key != null) {
                if (!groupedRecords.containsKey(key)) {
                    groupedRecords.put(key, new List<OrderElevatorRelation__c>());
                }
                groupedRecords.get(key).add(oer);
            }
        }
        return groupedRecords;
    }

    public static Id getGroupKey(String invoiceMethod, OrderElevatorRelation__c oer) {        
        switch on invoiceMethod {
            when 'By Invoice Receiver' { return oer.Invoice_Receiver__r.Invoice_Receiver__c; }
            when 'By Property' { return oer.Elevator__r.PropertyUnit__r.Property__c; }
            when 'By Product' { return oer.Order_Item__r.Product2Id; }
            when 'By Elevator' { return oer.Elevator__c; }
        }
        
        return oer.Benefit_Receiver__c;
    }

    public static String getGroupName(String invoiceMethod, OrderElevatorRelation__c oer) {
        switch on invoiceMethod {
            when 'By Invoice Receiver' { 
                return oer.Invoice_Receiver__r.Invoice_Receiver__r.Name; 
            }
            when 'By Property' {
                return oer.Elevator__r.PropertyUnit__r.Property__r.Name;
            }
            when 'By Product' {
                return oer.Order_Item__r.Product2.Name;
            }
            when 'By Elevator' {
                return oer.Elevator__r.Name;
            }
        }
        return oer.Benefit_Receiver__r.Name;
    }

    public static String getTemplateIdByOrderType(String orderType) {
        if (orderType == 'Consulting') {
            return System.Label.Zoho_Consulting_Template_ID;
        } else if (orderType == 'Document') {
            return System.Label.Zoho_Document_Template_ID;
        } else {
            return System.Label.Zoho_Standard_Template_ID;
        }
    }



    public static String getInvoiceDescription(List<OrderElevatorRelation__c> oers) {
        Map<String, Set<Integer>> streetMap = new Map<String, Set<Integer>>();
        Set<String> elevatorNames = new Set<String>();
    
        for (OrderElevatorRelation__c oer : oers) {
            elevatorNames.add(oer.Elevator__r.Name);
            String streetBase = getStreetBase(oer.Elevator__r.PropertyUnit__r.Street__c);
            Integer streetNumber = getStreetNumber(oer.Elevator__r.PropertyUnit__r.Street__c);
            
            if (!streetMap.containsKey(streetBase)) {
                streetMap.put(streetBase, new Set<Integer>());
            }
            if (streetNumber != null) {
                streetMap.get(streetBase).add(streetNumber);
            }
        }
    
        String elevatorNamesStr = String.join(new List<String>(elevatorNames), ' / ');
        String city = !oers.isEmpty() ? oers[0].Elevator__r.PropertyUnit__r.City__c : '';
        String streetNamesStr = constructStreetDescription(streetMap, city);
        String futileTravelDescription = getFutileTravelDescription(oers);
        return 'Standort der berechneten Liegenschaft:\n' + streetNamesStr + '\nFabrik-Nr.: ' + elevatorNamesStr + '\n' + futileTravelDescription;
    }

    public static String getStreetBase(String fullStreet) {
        String[] parts = fullStreet.split(' ');
        if (parts.size() > 1 && parts[parts.size() - 1].isNumeric()) {
            parts.remove(parts.size() - 1);
        }
        return String.join(parts, ' ');
    }
    
    public static Integer getStreetNumber(String fullStreet) {
        String[] parts = fullStreet.split(' ');
        if (parts.size() > 1 && parts[parts.size() - 1].isNumeric()) {
            return Integer.valueOf(parts[parts.size() - 1]);
        }
        return null;
    }
    
    public static String constructStreetDescription(Map<String, Set<Integer>> streets, String city) {
        List<String> descriptions = new List<String>();
        for (String base : streets.keySet()) {
            List<Integer> sortedNumbers = new List<Integer>(streets.get(base));
            sortedNumbers.sort();

            List<String> numberStrings = new List<String>();
            for (Integer n : sortedNumbers) {
                numberStrings.add(String.valueOf(n));
            }

            String numbers = String.join(numberStrings, ', ');
            if (!numberStrings.isEmpty()) {
                descriptions.add(base + ' ' + numbers);
            } else {
                descriptions.add(base);
            }
        }
        return String.join(descriptions, '; ') + ', ' + city;
    }

    public static String getFutileTravelDescription(List<OrderElevatorRelation__c> oers) {
        List<String> descriptions = new List<String>();
        for (OrderElevatorRelation__c oer : oers) {
            Service_Fulfillment__c lastFulfillment = !oer.Service_Fulfillments__r.isEmpty() ? oer.Service_Fulfillments__r.get(0) : null;
            if (lastFulfillment != null && lastFulfillment.Work_Order__r.Status__c == 'Futile Travel') {
                descriptions.add(lastFulfillment.Elevator__r.Name + ': ' + lastFulfillment.Work_Order__r.Reason_Futile_Travel__c);
            }
        }
        return descriptions.isEmpty() ? '' : 'Fehlanfahrt:\n' + String.join(descriptions, '\n');
    }


    public static List<String> getFulfillments(List<OrderElevatorRelation__c> oers) {
        List<String> fulfillments = new List<String>();
        for (OrderElevatorRelation__c oer : oers) {
            Service_Fulfillment__c lastFulfillment = !oer.Service_Fulfillments__r.isEmpty() ? oer.Service_Fulfillments__r.get(0) : null;
            if (lastFulfillment != null) {
                fulfillments.add(lastFulfillment.Id);
            }
        }
        return fulfillments;
    }

    public static String getProductSummary(Order order, List<OrderElevatorRelation__c> oers, PricebookEntry fehlProduct) {
        // For Consulting type orders
        if (order.Type == 'Consulting') {
            if (!oers.isEmpty()) {
                OrderElevatorRelation__c oer = oers[0];
                String unit = String.isBlank(oer.Order_Item__r.Unit__c) ? '' : oer.Order_Item__r.Unit__c.toLowerCase();
                return oer.Order_Item__r.Quantity + ' ' + unit + ' x ' + oer.Order_Item__r.Product2.Name;
            } else {
                return '--';
            }
        }

        // For other types
        Map<String, Integer> productQtyMap = new Map<String, Integer>();
    
        for (OrderElevatorRelation__c oer : oers) {
    
            String productName;
            if (isFutileTravel(oer)) {
                productName = fehlProduct.Product2.Name;
            } else {
                productName = oer.Order_Item__r.Product2.Name;
            }
    
            if (!productQtyMap.containsKey(productName)) {
                productQtyMap.put(productName, 0);
            }
            productQtyMap.put(productName, productQtyMap.get(productName) + 1);
        }
    
        List<String> formattedProducts = new List<String>();
        for (String productName : productQtyMap.keySet()) {
            formattedProducts.add(productQtyMap.get(productName) + ' x ' + productName);
        }
    
        return String.join(formattedProducts, ' und ');
    }

    public static Boolean isFutileTravel(OrderElevatorRelation__c oer) {
        Service_Fulfillment__c lastFulfillment = !oer.Service_Fulfillments__r.isEmpty() ? oer.Service_Fulfillments__r.get(0) : null;
        if (lastFulfillment != null && lastFulfillment.Work_Order__r.Status__c == 'Futile Travel') {
            return true;
        }
        return false;
    }


    public static List<Map<String, Object>> prepareLineItems(Order order, List<OrderElevatorRelation__c> oers, PricebookEntry fehlProduct) {
        List<Map<String, Object>> lineItems = new List<Map<String, Object>>();
        Set<OrderItem> orderItems = new Set<OrderItem>();
        Map<String, Set<String>> orderItemElevatorsMap = new Map<String, Set<String>>();
        Map<String, Set<String>> orderItemNotRelevantMap = new Map<String, Set<String>>();

        for (OrderElevatorRelation__c oer : oers) {
            orderItems.add(oer.Order_Item__r);
            String orderItemId = oer.Order_Item__c;
            String elevatorName = oer.Elevator__c;

            if (isFutileTravel(oer)) {
                if (!orderItemNotRelevantMap.containsKey(orderItemId)) {
                    orderItemNotRelevantMap.put(orderItemId, new Set<String>());
                }
                orderItemNotRelevantMap.get(orderItemId).add(elevatorName);  
            } else {
                if (!orderItemElevatorsMap.containsKey(orderItemId)) {
                    orderItemElevatorsMap.put(orderItemId, new Set<String>());
                }
                orderItemElevatorsMap.get(orderItemId).add(elevatorName);   
            }
        }

        for (OrderItem orderItem : orderItems) {
            if (orderItemNotRelevantMap.get(orderItem.Id) != null && !orderItemNotRelevantMap.get(orderItem.Id).isEmpty()) {
                lineItems.add(createInvoiceItem(fehlProduct, orderItemNotRelevantMap.get(orderItem.Id).size()));
            }
            if (orderItemElevatorsMap.get(orderItem.Id) != null && !orderItemElevatorsMap.get(orderItem.Id).isEmpty()) {
                Integer qty = order.Type == 'Consulting' ? (Integer) orderItem.Quantity : orderItemElevatorsMap.get(orderItem.Id).size();
                // system.debug('Item: ' + qty + ' price: ' + orderItem.Adjusted_Unit_Price__c);
                lineItems.add(createInvoiceItem(orderItem, qty));
            }
        }

        return lineItems;
    }

    public static Map<String, Object> createInvoiceItem(PricebookEntry fehlProduct, Integer quantity) {
        return new Map<String, Object>{
            'product_id' => fehlProduct.Product2.Zoho_Item_Id__c,
            'price' => fehlProduct.UnitPrice,
            'quantity' => quantity,
            'tax_id' => Label.Zoho_Tax_Id
        };
    }

    public static Map<String, Object> createInvoiceItem(OrderItem orderItem, Integer quantity) {
        Decimal calculatedPrice = calculateAdjustedPrice(orderItem, System.today());
        return new Map<String, Object>{
            'product_id' => orderItem.Product2.Zoho_Item_Id__c,
            'price' => calculatedPrice,
            'quantity' => quantity,
            'tax_id' => Label.Zoho_Tax_Id
        };
    }

    public static Decimal calculateAdjustedPrice(OrderItem orderItem, Date nextBillingDate) {
        Decimal calculatedPrice = orderItem.Adjusted_Unit_Price__c;
        if (orderItem.Order.Introduction_Period__c != null && orderItem.Order.Introduction_Discount__c != null) {
            Integer monthsDifference = orderItem.Order.EffectiveDate.monthsBetween(nextBillingDate);
            if (monthsDifference <= orderItem.Order.Introduction_Period__c) {
                Decimal introductionDiscount = orderItem.Order.Introduction_Discount__c;
                calculatedPrice = orderItem.Adjusted_Unit_Price__c * (1 - (introductionDiscount));
            }
        }
        return calculatedPrice;
    }

    public static String getInvoiceAdditionalNotes(Order order, Account invoiceReceiver, Account benefitReceiver) {
        String invoicerReceiverAddress = '';
        if (invoiceReceiver != null) {
            invoicerReceiverAddress = 'Rechnungsempfänger:\n';
            String billingStreet = invoiceReceiver.BillingStreet != null ? invoiceReceiver.BillingStreet : '';
            String billingPostalCode = invoiceReceiver.BillingPostalCode != null ? invoiceReceiver.BillingPostalCode : '';
            String billingCity = invoiceReceiver.BillingCity != null ? invoiceReceiver.BillingCity : '';
            
            if (invoiceReceiver.Name == benefitReceiver.Name || invoiceReceiver.Id == benefitReceiver.Id || (billingStreet.contains('c/o') || billingStreet.contains('v.d.'))) {
                invoicerReceiverAddress += invoiceReceiver.Name + '\n' + billingStreet + ', ' + billingPostalCode + ' ' + billingCity;
            } else {
                String invoiceReceiverName = benefitReceiver.Name + '\nc/o ' + invoiceReceiver.Name;
                invoicerReceiverAddress += invoiceReceiverName + '\n' + billingStreet + ', ' + billingPostalCode + ' ' + billingCity;
            }
        }
        if (order.Customer_Order_Number__c != null) {
            invoicerReceiverAddress += '\n' + order.Customer_Order_Number__c ;
        }

        return invoicerReceiverAddress.trim();
    }

    public static Integration_Journal__c logError(String origin, String message, Exception e) {
        Integration_Journal__c log = new Integration_Journal__c(
            Origin__c = origin,
            Type__c = 'Error',
            Status__c = 'NOK',
            Result__c = message + '\n' + e.getMessage() + '\n' + e.getStackTraceString()
        );
        return log;
    }
    



    /**
     * @description Inner class to hold invoice data and related fulfillments
     */
    public class InvoiceData {
        public Map<String, Object> invoice;
        public List<String> fulfillments;
        public String billingPeriod;
        public String recipientEmail;
        public String productDetails;
        public String orderId;
        public String invoiceDate;
        public Decimal total;

        /**
         * @description Constructor for InvoiceData
         * @param invoice Map containing invoice data
         * @param fulfillments List of related service fulfillments
         */
        public InvoiceData(
                Map<String, Object> invoice, 
                List<String> fulfillments,
                String billingPeriod,
                String recipientEmail,
                String productDetails,
                String orderId,
            	String invoiceDate
        ) {
            this.invoice = invoice;
            this.fulfillments = fulfillments;
            this.billingPeriod = billingPeriod;
            this.recipientEmail = recipientEmail;
            this.productDetails = productDetails;
            this.orderId = orderId;
            this.invoiceDate = invoiceDate;

            List<Map<String, Object>> invoice_items = (List<Map<String, Object>>) invoice.get('invoice_items');
            Decimal total = 0;
            for (Map<String, Object> item : invoice_items) {
                Decimal quantity = (Decimal) item.get('quantity');
                Decimal price = (Decimal) item.get('price');
                total += (quantity * price);
            }
            // system.debug('TOTAL: ' + total);
            this.total = total;
        }
    }

}