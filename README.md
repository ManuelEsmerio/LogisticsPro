# OrderWise

OrderWise is a Next.js web application designed for efficient order and delivery management. It provides a comprehensive solution for handling orders, from creation to route optimization, with a clean and intuitive user interface.

This project is scaffolded in Firebase Studio.

## Features

- **Simple Authentication**: Secure login with email and password.
- **Order Dashboard**: An interactive table to view, create, edit, and delete orders.
- **Order Management**: Detailed order forms with fields for address, recipient, contact info, delivery type, payment status, and delivery time.
- **Geocoding**: Automatic conversion of addresses to latitude and longitude coordinates.
- **AI-Powered Route Clustering**: Intelligent grouping of delivery orders based on geographic proximity and time slots to optimize delivery routes.
- **Clean UI/UX**: A modern interface built with TailwindCSS and shadcn/ui, featuring a professional color palette and typography.

---

## Technical Explanations

### Geocoding Logic

Geocoding is the process of converting a physical address into geographic coordinates (latitude and longitude). This is crucial for mapping and route optimization.

**Implementation (`src/lib/actions.ts`):**

In a production application, you would integrate a third-party geocoding service like the Google Maps Geocoding API or Mapbox Geocoding API.

The flow would be:
1. When a user creates or updates an order, the server action receives the address.
2. An API call is made to the chosen geocoding service with the address.
3. The service returns the latitude and longitude for that address.
4. These coordinates are then saved to the database along with the rest of the order details.

For this boilerplate, the geocoding is **simulated**. A deterministic hash function is used on the address string to generate consistent, mock coordinates within a predefined geographical area (e.g., New York City). This allows the route clustering feature to function without requiring an actual API key. You can find this logic in the `createOrder` and `updateOrder` functions in `src/lib/actions.ts`.

```typescript
// Example of where to integrate a real geocoding service
// const { latitude, longitude } = await geocodeAddress(data.address);

// The current simulated implementation
const { latitude, longitude } = generateMockCoordinates(data.address);
```

### Route Clustering Logic

Route clustering involves grouping multiple delivery stops into optimized routes to save time and fuel. This application leverages a Genkit AI flow to perform this task.

**Implementation (`src/lib/actions.ts` and `src/ai/flows/cluster-routes.ts`):**

1.  **User Trigger**: The user initiates the process from the dashboard by selecting a time slot (e.g., morning, afternoon, evening).

2.  **Server Action (`getClusteredRoutesAction`)**:
    -   This action gathers all orders scheduled for delivery within the selected time slot.
    -   It formats this data into the required input structure for the AI flow, including order numbers, addresses, and coordinates.

3.  **Genkit AI Flow (`clusterRoutes`)**:
    -   The server action calls the pre-defined Genkit flow `clusterRoutes`.
    -   This AI flow receives the list of orders and uses a powerful language model with a specialized prompt. The prompt instructs the AI to act as a "route optimization expert" and group the orders based on geographic proximity.
    -   The AI analyzes the coordinates and time constraints to create logical clusters.

4.  **Output**:
    -   The AI flow returns a structured JSON object containing the clustered routes. Each cluster includes the time slot and the list of orders belonging to it.
    -   The frontend then visualizes these clusters on a map-like interface, providing drivers with a clear, optimized plan for their deliveries.

This AI-driven approach automates a complex logistical task, making the delivery process significantly more efficient.
