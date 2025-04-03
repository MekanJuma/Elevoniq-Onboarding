# Elevator Onboarding Portal Design Document

## Overview
A multi-step onboarding portal for customers to register their properties, units, elevators, and manage billing information. The portal includes document upload functionality with AI-powered data extraction.

## URL Structure
```
/onboard?user={userId}&contract={contractNo}
```

## Technical Stack
- Salesforce Lightning Web Components (LWC)
- Apex Controllers
- Google Places API (for address autocomplete)
- Document AI Integration

## Component Architecture

### Main Container Component
- Handles URL parameters and initial data loading
- Manages overall state and navigation
- Controls step progression and validation
- Coordinates communication between child components

### Header Navigation
- Static resource integration for logo (ElevoniqLogo1.png)
- User profile section with dropdown
- Session management
- Navigation state handling

### Progress Navigation
- Vertical step indicator on left side
- Interactive step navigation
- Progress tracking and validation
- Sub-step management

### Content Area
- Dynamic component loading based on current step
- State preservation between steps
- Form management and validation
- Auto-save functionality

## Data Architecture

### User Context
- User identification and authentication
- Company association
- Permission levels
- Session management

### Order Management
- Contract association
- Product details
- Pricing information
- Payment intervals
- Status tracking

### Property Data Structure
1. Property Information
   - Basic property details
   - Location data
   - Management companies
   - Contact information
   - Ownership details

2. Property Units
   - Unit categorization
   - Access management
   - Contact assignments
   - Location specifics

3. Elevator Details
   - Technical specifications
   - Unit assignments
   - Serial number management
   - Location mapping

4. Billing Structure
   - Order grouping
   - Invoice recipient management
   - Payment terms
   - Benefit receiver details

## Backend Services

### Main Controller
- Unified data retrieval
- Response wrapper structure
- Error handling
- Transaction management

### Property Management
- CRUD operations
- Validation rules
- Data relationships
- History tracking

### Document Processing
- Upload handling
- AI integration
- Data extraction
- Validation and verification

## User Interface Design

### Navigation Structure
1. Top Header Bar
   - Logo placement
   - User information display
   - Action menu
   - Session controls

2. Side Progress Bar
   - Step visualization
   - Progress tracking
   - Navigation controls
   - Status indicators

3. Main Content Area
   - Dynamic form rendering
   - Validation feedback
   - Action buttons
   - Status messages

### Form Layout Strategy
1. Progressive Disclosure
   - Section-by-section display
   - Conditional rendering
   - Dependency management
   - Validation rules

2. Address Management
   - Google Places integration
   - Auto-completion
   - Validation
   - Format standardization

3. Dynamic Forms
   - Add/remove capabilities
   - Validation rules
   - State management
   - Error handling

### Order Display Design
1. Card Layout
   - Key information display
   - Status visualization
   - Action buttons
   - Visual hierarchy

2. Action Integration
   - Onboarding triggers
   - Document upload
   - Status updates
   - Error handling

## Data Flow

### Initial Load
1. URL parameter processing
2. User authentication
3. Data retrieval
4. State initialization

### Step Progression
1. Data validation
2. State preservation
3. Component loading
4. Progress update

### Data Submission
1. Validation
2. Error handling
3. Backend processing
4. Status updates

## Error Handling Strategy

### User Input Validation
- Field-level validation
- Form-level validation
- Cross-step validation
- Real-time feedback

### System Error Management
- API error handling
- Network error recovery
- State preservation
- User notification

### Data Recovery
- Auto-save functionality
- State restoration
- Error recovery
- Session management

## Performance Considerations

### Component Loading
- Lazy loading strategy
- State management
- Cache utilization
- Resource optimization

### Data Management
- Batch processing
- Efficient queries
- Data caching
- State optimization

## Security Framework

### Authentication
- User verification
- Session management
- Permission checking
- Access control

### Data Protection
- Field-level security
- Record access control
- API security
- File upload protection

## Next Development Phases

### Phase 1: Foundation
- Basic component structure
- Navigation framework
- Data retrieval
- State management

### Phase 2: Core Functionality
- Form implementation
- Validation logic
- Progress tracking
- Basic error handling

### Phase 3: Integration
- Google Places API
- Document processing
- AI integration
- Advanced validation

### Phase 4: Enhancement
- Performance optimization
- Security hardening
- UX improvements
- Testing implementation

### Phase 5: Refinement
- User feedback integration
- Performance tuning
- Security auditing
- Documentation completion 