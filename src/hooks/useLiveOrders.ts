import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Order and Delivery types mirroring the schema definitions
export interface Order {
  id: string;
  customer_id: string;
  branch_id: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string; // Hydrated from profile selects
}

export interface Delivery {
  id: string;
  order_id: string;
  rider_id: string | null;
  status: 'assigned' | 'picked_up' | 'delivered' | 'failed';
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface UseLiveOrdersProps {
  role: 'customer' | 'owner' | 'rider';
  userId: string;       // Firebase UID
  branchId?: string;    // Mandatory for Owners, optional for Riders/Customers
}

export const useLiveOrders = ({ role, userId, branchId }: UseLiveOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial active orders
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (full_name)
        `);

      // Filter query based on user role
      if (role === 'customer') {
        // Customers only see their own active (non-finalized) orders
        query = query
          .eq('customer_id', userId)
          .not('status', 'in', '("delivered","cancelled")');
      } else if (role === 'owner') {
        if (!branchId) throw new Error('Branch ID is required for owner dashboard.');
        // Owners see all incoming/active orders for their specific branch
        query = query
          .eq('branch_id', branchId)
          .not('status', 'in', '("delivered","cancelled")');
      } else if (role === 'rider') {
        // Riders see orders that are either:
        // 1. Assigned to them directly and not delivered/failed
        // 2. Ready for pickup at their branch and not yet assigned to any rider
        if (!branchId) throw new Error('Branch ID is required for rider dashboards.');
        
        query = query
          .eq('branch_id', branchId)
          .or(`status.eq.ready_for_pickup,status.eq.out_for_delivery`);
      }

      const { data: ordersData, error: ordersError } = await query.order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Map profiles sub-query structure for easy access
      const formattedOrders = (ordersData || []).map((o: any) => ({
        ...o,
        customer_name: o.profiles?.full_name || 'Anonymous Customer',
      }));

      setOrders(formattedOrders);

      // If owner or rider, load the active deliveries associated with these orders
      if (formattedOrders.length > 0 && (role === 'owner' || role === 'rider')) {
        const orderIds = formattedOrders.map(o => o.id);
        const { data: deliveriesData, error: deliveriesError } = await supabase
          .from('deliveries')
          .select('*')
          .in('order_id', orderIds);

        if (deliveriesError) throw deliveriesError;

        const deliveryMap: Record<string, Delivery> = {};
        (deliveriesData || []).forEach((d: Delivery) => {
          deliveryMap[d.order_id] = d;
        });
        setDeliveries(deliveryMap);
      }
    } catch (err: any) {
      console.error('Error fetching initial orders:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role, userId, branchId]);

  useEffect(() => {
    fetchInitialData();

    // 1. SETUP ORDER REALTIME SUBSCRIPTION
    let orderFilter = '';
    if (role === 'customer') {
      orderFilter = `customer_id=eq.${userId}`;
    } else if (role === 'owner') {
      orderFilter = `branch_id=eq.${branchId}`;
    } else if (role === 'rider') {
      orderFilter = `branch_id=eq.${branchId}`;
    }

    const orderSubscription = supabase
      .channel('orders-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(orderFilter ? { filter: orderFilter } : {}),
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT') {
            // Fetch profile detail for the user context
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newRecord.customer_id)
              .single();

            const hydratedOrder: Order = {
              ...newRecord,
              customer_name: userData?.full_name || 'Anonymous Customer',
            } as Order;

            setOrders(prev => [hydratedOrder, ...prev]);
          } 
          
          else if (eventType === 'UPDATE') {
            const updatedOrder = newRecord as Order;
            
            // If the order has transitioned to delivered or cancelled, remove it from active list
            if (role !== 'customer' && (updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled')) {
              setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
              setDeliveries(prev => {
                const next = { ...prev };
                delete next[updatedOrder.id];
                return next;
              });
            } else {
              setOrders(prev =>
                prev.map(o => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
              );
            }
          } 
          
          else if (eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    // 2. SETUP DELIVERY REALTIME SUBSCRIPTION
    // Listen to delivery changes so riders see assignments and state updates
    let deliverySubscription: any = null;

    if (role === 'owner' || role === 'rider') {
      deliverySubscription = supabase
        .channel('deliveries-realtime-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deliveries',
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const delivery = newRecord as Delivery;
              
              // Only update deliveries state if it belongs to one of our loaded orders
              setOrders(currentOrders => {
                const orderExists = currentOrders.some(o => o.id === delivery.order_id);
                if (orderExists) {
                  setDeliveries(prev => ({
                    ...prev,
                    [delivery.order_id]: delivery,
                  }));
                }
                return currentOrders;
              });
            } 
            
            else if (eventType === 'DELETE') {
              setDeliveries(prev => {
                const next = { ...prev };
                if (oldRecord.order_id) {
                  delete next[oldRecord.order_id];
                }
                return next;
              });
            }
          }
        )
        .subscribe();
    }

    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(orderSubscription);
      if (deliverySubscription) {
        supabase.removeChannel(deliverySubscription);
      }
    };
  }, [role, userId, branchId, fetchInitialData]);

  // Expose action utilities for owners and riders to easily update state in-app
  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (error) throw error;
  };

  const assignRider = async (orderId: string, riderId: string) => {
    // 1. Check if delivery record exists, if not insert, else update
    const { data: existing } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('deliveries')
        .update({ rider_id: riderId, status: 'assigned' })
        .eq('order_id', orderId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('deliveries')
        .insert({ order_id: orderId, rider_id: riderId, status: 'assigned' });
      if (error) throw error;
    }

    // 2. Progress order status to accepted
    await updateOrderStatus(orderId, 'accepted');
  };

  const updateDeliveryStatus = async (orderId: string, status: Delivery['status'], failureReason?: string) => {
    const updateData: Partial<Delivery> = { status };
    
    if (status === 'picked_up') {
      updateData.picked_up_at = new Date().toISOString();
      await updateOrderStatus(orderId, 'out_for_delivery');
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
      await updateOrderStatus(orderId, 'delivered');
    } else if (status === 'failed') {
      updateData.failed_at = new Date().toISOString();
      updateData.failure_reason = failureReason || 'Unknown failure';
      // Mark order as cancelled or revert status
      await updateOrderStatus(orderId, 'cancelled');
    }

    const { error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('order_id', orderId);

    if (error) throw error;
  };

  return {
    orders,
    deliveries,
    loading,
    error,
    refresh: fetchInitialData,
    updateOrderStatus,
    assignRider,
    updateDeliveryStatus,
  };
};
