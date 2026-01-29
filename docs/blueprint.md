# **App Name**: OrderWise

## Core Features:

- Authentication: Implement email and password authentication for secure access.
- Order Dashboard: Display a list of orders in an interactive table with CRUD functionalities.
- Order Management: Enable creating, editing, and deleting orders with details like order number, address, recipient name, contact number, delivery type, payment status, and delivery time.
- Geocoding API Integration: Automatically transform the delivery address into latitude and longitude coordinates using a geocoding service like Google Maps or Mapbox upon order creation or update. The app will then save both coordinates with the order details in the database.
- Route Clustering: Group delivery orders based on geographic proximity (latitude/longitude) and filter by time slots (morning/afternoon/evening) using a tool.
- Database Integration: Utilize Prisma with PostgreSQL or MySQL to manage and store order data.
- Real-time Updates: Orders on the map can be updated to keep the drivers updated

## Style Guidelines:

- Primary color: Soft blue (#A0C4FF) to create a calm and trustworthy environment for logistics management.
- Background color: Light gray (#F5F5F5), subtly desaturated from the primary, provides a neutral backdrop that ensures legibility and minimizes distraction.
- Accent color: Gentle green (#BDB2FF) is used as an analogous accent to highlight important interactive elements without drawing too much attention.
- Font pairing: 'Inter' (sans-serif) for body text and 'Space Grotesk' (sans-serif) for headings to provide a modern, readable interface.
- Simple, geometric icons to represent order status, delivery types, and payment methods.
- Clean, table-based layout for the order dashboard with clear visual cues for sorting and filtering.
- Subtle transition animations for loading states and modal appearances to enhance user experience.