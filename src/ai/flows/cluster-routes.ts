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
  if (!input.orders || input.orders.length === 0) {
    return { clusteredRoutes: [] };
  }
  return clusterRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clusterRoutesPrompt',
  input: {schema: ClusterRoutesInputSchema},
  output: {schema: ClusterRoutesOutputSchema},
  prompt: `You are a logistics coordinator. Your task is to group a list of delivery orders into clusters based on their geographic location (latitude and longitude). All orders provided will be for the same time slot.

Create groups of orders that are geographically close to each other to form efficient delivery routes.

Orders to cluster:
{{#each orders}}
- Order: {{orderNumber}}, Address: {{address}}, Coords: ({{latitude}}, {{longitude}}), Time Slot: {{deliveryTimeSlot}}
{{/each}}

Return a JSON object with a 'clusteredRoutes' array. Each element in the array must be a cluster containing the correct 'timeSlot' and the list of 'orders' belonging to that cluster. If orders are far apart, create multiple clusters. If all orders are close, you can group them into a single cluster.

Example output format for a 'morning' request:
{
  "clusteredRoutes": [
    {
      "timeSlot": "morning",
      "orders": [
        {
          "orderNumber": "ORD-001",
          "address": "Calle Ramon Corona 86, Centro, Tequila, Jalisco",
          "latitude": 20.8845,
          "longitude": -103.8365
        },
        {
          "orderNumber": "ORD-002",
          "address": "Calle Sixto Gorjón 83, Centro, Tequila, Jalisco",
          "latitude": 20.8833,
          "longitude": -103.8359
        }
      ]
    }
  ]
}
`,
});

const clusterRoutesFlow = ai.defineFlow(
  {
    name: 'clusterRoutesFlow',
    inputSchema: ClusterRoutesInputSchema,
    outputSchema: ClusterRoutesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Fallback if the model returns an empty or malformed response
    if (!output || !output.clusteredRoutes) {
      return { clusteredRoutes: [] };
    }
    
    return output;
  }
);
