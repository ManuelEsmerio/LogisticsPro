'use server';

/**
 * @fileOverview This file defines a Genkit flow for clustering delivery routes based on geographic proximity and time slots using AI.
 *
 * - `clusterRoutes`: A function that takes an array of orders and returns a set of clustered routes.
 * - `ClusterRoutesInput`: The input type for the clusterRoutes function, representing an array of order data.
 * - `ClusterRoutesOutput`: The output type for the clusterRoutes function, representing a set of clustered routes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClusterRoutesInputSchema = z.object({
  orders: z.array(
    z.object({
      orderNumber: z.string(),
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      deliveryTimeSlot: z.enum(['morning', 'afternoon', 'evening']),
    })
  ).describe('An array of order objects, each containing order details and geolocation data.'),
});
export type ClusterRoutesInput = z.infer<typeof ClusterRoutesInputSchema>;

const ClusterRoutesOutputSchema = z.object({
  clusteredRoutes: z.array(
    z.object({
      timeSlot: z.enum(['morning', 'afternoon', 'evening']),
      orders: z.array(
        z.object({
          orderNumber: z.string(),
          address: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
      ),
    })
  ).describe('An array of clustered routes, each containing a time slot and an array of orders within that time slot.'),
});
export type ClusterRoutesOutput = z.infer<typeof ClusterRoutesOutputSchema>;

export async function clusterRoutes(input: ClusterRoutesInput): Promise<ClusterRoutesOutput> {
  return clusterRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clusterRoutesPrompt',
  input: {schema: ClusterRoutesInputSchema},
  output: {schema: ClusterRoutesOutputSchema},
  prompt: `You are a route optimization expert. Given a list of delivery orders with their addresses, latitude, longitude, and preferred delivery time slots, group the orders into efficient delivery routes based on geographic proximity and time constraints.\n\nOrders:\n{{#each orders}}\n- Order Number: {{orderNumber}}, Address: {{address}}, Latitude: {{latitude}}, Longitude: {{longitude}}, Time Slot: {{deliveryTimeSlot}}\n{{/each}}\n\nConsider the following:\n- Group orders within the same time slot (morning, afternoon, evening) together.\n- Prioritize grouping orders that are geographically close to each other to minimize travel distance.\n\nReturn the clustered routes in the following JSON format:\n{\n  "clusteredRoutes": [\n    {\n      "timeSlot": "morning",\n      "orders": [\n        {\n          "orderNumber": "123",\n          "address": "1600 Amphitheatre Parkway, Mountain View, CA",\n          "latitude": 37.422,\n          "longitude": -122.084\n        }\n      ]\n    }\n  ]\n}`,
});

const clusterRoutesFlow = ai.defineFlow(
  {
    name: 'clusterRoutesFlow',
    inputSchema: ClusterRoutesInputSchema,
    outputSchema: ClusterRoutesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
