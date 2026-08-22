-- Migration: Remove /settings/performance_period menu item from public.menu_items
DELETE FROM public.menu_items WHERE path = '/settings/performance_period';
